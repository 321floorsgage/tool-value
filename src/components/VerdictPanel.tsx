import type { ReactNode } from "react";
import type { SalesChannel, ToolGroup, ToolValueCatalogRow } from "../types/catalog";
import {
  canGiveVerdict,
  canProjectCashProfit,
  canProjectRiskAdjustedProfit,
  getProjectedOutcome,
  getVerdict,
  isInsufficientEvidence,
  type Verdict,
} from "../lib/calculations";
import { CHANNEL_LABEL, LOCKED_TARGET_PROFIT, UNSUPPORTED_MESSAGE } from "../lib/constants";
import { formatMoney, formatMoneyExact } from "../lib/format";
import type { PriceParseResult } from "../lib/price";
import { verdictCopy, verificationChecklist } from "../lib/verdictCopy";

interface VerdictPanelProps {
  group: ToolGroup | null;
  row: ToolValueCatalogRow | undefined;
  channel: SalesChannel;
  price: PriceParseResult;
}

const PANEL_STYLE: Record<Verdict, string> = {
  great_buy: "bg-great text-on-verdict",
  good_buy: "bg-good text-on-verdict",
  negotiate: "bg-negotiate text-on-negotiate",
  pass: "bg-pass text-on-verdict",
  bundle_skip: "bg-bundle text-on-verdict",
};

export function VerdictPanel({ group, row, channel, price }: VerdictPanelProps) {
  if (!group) {
    return (
      <Shell tone="border border-dashed border-line-strong bg-surface text-ink">
        <p className="font-display text-2xl font-bold leading-tight">Is it worth buying?</p>
        <p className="mt-1">Pick a tool, enter the seller's price, and choose where you'd resell it.</p>
      </Shell>
    );
  }

  if (!row || isInsufficientEvidence(row)) {
    return (
      <Shell tone="border-2 border-line-strong bg-surface text-ink">
        <p className="font-display text-2xl font-bold leading-tight">No {CHANNEL_LABEL[channel]} estimate</p>
        <p className="mt-1">{UNSUPPORTED_MESSAGE}</p>
        <p className="mt-1 text-sm text-muted">No price is estimated from similar models.</p>
      </Shell>
    );
  }

  if (!canGiveVerdict(row)) {
    return (
      <Shell tone="border-2 border-line-strong bg-surface text-ink">
        <p className="font-display text-2xl font-bold leading-tight">Insufficient data</p>
        <p className="mt-1">
          The catalog is missing a buy threshold for {CHANNEL_LABEL[channel]}, so there's no verdict for this tool
          yet.
        </p>
      </Shell>
    );
  }

  const maxBuy = row.maximum_recommended_buy as number;
  const greatBuy = row.great_buy_price as number;
  const target = row.target_profit ?? LOCKED_TARGET_PROFIT;
  const asking = price.status === "valid" ? price.value : null;

  // Bundle/Skip does not depend on the asking price.
  if (maxBuy <= 0) {
    return <VerdictBody verdict="bundle_skip" row={row} channel={channel} asking={asking} maxBuy={maxBuy} greatBuy={greatBuy} target={target} />;
  }

  if (asking === null) {
    return (
      <Shell tone="bg-neutral text-on-verdict">
        <p className="text-sm opacity-90">{CHANNEL_LABEL[channel]} resale</p>
        <p className="font-display text-2xl font-bold leading-tight">
          {price.status === "invalid" ? "Fix the asking price for a verdict" : "Enter the seller's price"}
        </p>
        <Thresholds maxBuy={maxBuy} greatBuy={greatBuy} />
        <p className="mt-3">You'd need to buy at {formatMoney(maxBuy)} or less to clear your {formatMoney(target)} target.</p>
      </Shell>
    );
  }

  const verdict = getVerdict(asking, row);
  return <VerdictBody verdict={verdict} row={row} channel={channel} asking={asking} maxBuy={maxBuy} greatBuy={greatBuy} target={target} />;
}

interface VerdictBodyProps {
  verdict: Verdict;
  row: ToolValueCatalogRow;
  channel: SalesChannel;
  asking: number | null;
  maxBuy: number;
  greatBuy: number;
  target: number;
}

function VerdictBody({ verdict, row, channel, asking, maxBuy, greatBuy, target }: VerdictBodyProps) {
  const copy = verdictCopy(verdict, maxBuy, target);
  const outcome = asking !== null ? getProjectedOutcome(asking, row) : null;
  const showChecklist = verdict === "great_buy" || verdict === "good_buy" || verdict === "negotiate";

  return (
    <div>
      <Shell tone={PANEL_STYLE[verdict]} key={`${verdict}-${channel}-${row.model_id}`} animate>
        <p className="text-sm opacity-90">
          {asking !== null ? `At ${formatMoney(asking)}, reselling ${CHANNEL_LABEL[channel]}` : `Reselling ${CHANNEL_LABEL[channel]}`}
        </p>
        <h2 data-testid="verdict" className="font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight">
          {copy.title}
        </h2>
        <p className="mt-1 text-[1.05rem] leading-snug">{copy.action}</p>

        {verdict === "bundle_skip" ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-current/30 pt-3">
            <div>
              <dt className="text-sm opacity-90">Max recommended buy</dt>
              <dd className="num font-display text-4xl font-extrabold leading-none">{formatMoney(maxBuy)}</dd>
            </div>
            <div>
              <dt className="text-sm opacity-90">Expected resale</dt>
              <dd className="font-display text-2xl font-bold leading-tight">
                {row.expected_resale === null ? "Insufficient data" : formatMoneyExact(row.expected_resale)}
              </dd>
            </div>
          </dl>
        ) : (
          <Thresholds maxBuy={maxBuy} greatBuy={greatBuy} />
        )}

        {outcome && (
          <p className="mt-3 border-t border-current/30 pt-3 leading-snug" data-testid="profit-summary">
            Projected profit:{" "}
            {canProjectCashProfit(row) ? (
              <strong className="num">{formatMoneyExact(outcome.projectedCashProfit)}</strong>
            ) : (
              <em>insufficient data</em>
            )}{" "}
            cash,{" "}
            {canProjectRiskAdjustedProfit(row) ? (
              <strong className="num">{formatMoneyExact(outcome.riskAdjustedProfit)}</strong>
            ) : (
              <em>insufficient data</em>
            )}{" "}
            after the risk buffer.
          </p>
        )}
      </Shell>

      {showChecklist && (
        <div className="mt-2 rounded-lg border border-line bg-surface p-4">
          <p className="font-display text-lg font-semibold">Check before you pay</p>
          <ul className="mt-1 space-y-1">
            {verificationChecklist(row.item_kind).map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 inline-block h-2 w-2 shrink-0 rounded-sm bg-line-strong" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Thresholds({ maxBuy, greatBuy }: { maxBuy: number; greatBuy: number }) {
  return (
    <dl className="mt-4 grid grid-cols-[1.3fr_1fr] gap-3 border-t border-current/30 pt-3">
      <div>
        <dt className="text-sm opacity-90">Max recommended buy</dt>
        <dd data-testid="max-buy" className="num font-display text-5xl font-extrabold leading-none">
          {formatMoney(maxBuy)}
        </dd>
      </div>
      <div>
        <dt className="text-sm opacity-90">Great-buy price</dt>
        <dd data-testid="great-buy" className="num font-display text-3xl font-bold leading-none">
          {formatMoney(greatBuy)}
        </dd>
      </div>
    </dl>
  );
}

function Shell({ tone, children, animate = false }: { tone: string; children: ReactNode; animate?: boolean }) {
  return (
    <section aria-live="polite" aria-label="Verdict" className={`rounded-lg p-5 ${tone} ${animate ? "verdict-enter" : ""}`}>
      {children}
    </section>
  );
}
