import type { ToolValueCatalogRow } from "../types/catalog";
import { NEGOTIATE_BAND } from "./constants";

export type Verdict = "bundle_skip" | "great_buy" | "good_buy" | "negotiate" | "pass";

/**
 * Verdict rules, applied in order, exactly as specified in handoff section 9.
 * Callers must check `canGiveVerdict` first so missing thresholds never
 * masquerade as Bundle/Skip.
 */
export function getVerdict(askingPrice: number, row: ToolValueCatalogRow): Verdict {
  const maxBuy = row.maximum_recommended_buy ?? 0;
  const greatBuy = row.great_buy_price ?? 0;

  if (maxBuy <= 0) return "bundle_skip";
  if (askingPrice <= greatBuy) return "great_buy";
  if (askingPrice <= maxBuy) return "good_buy";
  if (askingPrice <= maxBuy + NEGOTIATE_BAND) return "negotiate";
  return "pass";
}

export interface ProjectedOutcome {
  projectedCashProfit: number;
  riskAdjustedProfit: number;
}

/**
 * Projected outcomes (handoff section 9). target_profit is intentionally NOT
 * subtracted: it was already used to derive the buy ceilings.
 */
export function getProjectedOutcome(askingPrice: number, row: ToolValueCatalogRow): ProjectedOutcome {
  const expectedResale = row.expected_resale ?? 0;
  const fees = row.estimated_fees ?? 0;
  const shipping = row.estimated_shipping ?? 0;
  const riskBuffer = row.risk_buffer ?? 0;

  const projectedCashProfit = roundCents(expectedResale - askingPrice - fees - shipping);
  const riskAdjustedProfit = roundCents(projectedCashProfit - riskBuffer);
  return { projectedCashProfit, riskAdjustedProfit };
}

/** A verdict needs both buy thresholds and usable evidence. */
export function canGiveVerdict(row: ToolValueCatalogRow): boolean {
  return (
    row.maximum_recommended_buy !== null &&
    row.great_buy_price !== null &&
    !isInsufficientEvidence(row)
  );
}

export function isInsufficientEvidence(row: ToolValueCatalogRow): boolean {
  return row.confidence_label === "insufficient" || row.sold_sample_count <= 0;
}

/** Cash profit is only meaningful when every input is present. */
export function canProjectCashProfit(row: ToolValueCatalogRow): boolean {
  return row.expected_resale !== null && row.estimated_fees !== null && row.estimated_shipping !== null;
}

export function canProjectRiskAdjustedProfit(row: ToolValueCatalogRow): boolean {
  return canProjectCashProfit(row) && row.risk_buffer !== null;
}

export function isPositiveVerdict(verdict: Verdict): boolean {
  return verdict === "great_buy" || verdict === "good_buy";
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}
