/** Contract for public.tool_value_catalog (read-only, managed by Codex). */
export type SalesChannel = "local" | "ebay";

export const SALES_CHANNELS: readonly SalesChannel[] = ["local", "ebay"] as const;

export type ConfidenceLabel = "insufficient" | "low" | "medium" | "high" | (string & {});

export interface ToolValueCatalogRow {
  model_id: number;
  brand: string;
  model_number: string;
  tool_name: string;
  category: string;
  item_kind: string;
  sales_channel: SalesChannel;
  condition_grade: string;
  value_low: number | null;
  expected_resale: number | null;
  value_high: number | null;
  fast_sale_price: number | null;
  maximum_recommended_buy: number | null;
  great_buy_price: number | null;
  estimated_fees: number | null;
  estimated_shipping: number | null;
  target_profit: number | null;
  risk_buffer: number | null;
  sold_sample_count: number;
  confidence_score: number | null;
  confidence_label: ConfidenceLabel;
  planning_note: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_source_url: string | null;
  valuation_run_id: number;
  calculated_at: string;
  refreshed_at: string;
}

/** Both channel rows for one model, grouped for search and selection. */
export interface ToolGroup {
  model_id: number;
  brand: string;
  model_number: string;
  tool_name: string;
  category: string;
  item_kind: string;
  /** Model-level, not channel-level: the same image for Local and eBay. */
  image_url: string | null;
  image_alt: string | null;
  image_source_url: string | null;
  rows: Partial<Record<SalesChannel, ToolValueCatalogRow>>;
}

export interface CatalogSourceInfo {
  kind: "live" | "snapshot";
  /** Human-readable description shown when the source is not live. */
  label: string;
}

export interface CatalogSource {
  info: CatalogSourceInfo;
  load: () => Promise<ToolValueCatalogRow[]>;
}
