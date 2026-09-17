import type { SalesChannel, ToolGroup, ToolValueCatalogRow } from "../types/catalog";

export class CatalogFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogFormatError";
  }
}

const NUMERIC_FIELDS = [
  "value_low",
  "expected_resale",
  "value_high",
  "fast_sale_price",
  "maximum_recommended_buy",
  "great_buy_price",
  "estimated_fees",
  "estimated_shipping",
  "target_profit",
  "risk_buffer",
  "confidence_score",
] as const;

function toNullableNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new CatalogFormatError(`Field ${field} is not a number.`);
  }
  return n;
}

/** Only https URLs are trusted; anything else is treated as missing. */
function toHttpsUrl(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isChannel(value: unknown): value is SalesChannel {
  return value === "local" || value === "ebay";
}

/**
 * Validates rows at the boundary. PostgREST may serialize numeric columns as
 * strings, so they are coerced. Rows with an unknown channel are dropped.
 */
export function parseCatalogRows(input: unknown): ToolValueCatalogRow[] {
  if (!Array.isArray(input)) throw new CatalogFormatError("Catalog response was not a list.");

  const rows: ToolValueCatalogRow[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) throw new CatalogFormatError("Catalog row was not an object.");
    const r = raw as Record<string, unknown>;
    if (!isChannel(r.sales_channel)) continue;
    if (typeof r.model_id !== "number" || typeof r.model_number !== "string" || typeof r.brand !== "string") {
      throw new CatalogFormatError("Catalog row is missing its model identity.");
    }

    const numeric = Object.fromEntries(
      NUMERIC_FIELDS.map((field) => [field, toNullableNumber(r[field], field)]),
    ) as Pick<ToolValueCatalogRow, (typeof NUMERIC_FIELDS)[number]>;

    rows.push({
      model_id: r.model_id,
      brand: r.brand,
      model_number: r.model_number,
      tool_name: String(r.tool_name ?? ""),
      category: String(r.category ?? ""),
      item_kind: String(r.item_kind ?? ""),
      sales_channel: r.sales_channel,
      condition_grade: String(r.condition_grade ?? ""),
      ...numeric,
      sold_sample_count: toNullableNumber(r.sold_sample_count, "sold_sample_count") ?? 0,
      confidence_label: String(r.confidence_label ?? "insufficient"),
      planning_note: typeof r.planning_note === "string" ? r.planning_note : null,
      image_url: toHttpsUrl(r.image_url),
      image_alt: toText(r.image_alt),
      image_source_url: toHttpsUrl(r.image_source_url),
      valuation_run_id: toNullableNumber(r.valuation_run_id, "valuation_run_id") ?? 0,
      calculated_at: String(r.calculated_at ?? ""),
      refreshed_at: String(r.refreshed_at ?? ""),
    });
  }
  return rows;
}

/** Groups the two channel rows for each model into one searchable tool. */
export function groupByModel(rows: ToolValueCatalogRow[]): ToolGroup[] {
  const byId = new Map<number, ToolGroup>();
  for (const row of rows) {
    let group = byId.get(row.model_id);
    if (!group) {
      group = {
        model_id: row.model_id,
        brand: row.brand,
        model_number: row.model_number,
        tool_name: row.tool_name,
        category: row.category,
        item_kind: row.item_kind,
        image_url: row.image_url,
        image_alt: row.image_alt,
        image_source_url: row.image_source_url,
        rows: {},
      };
      byId.set(row.model_id, group);
    }
    // Image metadata describes the model. If channel rows ever disagree, keep
    // the first non-null value rather than dropping the image.
    group.image_url ??= row.image_url;
    group.image_alt ??= row.image_alt;
    group.image_source_url ??= row.image_source_url;
    group.rows[row.sales_channel] = row;
  }
  return [...byId.values()].sort(
    (a, b) => a.brand.localeCompare(b.brand) || a.model_number.localeCompare(b.model_number),
  );
}

export function latestRefresh(rows: ToolValueCatalogRow[]): string | null {
  let latest: string | null = null;
  for (const row of rows) {
    if (row.refreshed_at && (latest === null || row.refreshed_at > latest)) latest = row.refreshed_at;
  }
  return latest;
}

/** "Milwaukee Tool" reads as "Milwaukee" in compact places. */
export function shortBrand(brand: string): string {
  return brand.replace(/\s+Tool$/i, "");
}

/** Text shown in the search box once a tool is chosen, e.g. "Milwaukee 2904-20". */
export function selectionLabel(group: Pick<ToolGroup, "brand" | "model_number">): string {
  return `${shortBrand(group.brand)} ${group.model_number}`;
}
