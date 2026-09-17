import type { ReactNode } from "react";
import type { SalesChannel, ToolGroup, ToolValueCatalogRow } from "../types/catalog";
import { SALES_CHANNELS } from "../types/catalog";
import {
  canGiveVerdict,
  canProjectCashProfit,
  getProjectedOutcome,
  getVerdict,
  isInsufficientEvidence,
} from "../lib/calculations";
import { CHANNEL_LABEL, LOCKED_TARGET_PROFIT, SELLING_WINDOW } from "../lib/constants";
import { formatMoney, formatMoneyExact } from "../lib/format";
import { shortBrand } from "../lib/catalog";
import { VERDICT_TITLE } from "../lib/verdictCopy";
import { Money } from "./Money";
import { ProductImage } from "./ProductImage";

interface ToolDetailsProps {
  group: ToolGroup;
  channel: SalesChannel;
  asking: number | null;
  onChannelChange: (channel: SalesChannel) => void;
}

export function ToolIdentity({ group }: { group: ToolGroup }) {
  const row = group.rows.local ?? group.rows.ebay;
  const target = row?.target_profit ?? LOCKED_TARGET_PROFIT;
  return (
    <section aria-labelledby="tool-heading" className="border-b border-line pb-4">
      <div className="grid items-center gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <ProductImage
          src={group.image_url}
          alt={group.image_alt}
          sourceUrl={group.image_source_url}
          brand={group.brand}
          modelNumber={group.model_number}
        />
        <div>
          <p className="text-muted">
            {shortBrand(group.brand)}, {group.category}
          </p>
          <h2 id="tool-heading" className="font-display text-[2.25rem] font-extrabold leading-none tracking-tight">
            {group.model_number}
          </h2>
          <p className="mt-1 text-lg leading-snug">{group.tool_name}</p>
          <p className="mt-2 text-sm text-muted">
            Priced for ordinary used condition, a {formatMoney(target)} profit target, and a sale within{" "}
            {SELLING_WINDOW}.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ResaleRange({ row, channel }: { row: ToolValueCatalogRow; channel: SalesChannel }) {
  const { value_low: low, expected_resale: typical, value_high: high } = row;
  const canPlot = low !== null && typical !== null && high !== null && high > low;
  const pos = canPlot ? ((typical - low) / (high - low)) * 100 : 50;

  return (
    <section aria-labelledby="resale-heading" className="rounded-lg border border-line bg-surface p-4">
      <h2 id="resale-heading" className="font-display text-xl font-bold">
        What it sells for, {CHANNEL_LABEL[channel]}
      </h2>
      <dl className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-sm text-muted">Expected resale</dt>
          <dd data-testid="expected-resale" className="font-display text-3xl font-bold leading-tight">
            <Money value={typical} exact />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Fast-sale price</dt>
          <dd data-testid="fast-sale" className="font-display text-3xl font-bold leading-tight">
            <Money value={row.fast_sale_price} exact />
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        {canPlot && (
          <div aria-hidden="true" className="relative h-2 rounded-full bg-sunk ring-1 ring-line">
            <span className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-ink" style={{ left: `${pos}%` }} />
          </div>
        )}
        <dl className="num mt-2 grid grid-cols-3 text-sm">
          <div>
            <dt className="text-muted">Low</dt>
            <dd className="font-medium"><Money value={low} exact /></dd>
          </div>
          <div className="text-center">
            <dt className="text-muted">Typical</dt>
            <dd className="font-medium"><Money value={typical} exact /></dd>
          </div>
          <div className="text-right">
            <dt className="text-muted">High</dt>
            <dd className="font-medium"><Money value={high} exact /></dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function costsOf(row: ToolValueCatalogRow): number | null {
  if (row.estimated_fees === null || row.estimated_shipping === null) return null;
  return Math.round((row.estimated_fees + row.estimated_shipping) * 100) / 100;
}

export function ChannelComparison({ group, channel, asking, onChannelChange }: ToolDetailsProps) {
  const { local, ebay } = group.rows;

  const cell = (row: ToolValueCatalogRow | undefined, render: (r: ToolValueCatalogRow) => ReactNode) =>
    row && !isInsufficientEvidence(row) ? render(row) : <span className="text-muted">No data</span>;

  const rows: { label: string; render: (r: ToolValueCatalogRow) => ReactNode }[] = [
    { label: "Expected resale", render: (r) => <Money value={r.expected_resale} exact /> },
    { label: "Fees + shipping", render: (r) => <Money value={costsOf(r)} exact /> },
    { label: "Risk buffer", render: (r) => <Money value={r.risk_buffer} exact /> },
    { label: "Max recommended buy", render: (r) => <strong><Money value={r.maximum_recommended_buy} /></strong> },
    { label: "Great-buy price", render: (r) => <Money value={r.great_buy_price} /> },
  ];
  if (asking !== null) {
    rows.push(
      {
        label: `Cash profit at ${formatMoney(asking)}`,
        render: (r) =>
          canProjectCashProfit(r) ? <Money value={getProjectedOutcome(asking, r).projectedCashProfit} exact signed /> : <Money value={null} />,
      },
      {
        label: `Verdict at ${formatMoney(asking)}`,
        render: (r) => (canGiveVerdict(r) ? VERDICT_TITLE[getVerdict(asking, r)] : "Insufficient data"),
      },
    );
  }

  return (
    <section aria-labelledby="compare-heading" className="rounded-lg border border-line bg-surface p-4">
      <h2 id="compare-heading" className="font-display text-xl font-bold">
        Local or eBay?
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[18rem] border-collapse text-[0.98rem]">
          <caption className="sr-only">Local and eBay side by side. Choose a column to switch channels.</caption>
          <thead>
            <tr>
              <td />
              {SALES_CHANNELS.map((c) => (
                <th key={c} scope="col" className={`w-[30%] p-1 ${channel === c ? "bg-sunk" : ""}`}>
                  <button
                    type="button"
                    aria-pressed={channel === c}
                    onClick={() => onChannelChange(c)}
                    className={`min-h-11 w-full rounded font-display text-lg font-bold ${
                      channel === c ? "bg-ink text-bg" : "border border-line-strong hover:bg-sunk"
                    }`}
                  >
                    {CHANNEL_LABEL[c]}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="num">
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line">
                <th scope="row" className="py-2 pr-2 text-left font-normal">{r.label}</th>
                <td className={`py-2 text-right pr-2 ${channel === "local" ? "bg-sunk" : ""}`}>{cell(local, r.render)}</td>
                <td className={`py-2 text-right pr-2 ${channel === "ebay" ? "bg-sunk" : ""}`}>{cell(ebay, r.render)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ChannelExplanation local={local} ebay={ebay} />
    </section>
  );
}

function ChannelExplanation({ local, ebay }: { local?: ToolValueCatalogRow; ebay?: ToolValueCatalogRow }) {
  if (!local || !ebay || local.expected_resale === null || ebay.expected_resale === null) return null;
  const ebayCosts = costsOf(ebay);
  const lMax = local.maximum_recommended_buy;
  const eMax = ebay.maximum_recommended_buy;

  let ceiling = "";
  if (lMax !== null && eMax !== null) {
    if (eMax < lMax) {
      ceiling = `That's why eBay's max buy (${formatMoney(eMax)}) is lower than Local's (${formatMoney(lMax)}) even though eBay can sell higher.`;
    } else if (eMax > lMax) {
      ceiling = `Here the higher eBay price outweighs those costs, so eBay supports a higher max buy (${formatMoney(eMax)} vs ${formatMoney(lMax)}).`;
    } else {
      ceiling = `Here the two channels land on the same max buy (${formatMoney(eMax)}).`;
    }
  }

  return (
    <p className="mt-3 text-[0.95rem] leading-snug text-muted">
      eBay's expected resale is {formatMoneyExact(ebay.expected_resale)} vs {formatMoneyExact(local.expected_resale)} locally,
      {ebayCosts !== null ? ` but about ${formatMoneyExact(ebayCosts)} of an eBay sale goes to fees and shipping` : " but eBay sales carry fees and shipping"},
      and the risk buffer grows with the price. {ceiling}
    </p>
  );
}
