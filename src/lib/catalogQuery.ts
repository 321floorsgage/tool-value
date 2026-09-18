/** The only table and the only columns this app may read (handoff section 7). */
export const CATALOG_TABLE = "tool_value_catalog";

export const CATALOG_COLUMNS = `
    model_id,
    brand,
    model_number,
    tool_name,
    category,
    item_kind,
    sales_channel,
    condition_grade,
    value_low,
    expected_resale,
    value_high,
    fast_sale_price,
    maximum_recommended_buy,
    great_buy_price,
    estimated_fees,
    estimated_shipping,
    target_profit,
    risk_buffer,
    sold_sample_count,
    confidence_score,
    confidence_label,
    planning_note,
    image_url,
    image_alt,
    image_source_url,
    valuation_run_id,
    calculated_at,
    refreshed_at
  `;
