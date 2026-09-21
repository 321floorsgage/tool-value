import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IdentifyToolResponse } from "../../types/scan";
import { identifyTool, ScanRequestError } from "../../lib/scan/api";
import {
  exceedsRequestBudget,
  PhotoPrepareError,
  prepareScanPhoto,
  releasePhoto,
  type ScanPhoto,
} from "../../lib/scan/images";
import { CONFIDENCE_CHOICE, CONFIDENCE_HIGHLIGHT, MAX_PHOTOS } from "../../lib/scan/limits";
import { PhotoPicker } from "./PhotoPicker";
import { CandidateCard } from "./CandidateCard";

interface ScanToolProps {
  /** Model numbers the valuation catalog can actually price. */
  pricedModelNumbers: Set<string>;
  /** False in the Artifact preview build, which has no scan endpoint. */
  scannerAvailable: boolean;
  onConfirm: (modelNumber: string) => void;
  onSearchManually: () => void;
}

type Phase = "idle" | "compressing" | "analyzing";

interface ScanError {
  message: string;
  retryable: boolean;
}

export function ScanTool({ pricedModelNumbers, scannerAvailable, onConfirm, onSearchManually }: ScanToolProps) {
  const [photos, setPhotos] = useState<ScanPhoto[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<IdentifyToolResponse | null>(null);
  const [error, setError] = useState<ScanError | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const photosRef = useRef<ScanPhoto[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Photos live in memory only: release their thumbnails on unmount.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      photosRef.current.forEach(releasePhoto);
    },
    [],
  );

  // photosRef mirrors the photo list for async work and unmount cleanup; every
  // handler below updates both together, never during render.
  const commitPhotos = useCallback((next: ScanPhoto[]) => {
    photosRef.current = next;
    setPhotos(next);
  }, []);

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setPhase("compressing");
    try {
      for (const file of Array.from(files)) {
        if (photosRef.current.length >= MAX_PHOTOS) break;
        let prepared: ScanPhoto;
        try {
          prepared = await prepareScanPhoto(file);
        } catch (err) {
          setError({
            message: err instanceof PhotoPrepareError ? err.message : "That photo couldn't be used.",
            retryable: false,
          });
          continue;
        }
        if (exceedsRequestBudget(photosRef.current, prepared)) {
          releasePhoto(prepared);
          setError({
            message: "Those photos are too large to send together. Try two instead of three.",
            retryable: false,
          });
          continue;
        }
        commitPhotos([...photosRef.current, prepared]);
        setResult(null);
      }
    } finally {
      setPhase("idle");
    }
  }, [commitPhotos]);

  const removePhoto = useCallback((id: string) => {
    const photo = photosRef.current.find((p) => p.id === id);
    if (photo) releasePhoto(photo);
    commitPhotos(photosRef.current.filter((p) => p.id !== id));
    setResult(null);
  }, [commitPhotos]);

  const reset = useCallback(() => {
    photosRef.current.forEach(releasePhoto);
    commitPhotos([]);
    setResult(null);
    setError(null);
  }, [commitPhotos]);

  const submit = useCallback(async () => {
    if (phase !== "idle" || photosRef.current.length === 0) return;
    setError(null);
    setResult(null);
    setPhase("analyzing");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await identifyTool({
        images: photosRef.current.map((photo) => photo.dataUrl),
        signal: controller.signal,
      });
      setResult(response);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Photos are kept so a retry costs the user nothing.
      setError({
        message: err instanceof ScanRequestError ? err.message : "The scan failed. Try again.",
        retryable: err instanceof ScanRequestError ? err.retryable : true,
      });
    } finally {
      abortRef.current = null;
      setPhase("idle");
    }
  }, [phase]);

  const confirm = useCallback(
    (modelNumber: string) => {
      reset();
      onConfirm(modelNumber);
    },
    [onConfirm, reset],
  );

  const usable = useMemo(
    () => (result?.candidates ?? []).filter((c) => c.confidence >= CONFIDENCE_CHOICE),
    [result],
  );
  const bestIsStrong = usable.length > 0 && usable[0].confidence >= CONFIDENCE_HIGHLIGHT;
  const busy = phase !== "idle";

  return (
    <div className="space-y-4">
      <section aria-label="Scan a tool" className="rounded-lg border border-line bg-surface p-4">
        <PhotoPicker photos={photos} busy={busy} onAdd={(files) => void addFiles(files)} onRemove={removePhoto} />

        {!scannerAvailable && (
          <p role="status" className="mt-3 rounded bg-warn-bg px-3 py-2 text-warn-ink">
            This preview can't reach the scanner. Scanning works on the deployed site.
          </p>
        )}

        {!online && (
          <p role="status" className="mt-3 rounded bg-warn-bg px-3 py-2 text-warn-ink">
            You're offline. The scan needs a connection, but you can still type a model number in the calculator.
          </p>
        )}

        <div className="mt-4 space-y-2">
          <button
            type="button"
            data-testid="scan-submit"
            disabled={photos.length === 0 || busy || !online || !scannerAvailable}
            aria-busy={phase === "analyzing"}
            onClick={() => void submit()}
            className="min-h-14 w-full rounded-md bg-great px-4 font-display text-xl font-bold text-on-verdict disabled:opacity-50"
          >
            {phase === "analyzing" ? "Checking the tool and label…" : "Identify this tool"}
          </button>
          <p className="text-sm text-muted">
            Photos are analyzed for this scan and are not saved to your account or catalog.
          </p>
        </div>

        {phase === "compressing" && (
          <p role="status" className="mt-2 text-[0.95rem]">
            Getting the photos ready…
          </p>
        )}
        {phase === "analyzing" && (
          <p role="status" className="mt-2 text-[0.95rem]">
            Checking the tool and label… this usually takes a few seconds.
          </p>
        )}

        {error && (
          <div role="alert" className="mt-3 rounded-md border-2 border-loss p-3">
            <p className="font-medium">{error.message}</p>
            {error.retryable && (
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                className="mt-2 min-h-12 rounded-md bg-neutral px-4 font-display text-lg font-bold text-on-verdict"
              >
                Try again
              </button>
            )}
            <p className="mt-2 text-sm text-muted">Your photos are still here, so a retry costs nothing.</p>
          </div>
        )}
      </section>

      {result && (
        <section aria-labelledby="scan-result-heading" aria-live="polite" className="space-y-3">
          <h2 id="scan-result-heading" className="font-display text-2xl font-bold">
            {usable.length === 0
              ? "No confident match"
              : bestIsStrong
                ? "Best match"
                : "Which one is it?"}
          </h2>

          {usable.length > 0 ? (
            <>
              <p className="text-[0.95rem]">
                {bestIsStrong
                  ? "Confirm it yourself before pricing: check the model number printed on the tool."
                  : "Nothing here is certain. Compare the model number on the tool with these before you pick one."}
              </p>
              <ul className="space-y-3">
                {usable.map((candidate) => (
                  <CandidateCard
                    key={candidate.model.model_id}
                    candidate={candidate}
                    valuationAvailable={pricedModelNumbers.has(candidate.model.model_number)}
                    onConfirm={confirm}
                  />
                ))}
              </ul>
            </>
          ) : (
            <div className="rounded-lg border-2 border-line-strong bg-surface p-4">
              <p>
                Nothing in the supported catalog matches these photos closely enough, so no price is estimated.
              </p>
              <Observations result={result} />
              {result.photo_guidance.length > 0 && (
                <div className="mt-3">
                  <p className="font-display font-semibold">This would help</p>
                  <ul className="ml-5 list-disc text-[0.95rem]">
                    {result.photo_guidance.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={reset}
              className="min-h-12 rounded-md border-2 border-line-strong bg-surface px-4 font-display text-lg font-bold"
            >
              None of these
            </button>
            <button
              type="button"
              onClick={onSearchManually}
              className="min-h-12 rounded-md border-2 border-line-strong bg-surface px-4 font-display text-lg font-bold"
            >
              Search manually
            </button>
          </div>
        </section>
      )}

      {!result && (
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="font-display text-xl font-bold">How the scan works</h2>
          <ul className="mt-2 space-y-2 text-[0.98rem]">
            <li>Photos are checked against the models the catalog can price. Nothing else is guessed at.</li>
            <li>You confirm the model. The scan is a shortcut to the calculator, not a verdict.</li>
            <li>Always read the model number printed on the tool before you hand over money.</li>
          </ul>
        </section>
      )}
    </div>
  );
}

function Observations({ result }: { result: IdentifyToolResponse }) {
  const { observations } = result;
  const rows: [string, string][] = [
    ["Brand", observations.brand ?? "Not visible"],
    ["Model number", observations.visible_model_number ?? "Not readable"],
    ["Type", observations.tool_type ?? "Unclear"],
    ["Platform", observations.voltage_or_platform ?? "Not visible"],
  ];
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.95rem]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
