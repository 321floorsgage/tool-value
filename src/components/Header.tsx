import type { CatalogSourceInfo } from "../types/catalog";
import type { AppMode } from "../lib/urlState";
import { AppModeSwitch } from "./AppModeSwitch";
import { formatDate } from "../lib/format";

interface HeaderProps {
  sourceInfo: CatalogSourceInfo;
  lastRefresh: string | null;
  canRefresh: boolean;
  refreshing: boolean;
  refreshError: string | null;
  onRefresh: () => void;
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function Header({
  sourceInfo,
  lastRefresh,
  canRefresh,
  refreshing,
  refreshError,
  onRefresh,
  mode,
  onModeChange,
}: HeaderProps) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-[1.75rem] font-extrabold leading-none tracking-tight">
            <span aria-hidden="true" className="inline-block h-5 w-2 rounded-sm bg-mark" />
            Tool Value
          </h1>
          <p className="mt-1.5 max-w-[34rem] text-[0.95rem] leading-snug text-muted">
            Check a used tool's asking price against what it resells for, before you hand over cash.
          </p>
        </div>
        {canRefresh && (
          <div className="flex items-center gap-3 text-sm text-muted">
            {lastRefresh && <span>Prices updated {formatDate(lastRefresh)}</span>}
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="min-h-11 whitespace-nowrap rounded-md border border-line-strong bg-surface px-3 font-medium text-ink hover:bg-sunk disabled:opacity-60"
            >
              {refreshing ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        )}
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-3">
        <AppModeSwitch value={mode} onChange={onModeChange} />
      </div>
      {refreshError && (
        <p role="alert" className="mx-auto max-w-6xl px-4 pb-3 text-sm text-loss">
          Refresh failed: {refreshError} The prices shown are from the last successful load.
        </p>
      )}
      {sourceInfo.kind === "snapshot" && (
        <p className="bg-warn-bg px-4 py-2 text-center text-sm text-warn-ink">{sourceInfo.label}</p>
      )}
    </header>
  );
}
