import type { ToolValueCatalogRow } from "../types/catalog";

/**
 * Test fixtures built from the verified sample records in the handoff
 * (section 15, as of Sept 17, 2026). Used only by tests, never by the app.
 */
const base = {
  condition_grade: "good",
  target_profit: 40,
  valuation_run_id: 2,
  calculated_at: "2026-09-17T02:37:32.648184+00:00",
  refreshed_at: "2026-09-17T02:51:55.067444+00:00",
};

export function makeRow(overrides: Partial<ToolValueCatalogRow>): ToolValueCatalogRow {
  return {
    ...base,
    model_id: 999,
    brand: "Test",
    model_number: "T-1",
    tool_name: "Test Tool",
    category: "Drills",
    item_kind: "tool",
    sales_channel: "local",
    value_low: 50,
    expected_resale: 100,
    value_high: 120,
    fast_sale_price: 50,
    maximum_recommended_buy: 40,
    great_buy_price: 20,
    estimated_fees: 0,
    estimated_shipping: 0,
    risk_buffer: 7.5,
    sold_sample_count: 12,
    confidence_score: 4,
    confidence_label: "low",
    planning_note: null,
    ...overrides,
  };
}

export const milwaukee2904Local = makeRow({
  model_id: 2,
  brand: "Milwaukee Tool",
  model_number: "2904-20",
  tool_name: "M18 FUEL 1/2 in. Hammer Drill/Driver",
  category: "Drills",
  sales_channel: "local",
  value_low: 67.46,
  expected_resale: 89.99,
  value_high: 99.96,
  fast_sale_price: 67.46,
  maximum_recommended_buy: 40,
  great_buy_price: 20,
  estimated_fees: 0,
  estimated_shipping: 0,
  risk_buffer: 6.75,
  confidence_label: "low",
  planning_note: "Local estimate is an eBay item-price proxy until direct local sold data is collected.",
});

export const milwaukee2904Ebay = makeRow({
  ...milwaukee2904Local,
  sales_channel: "ebay",
  value_low: 69.97,
  expected_resale: 97.47,
  value_high: 106.79,
  fast_sale_price: 69.97,
  maximum_recommended_buy: 20,
  great_buy_price: 0,
  estimated_fees: 13.66,
  estimated_shipping: 12,
  risk_buffer: 7.31,
  confidence_score: 7,
  confidence_label: "medium",
  planning_note: "Base eBay fee estimate excludes promoted listings and account-specific fee variations.",
});

export const dewaltDcn680Ebay = makeRow({
  model_id: 19,
  brand: "DEWALT",
  model_number: "DCN680B",
  tool_name: "20V MAX XR 18 Gauge Brad Nailer",
  category: "Nailers",
  sales_channel: "ebay",
  value_low: 132.67,
  expected_resale: 168.7,
  value_high: 201.75,
  fast_sale_price: 132.67,
  maximum_recommended_buy: 70,
  great_buy_price: 40,
  estimated_fees: 23.34,
  estimated_shipping: 20,
  risk_buffer: 12.65,
  confidence_score: 7,
  confidence_label: "medium",
});

export const dewaltDcn680Local = makeRow({
  ...dewaltDcn680Ebay,
  sales_channel: "local",
  value_low: 112.12,
  expected_resale: 150,
  fast_sale_price: 112.12,
  maximum_recommended_buy: 95,
  great_buy_price: 60,
  estimated_fees: 0,
  estimated_shipping: 0,
  risk_buffer: 11.25,
  confidence_score: 4,
  confidence_label: "low",
});

export const milwaukeeBatteryLocal = makeRow({
  model_id: 22,
  brand: "Milwaukee Tool",
  model_number: "48-11-1850",
  tool_name: "M18 REDLITHIUM XC5.0 Extended Capacity Battery Pack",
  category: "Batteries",
  item_kind: "battery",
  sales_channel: "local",
  value_low: 30,
  expected_resale: 30,
  value_high: 38.49,
  fast_sale_price: 30,
  maximum_recommended_buy: 0,
  great_buy_price: 0,
  risk_buffer: 5,
  planning_note: "Bundle candidate: not viable alone at the $40 profit target.",
});

export const milwaukeeBatteryEbay = makeRow({
  ...milwaukeeBatteryLocal,
  sales_channel: "ebay",
  expected_resale: 36.49,
  value_high: 43.26,
  estimated_fees: 5.36,
  estimated_shipping: 8,
  confidence_label: "medium",
});

export const sampleRows = [
  milwaukee2904Ebay,
  milwaukee2904Local,
  dewaltDcn680Ebay,
  dewaltDcn680Local,
  milwaukeeBatteryEbay,
  milwaukeeBatteryLocal,
];
