import type { SalesChannel, ToolValueCatalogRow } from "../types/catalog";
import { CHANNEL_LABEL } from "../lib/constants";
import { formatConfidence, formatDate } from "../lib/format";

interface EvidencePanelProps {
  row: ToolValueCatalogRow;
  channel: SalesChannel;
}

const CONFIDENCE_TONE: Record<string, string> = {
  high: "bg-great text-on-verdict",
  medium: "bg-good text-on-verdict",
  low: "bg-negotiate text-on-negotiate",
  insufficient: "bg-pass text-on-verdict",
};

export function EvidencePanel({ row, channel }: EvidencePanelProps) {
  const lowConfidence = row.confidence_label === "low" || row.confidence_label === "insufficient";
  return (
    <section aria-labelledby="evidence-heading" className="rounded-lg border border-line bg-surface p-4">
      <h2 id="evidence-heading" className="font-display text-xl font-bold">
        Where the numbers come from
      </h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Sold listings reviewed</dt>
          <dd data-testid="sample-count" className="num font-display text-2xl font-bold">{row.sold_sample_count}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{CHANNEL_LABEL[channel]} confidence</dt>
          <dd className="mt-0.5">
            <span
              data-testid="confidence"
              className={`inline-block rounded px-2 py-0.5 font-display text-lg font-bold ${
                CONFIDENCE_TONE[row.confidence_label] ?? "bg-sunk text-ink"
              }`}
            >
              {formatConfidence(row.confidence_label)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Last refreshed</dt>
          <dd className="font-medium">{formatDate(row.refreshed_at)}</dd>
        </div>
      </dl>

      {lowConfidence && channel === "local" && (
        <p className="mt-3 rounded bg-warn-bg px-3 py-2 text-warn-ink">
          Local estimate is currently a proxy based on eBay sold prices, not local sales. Treat it as a rough guide.
        </p>
      )}
      {lowConfidence && channel === "ebay" && (
        <p className="mt-3 rounded bg-warn-bg px-3 py-2 text-warn-ink">
          Confidence is low for this estimate. Treat it as a rough guide.
        </p>
      )}
      {row.planning_note && !(lowConfidence && channel === "local" && /proxy/i.test(row.planning_note)) && <p className="mt-3 text-[0.95rem]">{row.planning_note}</p>}
    </section>
  );
}
