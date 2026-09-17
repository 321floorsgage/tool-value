import { MAX_ASKING_PRICE } from "./constants";

export type PriceParseResult =
  | { status: "empty" }
  | { status: "valid"; value: number }
  | { status: "invalid"; message: string };

const MONEY_PATTERN = /^\d+(\.\d{0,2})?$|^\.\d{1,2}$/;

/** Parses the asking-price field. Accepts "35", "$35", "35.5", "1,200.00". */
export function parseAskingPrice(raw: string): PriceParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { status: "empty" };

  const cleaned = trimmed.replace(/^\$/, "").replace(/,/g, "").trim();
  if (cleaned.startsWith("-")) {
    return { status: "invalid", message: "Enter a price of $0 or more." };
  }
  if (!MONEY_PATTERN.test(cleaned)) {
    return { status: "invalid", message: "Enter a dollar amount like 35 or 35.50." };
  }

  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    return { status: "invalid", message: "Enter a dollar amount like 35 or 35.50." };
  }
  if (value > MAX_ASKING_PRICE) {
    return { status: "invalid", message: "That's more than this calculator handles. Enter $100,000 or less." };
  }
  return { status: "valid", value };
}

/** Keeps only characters that can form a price while typing. */
export function sanitizePriceKeystrokes(raw: string): string {
  return raw.replace(/[^\d.,$-]/g, "").slice(0, 12);
}
