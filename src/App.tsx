import { useEffect, useMemo, useState } from "react";
import type { SalesChannel, ToolGroup } from "./types/catalog";
import { configResult } from "@catalog-source";
import { groupByModel, latestRefresh, selectionLabel } from "./lib/catalog";
import { parseAskingPrice } from "./lib/price";
import { readUrlState, writeUrlState } from "./lib/urlState";
import { useCatalog } from "./lib/useCatalog";
import { UNSUPPORTED_MESSAGE } from "./lib/constants";
import { Header } from "./components/Header";
import { ToolSearch } from "./components/ToolSearch";
import { PriceInput } from "./components/PriceInput";
import { ChannelToggle } from "./components/ChannelToggle";
import { VerdictPanel } from "./components/VerdictPanel";
import { ThresholdScale } from "./components/ThresholdScale";
import { ProfitLedger } from "./components/ProfitLedger";
import { ChannelComparison, ResaleRange, ToolIdentity } from "./components/ToolDetails";
import { EvidencePanel } from "./components/EvidencePanel";
import { Disclaimer } from "./components/Disclaimer";
import { ConfigErrorScreen, DataErrorState, LoadingState } from "./components/StatusStates";
import { canGiveVerdict, isInsufficientEvidence } from "./lib/calculations";

export default function App() {
  if (!configResult.ok) return <ConfigErrorScreen problems={configResult.problems} />;
  return <Calculator />;
}

const initialUrl = typeof window === "undefined" ? readUrlState("") : readUrlState(window.location.search);

function Calculator() {
  const { state, sourceInfo, retry, refresh } = useCatalog();
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState<string | null>(initialUrl.model);
  const [channel, setChannel] = useState<SalesChannel>(initialUrl.channel);
  const [priceText, setPriceText] = useState(initialUrl.price);

  const rows = state.status === "ready" ? state.rows : null;
  const groups = useMemo(() => (rows ? groupByModel(rows) : []), [rows]);
  const selected: ToolGroup | null = useMemo(
    () => groups.find((g) => g.model_number === selectedModel) ?? null,
    [groups, selectedModel],
  );
  const missingLinkedModel = rows !== null && selectedModel !== null && selected === null;

  // When a shared link names a model, show it in the search box once data arrives.
  const [syncedQueryFor, setSyncedQueryFor] = useState<string | null>(null);
  if (selected && syncedQueryFor !== selected.model_number && query === "") {
    setSyncedQueryFor(selected.model_number);
    setQuery(selectionLabel(selected));
  }

  const price = parseAskingPrice(priceText);
  const asking = price.status === "valid" ? price.value : null;
  const row = selected?.rows[channel];

  useEffect(() => {
    writeUrlState({ model: selectedModel, channel, price: price.status === "valid" ? priceText.trim() : "" });
  }, [selectedModel, channel, priceText, price.status]);

  return (
    <div className="min-h-screen">
      <Header
        sourceInfo={sourceInfo}
        lastRefresh={rows ? latestRefresh(rows) : null}
        canRefresh={state.status === "ready"}
        refreshing={state.status === "ready" && state.refreshing}
        refreshError={state.status === "ready" ? state.refreshError : null}
        onRefresh={refresh}
      />

      <main className="mx-auto grid max-w-6xl gap-5 px-4 pt-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-8">
        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && <DataErrorState message={state.error} onRetry={retry} />}

        {state.status === "ready" && (
          <>
            <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              <section aria-label="Deal inputs" className="space-y-4 rounded-lg border border-line bg-surface p-4">
                <ToolSearch
                  groups={groups}
                  query={query}
                  onQueryChange={setQuery}
                  selected={selected}
                  onSelect={(g) => setSelectedModel(g?.model_number ?? null)}
                />
                {missingLinkedModel && (
                  <p role="status" className="rounded-md bg-sunk p-3">
                    {selectedModel}: {UNSUPPORTED_MESSAGE}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-1">
                  <PriceInput value={priceText} parsed={price} onChange={setPriceText} />
                  <ChannelToggle value={channel} onChange={setChannel} />
                </div>
              </section>

              <VerdictPanel group={selected} row={row} channel={channel} price={price} />

              {row &&
                canGiveVerdict(row) &&
                (row.maximum_recommended_buy ?? 0) > 0 && (
                  <ThresholdScale
                    greatBuy={row.great_buy_price ?? 0}
                    maxBuy={row.maximum_recommended_buy ?? 0}
                    asking={asking}
                  />
                )}
            </div>

            <div className="space-y-4">
              {selected ? (
                <>
                  <ToolIdentity group={selected} />
                  {row && !isInsufficientEvidence(row) ? (
                    <>
                      <ResaleRange row={row} channel={channel} />
                      <ProfitLedger row={row} channel={channel} asking={asking} />
                    </>
                  ) : null}
                  <ChannelComparison group={selected} channel={channel} asking={asking} onChannelChange={setChannel} />
                  {row && <EvidencePanel row={row} channel={channel} />}
                </>
              ) : (
                <HowItWorks />
              )}
            </div>
          </>
        )}
      </main>

      <Disclaimer />
    </div>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="rounded-lg border border-line bg-surface p-5 lg:mt-0">
      <h2 id="how-heading" className="font-display text-2xl font-bold">
        What you'll see
      </h2>
      <ul className="mt-3 space-y-3">
        <li>
          <strong className="font-display text-lg">A verdict.</strong> Great buy, good buy, negotiate, pass, or bundle
          or skip, based on a $40 profit per tool.
        </li>
        <li>
          <strong className="font-display text-lg">The most you should pay.</strong> The max recommended buy, plus the
          lower great-buy price.
        </li>
        <li>
          <strong className="font-display text-lg">The math.</strong> Resale, fees, shipping, and a risk buffer, with
          Local and eBay side by side.
        </li>
      </ul>
    </section>
  );
}
