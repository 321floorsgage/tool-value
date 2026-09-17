interface DataErrorProps {
  message: string;
  onRetry: () => void;
}

export function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="rounded-lg border border-line bg-surface p-5">
      <p className="font-display text-xl font-semibold">Loading the price catalog…</p>
      <div aria-hidden="true" className="mt-4 space-y-3">
        <div className="h-12 animate-pulse rounded-md bg-sunk motion-reduce:animate-none" />
        <div className="h-12 animate-pulse rounded-md bg-sunk motion-reduce:animate-none" />
        <div className="h-12 animate-pulse rounded-md bg-sunk motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export function DataErrorState({ message, onRetry }: DataErrorProps) {
  return (
    <div role="alert" className="rounded-lg border-2 border-loss bg-surface p-5">
      <h2 className="font-display text-2xl font-bold">Prices didn't load</h2>
      <p className="mt-1">
        The calculator needs the live catalog and won't guess without it. Check your signal and try again.
      </p>
      <p className="mt-2 break-words text-sm text-muted">Details: {message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-12 rounded-md bg-neutral px-5 font-display text-lg font-bold text-on-verdict hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}

export function ConfigErrorScreen({ problems }: { problems: string[] }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div role="alert" className="rounded-lg border-2 border-loss bg-surface p-5">
        <h1 className="font-display text-2xl font-bold">Tool Value isn't configured</h1>
        <p className="mt-1">The app can't reach its price catalog until these settings are fixed:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example), then rebuild. Only the
          publishable key belongs here.
        </p>
      </div>
    </main>
  );
}
