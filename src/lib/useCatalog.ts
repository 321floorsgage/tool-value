import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolValueCatalogRow } from "../types/catalog";
import { catalogSource } from "@catalog-source";

export type CatalogState =
  | { status: "loading"; rows: null; error: null }
  | { status: "ready"; rows: ToolValueCatalogRow[]; error: null; refreshing: boolean; refreshError: string | null }
  | { status: "error"; rows: null; error: string };

function describe(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "The catalog could not be loaded.";
}

export function useCatalog() {
  const [state, setState] = useState<CatalogState>({ status: "loading", rows: null, error: null });
  const requestId = useRef(0);

  const load = useCallback(async (mode: "initial" | "refresh") => {
    const id = ++requestId.current;
    setState((prev) =>
      mode === "refresh" && prev.status === "ready"
        ? { ...prev, refreshing: true, refreshError: null }
        : { status: "loading", rows: null, error: null },
    );
    try {
      const rows = await catalogSource.load();
      if (id !== requestId.current) return;
      setState({ status: "ready", rows, error: null, refreshing: false, refreshError: null });
    } catch (err) {
      if (id !== requestId.current) return;
      setState((prev) =>
        // A failed refresh keeps the rows already on screen (they are real data)
        // and reports the failure; nothing is substituted.
        mode === "refresh" && prev.status === "ready"
          ? { ...prev, refreshing: false, refreshError: describe(err) }
          : { status: "error", rows: null, error: describe(err) },
      );
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount.
    void load("initial");
  }, [load]);

  return {
    state,
    sourceInfo: catalogSource.info,
    retry: () => void load("initial"),
    refresh: () => void load("refresh"),
  };
}
