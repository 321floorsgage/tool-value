const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** $89.99, or $40 for whole-dollar amounts such as buy ceilings. */
export function formatMoney(value: number): string {
  const formatter = Number.isInteger(value) ? usdWhole : usd;
  const text = formatter.format(Math.abs(value));
  return value < 0 ? `−${text}` : text;
}

/** Always two decimals; used in the ledger so columns line up. */
export function formatMoneyExact(value: number): string {
  const text = usd.format(Math.abs(value));
  return value < 0 ? `−${text}` : text;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatConfidence(label: string): string {
  const known: Record<string, string> = {
    insufficient: "Insufficient",
    low: "Low",
    medium: "Medium",
    high: "High",
  };
  return known[label] ?? label.charAt(0).toUpperCase() + label.slice(1);
}
