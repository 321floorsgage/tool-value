import { describe, expect, it } from "vitest";
import { CatalogFormatError, latestRefresh, parseCatalogRows, shortBrand } from "../lib/catalog";
import { milwaukee2904Local } from "./fixtures";

describe("parseCatalogRows", () => {
  it("passes valid rows through", () => {
    expect(parseCatalogRows([milwaukee2904Local])).toEqual([milwaukee2904Local]);
  });

  it("coerces numeric strings from PostgREST and keeps nulls", () => {
    const [row] = parseCatalogRows([
      { ...milwaukee2904Local, expected_resale: "89.99", estimated_fees: null, sold_sample_count: "12" },
    ]);
    expect(row.expected_resale).toBe(89.99);
    expect(row.estimated_fees).toBeNull();
    expect(row.sold_sample_count).toBe(12);
  });

  it("drops rows with an unknown channel", () => {
    expect(parseCatalogRows([{ ...milwaukee2904Local, sales_channel: "amazon" }])).toEqual([]);
  });

  it("rejects malformed responses instead of guessing", () => {
    expect(() => parseCatalogRows(null)).toThrow(CatalogFormatError);
    expect(() => parseCatalogRows([{ ...milwaukee2904Local, expected_resale: "lots" }])).toThrow(CatalogFormatError);
    expect(() => parseCatalogRows([{ sales_channel: "local" }])).toThrow(CatalogFormatError);
  });
});

describe("helpers", () => {
  it("finds the latest refresh", () => {
    expect(latestRefresh([])).toBeNull();
    expect(
      latestRefresh([
        { ...milwaukee2904Local, refreshed_at: "2026-09-10T00:00:00Z" },
        { ...milwaukee2904Local, refreshed_at: "2026-09-17T00:00:00Z" },
      ]),
    ).toBe("2026-09-17T00:00:00Z");
  });

  it("shortens brand names", () => {
    expect(shortBrand("Milwaukee Tool")).toBe("Milwaukee");
    expect(shortBrand("DEWALT")).toBe("DEWALT");
  });
});
