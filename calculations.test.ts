import { describe, expect, it } from "vitest";
import {
  canGiveVerdict,
  canProjectCashProfit,
  canProjectRiskAdjustedProfit,
  getProjectedOutcome,
  getVerdict,
} from "../lib/calculations";
import {
  dewaltDcn680Ebay,
  makeRow,
  milwaukee2904Local,
  milwaukeeBatteryEbay,
  milwaukeeBatteryLocal,
} from "./fixtures";

describe("getVerdict: handoff sample examples", () => {
  it.each([
    [20, "great_buy"],
    [35, "good_buy"],
    [50, "negotiate"],
    [60, "pass"],
  ] as const)("Milwaukee 2904-20 Local at $%s is %s", (asking, expected) => {
    expect(getVerdict(asking, milwaukee2904Local)).toBe(expected);
  });

  it.each([
    [40, "great_buy"],
    [65, "good_buy"],
    [80, "negotiate"],
    [100, "pass"],
  ] as const)("DEWALT DCN680B eBay at $%s is %s", (asking, expected) => {
    expect(getVerdict(asking, dewaltDcn680Ebay)).toBe(expected);
  });

  it.each([0, 0.01, 1, 5, 20, 500])("Milwaukee 48-11-1850 at $%s is bundle_skip on both channels", (asking) => {
    expect(getVerdict(asking, milwaukeeBatteryLocal)).toBe("bundle_skip");
    expect(getVerdict(asking, milwaukeeBatteryEbay)).toBe("bundle_skip");
  });
});

describe("getVerdict: exact boundaries (max 40, great 20)", () => {
  const row = makeRow({ maximum_recommended_buy: 40, great_buy_price: 20 });
  it.each([
    [0, "great_buy"],
    [19.99, "great_buy"],
    [20, "great_buy"],
    [20.01, "good_buy"],
    [40, "good_buy"],
    [40.01, "negotiate"],
    [55, "negotiate"],
    [55.01, "pass"],
    [10_000, "pass"],
  ] as const)("$%s -> %s", (asking, expected) => {
    expect(getVerdict(asking, row)).toBe(expected);
  });

  it("a $0 max buy is Bundle/Skip even when the asking price is $0", () => {
    expect(getVerdict(0, makeRow({ maximum_recommended_buy: 0, great_buy_price: 0 }))).toBe("bundle_skip");
  });

  it("a negative max buy is Bundle/Skip", () => {
    expect(getVerdict(0, makeRow({ maximum_recommended_buy: -5, great_buy_price: 0 }))).toBe("bundle_skip");
  });

  it("great buy equal to max buy skips the good band", () => {
    const equal = makeRow({ maximum_recommended_buy: 30, great_buy_price: 30 });
    expect(getVerdict(30, equal)).toBe("great_buy");
    expect(getVerdict(30.01, equal)).toBe("negotiate");
  });

  it("a $0 great-buy price only rates a free tool as great", () => {
    const row0 = makeRow({ maximum_recommended_buy: 20, great_buy_price: 0 });
    expect(getVerdict(0, row0)).toBe("great_buy");
    expect(getVerdict(1, row0)).toBe("good_buy");
  });
});

describe("getProjectedOutcome", () => {
  it("matches the formula for 2904-20 Local at $35", () => {
    // 89.99 - 35 - 0 - 0 = 54.99; 54.99 - 6.75 = 48.24
    expect(getProjectedOutcome(35, milwaukee2904Local)).toEqual({
      projectedCashProfit: 54.99,
      riskAdjustedProfit: 48.24,
    });
  });

  it("matches the formula for DCN680B eBay at $65", () => {
    // 168.70 - 65 - 23.34 - 20 = 60.36; 60.36 - 12.65 = 47.71
    expect(getProjectedOutcome(65, dewaltDcn680Ebay)).toEqual({
      projectedCashProfit: 60.36,
      riskAdjustedProfit: 47.71,
    });
  });

  it("does not subtract target_profit", () => {
    const withTarget = makeRow({ target_profit: 40 });
    const withoutTarget = makeRow({ target_profit: 999 });
    expect(getProjectedOutcome(10, withTarget)).toEqual(getProjectedOutcome(10, withoutTarget));
  });

  it("goes negative when the price is too high", () => {
    expect(getProjectedOutcome(100, dewaltDcn680Ebay)).toEqual({
      projectedCashProfit: 25.36,
      riskAdjustedProfit: 12.71,
    });
    expect(getProjectedOutcome(200, dewaltDcn680Ebay).projectedCashProfit).toBe(-74.64);
  });

  it("treats null inputs as 0 per the spec formula", () => {
    const row = makeRow({ expected_resale: 100, estimated_fees: null, estimated_shipping: null, risk_buffer: null });
    expect(getProjectedOutcome(10, row)).toEqual({ projectedCashProfit: 90, riskAdjustedProfit: 90 });
  });

  it("avoids floating point noise", () => {
    const row = makeRow({ expected_resale: 0.3, estimated_fees: 0.1, estimated_shipping: 0.1, risk_buffer: 0.1 });
    expect(getProjectedOutcome(0, row)).toEqual({ projectedCashProfit: 0.1, riskAdjustedProfit: 0 });
  });
});

describe("insufficient-data guards", () => {
  it("withholds a verdict when a buy threshold is missing", () => {
    expect(canGiveVerdict(makeRow({ maximum_recommended_buy: null }))).toBe(false);
    expect(canGiveVerdict(makeRow({ great_buy_price: null }))).toBe(false);
    expect(canGiveVerdict(milwaukee2904Local)).toBe(true);
  });

  it("withholds a verdict when evidence is insufficient", () => {
    expect(canGiveVerdict(makeRow({ confidence_label: "insufficient" }))).toBe(false);
    expect(canGiveVerdict(makeRow({ sold_sample_count: 0 }))).toBe(false);
  });

  it("withholds profit figures when inputs are missing", () => {
    expect(canProjectCashProfit(makeRow({ expected_resale: null }))).toBe(false);
    expect(canProjectCashProfit(makeRow({ estimated_fees: null }))).toBe(false);
    expect(canProjectCashProfit(makeRow({ estimated_shipping: null }))).toBe(false);
    expect(canProjectRiskAdjustedProfit(makeRow({ risk_buffer: null }))).toBe(false);
    expect(canProjectRiskAdjustedProfit(milwaukee2904Local)).toBe(true);
  });
});
