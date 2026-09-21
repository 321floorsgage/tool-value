import type { Config, Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import type { IdentifyToolResponse, ToolScanCatalogRow } from "../../src/types/scan";
import { AI_OUTPUT_JSON_SCHEMA, aiOutputSchema, hydrateAiOutput } from "../../src/lib/scan/aiOutput";
import { buildUserPrompt, compactCatalog, SYSTEM_PROMPT } from "../../src/lib/scan/prompt";
import { parseScanCatalogRows } from "../../src/lib/scan/catalog";
import { validateIdentifyRequest } from "../../src/lib/scan/request";
import { CONFIDENCE_CHOICE } from "../../src/lib/scan/limits";
import { SCAN_CATALOG_COLUMNS, SCAN_CATALOG_TABLE } from "../../src/lib/scanCatalogQuery";

const DEFAULT_MODEL = "gpt-4o-mini";
const AI_TIMEOUT_MS = 45_000;
const JSON_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

declare const Netlify: {
  env: { get(name: string): string | undefined };
};

export default async (req: Request, context: Context): Promise<Response> => {
  const requestId = context.requestId ?? crypto.randomUUID();
  const startedAt = Date.now();

  if (req.method !== "POST") {
    return problem(405, "method_not_allowed", "Use POST to identify a tool.", requestId, false, {
      Allow: "POST",
    });
  }
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return problem(415, "unsupported_media_type", "Send JSON.", requestId, false);
  }

  const body: unknown = await req.json().catch(() => undefined);
  const validation = validateIdentifyRequest(body);
  if (!validation.ok) {
    // Logged without any image data.
    console.log(JSON.stringify({ requestId, event: "scan_rejected", reason: validation.error }));
    return problem(statusForRequestError(validation.error), validation.error, validation.message, requestId, false);
  }

  const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL") ?? Netlify.env.get("SUPABASE_URL");
  const supabaseKey =
    Netlify.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Netlify.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    console.error(JSON.stringify({ requestId, event: "scan_misconfigured", reason: "supabase_env_missing" }));
    return problem(500, "not_configured", "The scanner isn't configured yet.", requestId, false);
  }

  let catalog: ToolScanCatalogRow[];
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase
      .from(SCAN_CATALOG_TABLE)
      .select(SCAN_CATALOG_COLUMNS)
      .order("brand")
      .order("model_number");
    if (error) throw new Error(error.message);
    catalog = parseScanCatalogRows(data);
  } catch (err) {
    console.error(JSON.stringify({ requestId, event: "scan_catalog_failed", message: describe(err) }));
    return problem(503, "catalog_unavailable", "The supported-tool list is unavailable. Try again.", requestId, true);
  }
  if (catalog.length === 0) {
    return problem(503, "catalog_empty", "No supported tools are available to match against.", requestId, true);
  }

  const model = Netlify.env.get("AI_VISION_MODEL")?.trim() || DEFAULT_MODEL;
  const openAiApiKey = Netlify.env.get("OPENAI_API_KEY");
  const openAiBaseUrl = Netlify.env.get("OPENAI_BASE_URL");
  if (!openAiApiKey || !openAiBaseUrl) {
    console.error(JSON.stringify({ requestId, event: "scan_misconfigured", reason: "ai_gateway_env_missing" }));
    return problem(500, "not_configured", "The scanner isn't configured yet.", requestId, false);
  }
  let aiJson: unknown;
  try {
    // Netlify AI Gateway injects OPENAI_API_KEY and OPENAI_BASE_URL at runtime.
    const openai = new OpenAI({
      apiKey: openAiApiKey,
      baseURL: openAiBaseUrl,
      timeout: AI_TIMEOUT_MS,
      maxRetries: 1,
    });
    const completion = await openai.chat.completions.create(
      {
        model,
        max_completion_tokens: 900,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: buildUserPrompt(compactCatalog(catalog), validation.value.hint) },
              ...validation.value.images.map((image) => ({
                type: "image_url" as const,
                image_url: { url: image, detail: "high" as const },
              })),
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "tool_identification", strict: false, schema: AI_OUTPUT_JSON_SCHEMA },
        },
      },
      { signal: AbortSignal.timeout(AI_TIMEOUT_MS) },
    );
    const text = completion.choices[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("empty_completion");
    aiJson = JSON.parse(text);
  } catch (err) {
    const status = isTimeout(err) ? 504 : 502;
    // Never log prompt or image content, only the failure class.
    console.error(JSON.stringify({ requestId, event: "scan_provider_failed", model, status, message: describe(err) }));
    return problem(status, "provider_unavailable", "The scanner is busy. Try again in a moment.", requestId, true);
  }

  const parsed = aiOutputSchema.safeParse(aiJson);
  if (!parsed.success) {
    console.error(JSON.stringify({ requestId, event: "scan_schema_invalid", model }));
    return problem(502, "invalid_model_output", "The scan returned an unusable result. Try again.", requestId, true);
  }

  const hydrated = hydrateAiOutput(parsed.data, catalog);
  const usable = hydrated.candidates.filter((candidate) => candidate.confidence >= CONFIDENCE_CHOICE);

  const payload: IdentifyToolResponse = {
    request_id: requestId,
    match_status: usable.length > 0 ? "candidates" : "unsupported_or_uncertain",
    observations: hydrated.observations,
    candidates: hydrated.candidates,
    needs_more_photos: usable.length === 0 ? true : hydrated.needs_more_photos,
    photo_guidance: hydrated.photo_guidance,
  };

  console.log(
    JSON.stringify({
      requestId,
      event: "scan_complete",
      model,
      photos: validation.value.images.length,
      ms: Date.now() - startedAt,
      status: payload.match_status,
      candidate_model_ids: payload.candidates.map((candidate) => candidate.model.model_id),
      discarded_model_ids: hydrated.discarded_model_ids,
    }),
  );

  return new Response(JSON.stringify(payload), { status: 200, headers: JSON_HEADERS });
};

/** Size problems are 413; everything else the client sent wrong is 400. */
function statusForRequestError(code: string): number {
  return code === "request_too_large" || code === "image_too_large" ? 413 : 400;
}

function problem(
  status: number,
  error: string,
  message: string,
  requestId: string,
  retryable: boolean,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ error, message, request_id: requestId, retryable }), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function describe(err: unknown): string {
  return err instanceof Error ? err.name : "unknown_error";
}

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "APIConnectionTimeoutError");
}

export const config: Config = {
  path: "/api/identify-tool",
  method: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
  rateLimit: {
    action: "rate_limit",
    aggregateBy: "ip",
    windowLimit: 10,
    windowSize: 60,
  },
};
