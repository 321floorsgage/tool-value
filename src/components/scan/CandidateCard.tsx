import type { ScanCandidate } from "../../types/scan";
import { confidenceLabel, confidencePercent } from "../../lib/scan/catalog";
import { shortBrand } from "../../lib/catalog";
import { ProductImage } from "../ProductImage";
import { CONFIDENCE_HIGHLIGHT } from "../../lib/scan/limits";

interface CandidateCardProps {
  candidate: ScanCandidate;
  valuationAvailable: boolean;
  onConfirm: (modelNumber: string) => void;
}

const TONE: Record<string, string> = {
  High: "bg-great text-on-verdict",
  Possible: "bg-negotiate text-on-negotiate",
  Low: "bg-sunk text-ink",
};

export function CandidateCard({ candidate, valuationAvailable, onConfirm }: CandidateCardProps) {
  const { model } = candidate;
  const label = confidenceLabel(candidate.confidence);
  const best = candidate.confidence >= CONFIDENCE_HIGHLIGHT;

  return (
    <li
      data-testid="scan-candidate"
      className={`rounded-lg border bg-surface p-4 ${best ? "border-2 border-great" : "border-line"}`}
    >
      <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <ProductImage
          src={model.image_url}
          alt={model.image_alt}
          sourceUrl={null}
          brand={model.brand}
          modelNumber={model.model_number}
        />
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-muted">{shortBrand(model.brand)}</span>
            <span
              className={`rounded px-2 py-0.5 font-display text-sm font-bold ${TONE[label]}`}
              data-testid="candidate-confidence"
            >
              {label} match, {confidencePercent(candidate.confidence)}%
            </span>
          </div>
          <p className="num font-display text-3xl font-extrabold leading-none tracking-tight">{model.model_number}</p>
          <p className="mt-1 leading-snug">{model.tool_name}</p>

          {candidate.evidence.length > 0 && (
            <div className="mt-2">
              <p className="font-display font-semibold">What the photos show</p>
              <ul className="ml-5 list-disc text-[0.95rem]">
                {candidate.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {candidate.uncertainty.length > 0 && (
            <div className="mt-2">
              <p className="font-display font-semibold">Not confirmed</p>
              <ul className="ml-5 list-disc text-[0.95rem] text-muted">
                {candidate.uncertainty.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {valuationAvailable ? (
            <button
              type="button"
              onClick={() => onConfirm(model.model_number)}
              className="mt-3 min-h-13 w-full rounded-md bg-neutral px-4 font-display text-lg font-bold text-on-verdict sm:w-auto"
            >
              Yes, this is my tool
            </button>
          ) : (
            <p className="mt-3 rounded bg-sunk p-2 text-[0.95rem]">
              This model has no live valuation yet, so the calculator can't price it.
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
