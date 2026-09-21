import { z } from "zod";
import type { IdentifyToolResponse } from "../../types/scan";

const scanCatalogRowSchema = z.object({
  model_id: z.number(),
  brand: z.string(),
  model_number: z.string(),
  tool_name: z.string(),
  category: z.string(),
  item_kind: z.string(),
  battery_platform: z.string().nullable(),
  power_source: z.string().nullable(),
  generation: z.string().nullable(),
  bare_tool_or_kit: z.string().nullable(),
  image_url: z.string().nullable(),
  image_alt: z.string().nullable(),
  image_source_url: z.string().nullable(),
  aliases: z.array(z.string()),
  search_text: z.string(),
  updated_at: z.string(),
});

/** The browser validates the API response too, rather than trusting shapes. */
export const identifyToolResponseSchema = z.object({
  request_id: z.string(),
  match_status: z.union([z.literal("candidates"), z.literal("unsupported_or_uncertain")]),
  observations: z.object({
    brand: z.string().nullable(),
    visible_model_number: z.string().nullable(),
    tool_type: z.string().nullable(),
    voltage_or_platform: z.string().nullable(),
    kit_contents: z.array(z.string()),
    visible_markings: z.array(z.string()),
  }),
  candidates: z.array(
    z.object({
      model: scanCatalogRowSchema,
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      uncertainty: z.array(z.string()),
    }),
  ),
  needs_more_photos: z.boolean(),
  photo_guidance: z.array(z.string()),
});

export function parseIdentifyToolResponse(value: unknown): IdentifyToolResponse {
  return identifyToolResponseSchema.parse(value) as IdentifyToolResponse;
}
