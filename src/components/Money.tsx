import { formatMoney, formatMoneyExact } from "../lib/format";

interface MoneyProps {
  value: number | null;
  exact?: boolean;
  signed?: boolean;
  className?: string;
}

/** Renders a dollar amount, or "Insufficient data" when the field is missing. */
export function Money({ value, exact = false, signed = false, className = "" }: MoneyProps) {
  if (value === null) {
    return <span className={`text-muted italic ${className}`}>Insufficient data</span>;
  }
  const tone = signed ? (value < 0 ? "text-loss" : "text-gain") : "";
  return (
    <span className={`num ${tone} ${className}`}>{exact ? formatMoneyExact(value) : formatMoney(value)}</span>
  );
}
