import type { IdentifyToolResponse } from "../../types/scan";
import { validateIdentifyRequest } from "./request";
import { parseIdentifyToolResponse } from "./response";

export const IDENTIFY_TOOL_PATH = "/api/identify-tool";

export class ScanRequestError extends Error {
  retryable: boolean;
  requestId?: string;
  constructor(message: string, options: { retryable: boolean; requestId?: string }) {
    super(message);
    this.name = "ScanRequestError";
    this.retryable = options.retryable;
    this.requestId = options.requestId;
  }
}

interface IdentifyOptions {
  images: string[];
  hint?: string;
  signal?: AbortSignal;
}

/** Posts photos to the Netlify Function and validates what comes back. */
export async function identifyTool({ images, hint, signal }: IdentifyOptions): Promise<IdentifyToolResponse> {
  const validation = validateIdentifyRequest({ images, hint });
  if (!validation.ok) throw new ScanRequestError(validation.message, { retryable: false });

  let response: Response;
  try {
    response = await fetch(IDENTIFY_TOOL_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(validation.value),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ScanRequestError("No connection. Check your signal and try again.", { retryable: true });
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const problem = body as { message?: string; error?: string; retryable?: boolean; request_id?: string } | null;
    throw new ScanRequestError(problem?.message ?? "The scan failed. Try again.", {
      retryable: problem?.retryable ?? response.status >= 500,
      requestId: problem?.request_id,
    });
  }

  try {
    return parseIdentifyToolResponse(body);
  } catch {
    throw new ScanRequestError("The scan returned something unexpected. Try again.", { retryable: true });
  }
}
