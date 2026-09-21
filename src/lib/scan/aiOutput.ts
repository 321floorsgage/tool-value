import { z } from "zod";
import type { ScanCandidate, ScanObservations, ToolScanCatalogRow } from "../../types/scan";
import { MAX_PHOTOS } from "./limits";

const shortText = z.string().trim().max(160);
const textList = z.array(shortText).max(6);

/** Strict schema for what the vision model is allowed to return. */
export const aiOutputSchema = z.object({
  observations: z.object({
    brand: shortText.nullable(),
    visible_model_number: shortText.nullable(),
    tool_type: shortText.nullable(),
    voltage_or_platform: shortText.nullable(),
    kit_contents: textList,
    visible_markings: textList,
  }),
  candidates: z
    .array(
      z.object({
        model_id: z.number().int().positive(),
        confidence: z.number().min(0).max(1),
        evidence: textList,
        uncertainty: textList,
      }),
    )
    .max(12),
  needs_more_photos: z.boolean(),
  photo_guidance: textList,
});

export type AiOutput = z.infer<typeof aiOutputSchema>;

/** JSON schema handed to the model for structured output. */
export const AI_OUTPUT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["observations", "candidates", "needs_more_photos", "photo_guidance"],
  properties: {
    observations: {
      type: "object",
      additionalProperties: false,
      required: [
        "brand",
        "visible_model_number",
        "tool_type",
        "voltage_or_platform",
        "kit_contents",
        "visible_markings",
      ],
      properties: {
        brand: { type: ["string", "null"] },
        visible_model_number: { type: ["string", "null"] },
        tool_type: { type: ["string", "null"] },
        voltage_or_platform: { type: ["string", "null"] },
        kit_contents: { type: "array", items: { type: "string" } },
        visible_markings: { type: "array", items: { type: "string" } },
      },
    },
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["model_id", "confidence", "evidence", "uncertainty"],
        properties: {
          model_id: { type: "integer" },
          confidence: { type: "number" },
          evidence: { type: "array", items: { type: "string" } },
          uncertainty: { type: "array", items: { type: "string" } },
        },
      },
    },
    needs_more_photos: { type: "boolean" },
    photo_guidance: { type: "array", items: { type: "string" } },
  },
} as const;

export const MAX_RETURNED_CANDIDATES = 3;

export interface HydratedResult {
  observations: ScanObservations;
  candidates: ScanCandidate[];
  needs_more_photos: boolean;
  photo_guidance: string[];
  /** IDs the model returned that are not in the catalog, for logging. */
  discarded_model_ids: number[];
}

/**
 * Replaces model-supplied IDs with trusted catalog rows. Unknown IDs are
 * discarded, duplicates collapse, and candidates are sorted by confidence.
 * The model can never introduce a model number the catalog doesn't have.
 */
export function hydrateAiOutput(output: AiOutput, catalog: ToolScanCatalogRow[]): HydratedResult {
  const byId = new Map(catalog.map((row) => [row.model_id, row]));
  const seen = new Set<number>();
  const candidates: ScanCandidate[] = [];
  const discarded: number[] = [];

  for (const candidate of output.candidates) {
    const row = byId.get(candidate.model_id);
    if (!row) {
      discarded.push(candidate.model_id);
      continue;
    }
    if (seen.has(candidate.model_id)) continue;
    seen.add(candidate.model_id);
    candidates.push({
      model: row,
      confidence: clamp(candidate.confidence),
      evidence: candidate.evidence.filter(Boolean),
      uncertainty: candidate.uncertainty.filter(Boolean),
    });
  }

  candidates.sort((a, b) => b.confidence - a.confidence);

  return {
    observations: output.observations,
    candidates: candidates.slice(0, MAX_RETURNED_CANDIDATES),
    needs_more_photos: output.needs_more_photos || candidates.length === 0,
    photo_guidance: output.photo_guidance.filter(Boolean).slice(0, MAX_PHOTOS),
    discarded_model_ids: discarded,
  };
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
