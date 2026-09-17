/** Locked business decisions (handoff section 3). Do not change without approval. */
export const LOCKED_TARGET_PROFIT = 40;
export const SELLING_WINDOW = "14–28 days";
/** Negotiate band above the maximum recommended buy (handoff section 9). */
export const NEGOTIATE_BAND = 15;
/** Upper bound for an asking price the calculator accepts. */
export const MAX_ASKING_PRICE = 100_000;

export const CHANNEL_LABEL = { local: "Local", ebay: "eBay" } as const;

export const UNSUPPORTED_MESSAGE = "We don't have enough verified data for this model yet.";

export const DISCLAIMER =
  "Estimates are planning tools, not guaranteed sale prices. Verify the exact model, condition, operation, included accessories, local demand, and current marketplace fees before buying.";
