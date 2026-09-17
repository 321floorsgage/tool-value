import { NEGOTIATE_BAND } from "../lib/constants";
import { formatMoney } from "../lib/format";

interface ThresholdScaleProps {
  greatBuy: number;
  maxBuy: number;
  asking: number | null;
}

/** Where the asking price lands against the database's buy thresholds. */
export function ThresholdScale({ greatBuy, maxBuy, asking }: ThresholdScaleProps) {
  const negotiateTop = maxBuy + NEGOTIATE_BAND;
  const domain = Math.max(negotiateTop + NEGOTIATE_BAND * 2, (asking ?? 0) * 1.08, 1);
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / domain) * 100))}%`;
  const hasGoodBand = maxBuy > greatBuy;

  const rungs = [
    { key: "great", label: "Great buy", range: greatBuy > 0 ? `${formatMoney(greatBuy)} or less` : "Only if free", swatch: "bg-great" },
    ...(hasGoodBand ? [{ key: "good", label: "Good buy", range: `${formatMoney(maxBuy)} or less`, swatch: "bg-good" }] : []),
    { key: "negotiate", label: "Negotiate", range: `${formatMoney(negotiateTop)} or less`, swatch: "bg-negotiate" },
    { key: "pass", label: "Pass", range: `Over ${formatMoney(negotiateTop)}`, swatch: "bg-pass" },
  ];

  const ariaLabel =
    asking === null
      ? `Price ladder: great buy up to ${formatMoney(greatBuy)}, good buy up to ${formatMoney(maxBuy)}, negotiate up to ${formatMoney(negotiateTop)}.`
      : `Asking price ${formatMoney(asking)} on a ladder where great buy ends at ${formatMoney(greatBuy)}, good buy at ${formatMoney(maxBuy)}, and negotiate at ${formatMoney(negotiateTop)}.`;

  return (
    <section aria-labelledby="ladder-heading" className="rounded-lg border border-line bg-surface p-4">
      <h2 id="ladder-heading" className="font-display text-lg font-semibold">
        Price ladder
      </h2>
      <div role="img" aria-label={ariaLabel} className="relative mt-3 pt-7">
        {asking !== null && (
          <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: pct(asking) }}>
            <span className="num block whitespace-nowrap rounded bg-ink px-1.5 text-xs font-semibold text-bg">
              {formatMoney(asking)}
            </span>
            <span aria-hidden="true" className="mx-auto block h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-ink" />
          </div>
        )}
        <div className="flex h-4 overflow-hidden rounded-sm">
          <div className="bg-great" style={{ width: pct(greatBuy) }} />
          <div className="bg-good" style={{ width: `calc(${pct(maxBuy)} - ${pct(greatBuy)})` }} />
          <div className="bg-negotiate" style={{ width: `calc(${pct(negotiateTop)} - ${pct(maxBuy)})` }} />
          <div className="flex-1 bg-pass" />
        </div>
        <div className="num relative mt-1 h-5 text-xs text-muted" aria-hidden="true">
          <span className="absolute left-0">$0</span>
          {maxBuy / domain > 0.1 && (
            <span className="absolute -translate-x-1/2" style={{ left: pct(maxBuy) }}>
              {formatMoney(maxBuy)}
            </span>
          )}
          {(negotiateTop - maxBuy) / domain > 0.1 && (
            <span className="absolute -translate-x-1/2" style={{ left: pct(negotiateTop) }}>
              {formatMoney(negotiateTop)}
            </span>
          )}
        </div>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.95rem]">
        {rungs.map((r) => (
          <div key={r.key} className="contents">
            <dt className="flex items-center gap-2">
              <span aria-hidden="true" className={`inline-block h-3 w-3 rounded-sm ${r.swatch}`} />
              {r.label}
            </dt>
            <dd className="num text-right font-medium">{r.range}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
