import { describe, expect, it } from "vitest";
import { parseAskingPrice, sanitizePriceKeystrokes } from "../lib/price";

describe("parseAskingPrice", () => {
  it.each([
    ["35", 35],
    ["35.5", 35.5],
    ["35.50", 35.5],
    ["$35", 35],
    ["1,200", 1200],
    ["0", 0],
    [".5", 0.5],
    ["  40  ", 40],
    ["100000", 100000],
  ])("accepts %j", (raw, value) => {
    expect(parseAskingPrice(raw)).toEqual({ status: "valid", value });
  });

  it.each(["", "   "])("treats %j as empty", (raw) => {
    expect(parseAskingPrice(raw)).toEqual({ status: "empty" });
  });

  it.each(["-5", "-0.01", "$-5"])("rejects negative %j", (raw) => {
    expect(parseAskingPrice(raw)).toMatchObject({ status: "invalid", message: expect.stringMatching(/\$0 or more/) });
  });

  it.each(["abc", "NaN", "Infinity", "1e3", "35.555", "3.5.5", "$", ".", "12a"])("rejects malformed %j", (raw) => {
    expect(parseAskingPrice(raw).status).toBe("invalid");
  });

  it("rejects unreasonable amounts", () => {
    expect(parseAskingPrice("100000.01")).toMatchObject({ status: "invalid" });
    expect(parseAskingPrice("99999999999")).toMatchObject({ status: "invalid" });
  });
});

describe("sanitizePriceKeystrokes", () => {
  it("strips letters and limits length", () => {
    expect(sanitizePriceKeystrokes("$4a0.5x")).toBe("$40.5");
    expect(sanitizePriceKeystrokes("1".repeat(30))).toHaveLength(12);
  });
});
