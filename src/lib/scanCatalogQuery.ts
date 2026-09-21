/** The only scan table and columns this app may read. */
export const SCAN_CATALOG_TABLE = "tool_scan_catalog";

export const SCAN_CATALOG_COLUMNS = [
  "model_id",
  "brand",
  "model_number",
  "tool_name",
  "category",
  "item_kind",
  "battery_platform",
  "power_source",
  "generation",
  "bare_tool_or_kit",
  "image_url",
  "image_alt",
  "image_source_url",
  "aliases",
  "search_text",
  "updated_at",
].join(",");
