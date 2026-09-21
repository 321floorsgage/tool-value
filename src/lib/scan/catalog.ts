import type { ToolScanCatalogRow } from "../../types/scan";

export class ScanCatalogFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScanCatalogFormatError";
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function httpsUrl(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}

/** Validates scan-catalog rows at the boundary; identity strings stay exact. */
export function parseScanCatalogRows(input: unknown): ToolScanCatalogRow[] {
  if (!Array.isArray(input)) throw new ScanCatalogFormatError("Scan catalog response was not a list.");

  return input.map((raw) => {
    if (typeof raw !== "object" || raw === null) {
      throw new ScanCatalogFormatError("Scan catalog row was not an object.");
    }
    const r = raw as Record<string, unknown>;
    const modelId = typeof r.model_id === "string" ? Number(r.model_id) : r.model_id;
    if (typeof modelId !== "number" || !Number.isFinite(modelId)) {
      throw new ScanCatalogFormatError("Scan catalog row is missing model_id.");
    }
    if (typeof r.model_number !== "string" || !r.model_number) {
      throw new ScanCatalogFormatError("Scan catalog row is missing model_number.");
    }

    return {
      model_id: modelId,
      brand: text(r.brand),
      model_number: r.model_number,
      tool_name: text(r.tool_name),
      category: text(r.category),
      item_kind: text(r.item_kind),
      battery_platform: nullableText(r.battery_platform),
      power_source: nullableText(r.power_source),
      generation: nullableText(r.generation),
      bare_tool_or_kit: nullableText(r.bare_tool_or_kit),
      image_url: httpsUrl(r.image_url),
      image_alt: nullableText(r.image_alt),
      image_source_url: httpsUrl(r.image_source_url),
      aliases: Array.isArray(r.aliases) ? r.aliases.filter((a): a is string => typeof a === "string") : [],
      search_text: text(r.search_text),
      updated_at: text(r.updated_at),
    };
  });
}

/** Wording, not fake precision. */
export function confidenceLabel(confidence: number): "High" | "Possible" | "Low" {
  if (confidence >= 0.85) return "High";
  if (confidence >= 0.6) return "Possible";
  return "Low";
}

export function confidencePercent(confidence: number): number {
  return Math.round(confidence * 100);
}
