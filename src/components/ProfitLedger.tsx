import type { SalesChannel, ToolValueCatalogRow } from "../types/catalog";
import {
  canProjectCashProfit,
  canProjectRiskAdjustedProfit,
  getProjectedOutcome,
} from "../lib/calculations";
import { CHANNEL_LABEL, LOCKED_TARGET_PROFIT } from "../lib/constants";
import { formatMoney } from "../lib/format";
import { Money } from "./Money";

interface ProfitLedgerProps {
  row: ToolValueCatalogRow;
  channel: SalesChannel;
  asking: number | null;
}

/** Receipt-style breakdown of how the projected profit is reached. */
export function ProfitLedger({ row, channel, asking }: ProfitLedgerProps) {
  const outcome = asking !== null ? getProjectedOutcome(asking, row) : null;
  const target = row.target_profit ?? LOCKED_TARGET_PROFIT;

  return (
    <section aria-labelledby="ledger-heading" className="rounded-lg border border-line bg-surface p-4">
      <h2 id="ledger-heading" className="font-display text-xl font-bold">
        How the profit adds up
      </h2>
      <p className="text-sm text-muted">{CHANNEL_LABEL[channel]} resale, ordinary used condition</p>

      <table className="mt-3 w-full border-collapse text-[1.02rem]">
        <caption className="sr-only">Projected profit breakdown for {CHANNEL_LABEL[channel]}</caption>
        <tbody>
          <LedgerRow label="Expected resale" value={row.expected_resale} sign="+" />
          <tr className="border-t border-line">
            <th scope="row" className="py-1.5 text-left font-normal">Your purchase</th>
            <td className="py-1.5 text-right">
              {asking === null ? (
                <span className="text-muted">Enter a price</span>
              ) : (
                <Money value={-asking} exact />
              )}
            </td>
          </tr>
          <LedgerRow label="Fees" value={row.estimated_fees} sign="-" />
          <LedgerRow label="Shipping allowance" value={row.estimated_shipping} sign="-" />
          <tr className="border-t-2 border-ink" data-testid="cash-profit-row">
            <th scope="row" className="py-2 text-left font-display text-lg font-bold">Projected cash profit</th>
            <td className="py-2 text-right font-display text-xl font-bold">
              {outcome === null ? (
                <span className="text-muted">—</span>
              ) : canProjectCashProfit(row) ? (
                <Money value={outcome.projectedCashProfit} exact signed />
              ) : (
                <Money value={null} />
              )}
            </td>
          </tr>
          <LedgerRow label="Risk buffer" value={row.risk_buffer} sign="-" />
          <tr className="border-t-4 border-double border-ink" data-testid="risk-profit-row">
            <th scope="row" className="py-2 text-left font-display text-lg font-bold">Risk-adjusted profit</th>
            <td className="py-2 text-right font-display text-xl font-bold">
              {outcome === null ? (
                <span className="text-muted">—</span>
              ) : canProjectRiskAdjustedProfit(row) ? (
                <Money value={outcome.riskAdjustedProfit} exact signed />
              ) : (
                <Money value={null} />
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-sm text-muted">
        The risk buffer is a cushion for surprises such as a return or a part you have to replace. Your{" "}
        {formatMoney(target)} target is already built into the buy prices, so it isn't subtracted again here.
      </p>
    </section>
  );
}

function LedgerRow({ label, value, sign }: { label: string; value: number | null; sign: "+" | "-" }) {
  return (
    <tr className="border-t border-line">
      <th scope="row" className="py-1.5 text-left font-normal">{label}</th>
      <td className="py-1.5 text-right">
        <Money value={value === null ? null : sign === "-" ? -value : value} exact />
      </td>
    </tr>
  );
}
