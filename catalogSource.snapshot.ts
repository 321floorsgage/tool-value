import type { CatalogSource } from "../src/types/catalog";
import { parseCatalogRows } from "../src/lib/catalog";
import snapshot from "./catalog-snapshot.json";

/**
 * Artifact preview ONLY. Claude Artifact pages cannot make network requests,
 * so the preview build reads a clearly labeled, read-only snapshot of the live
 * catalog instead of Supabase. The Netlify build never includes this file.
 */
export const catalogSource: CatalogSource = {
  info: {
    kind: "snapshot",
    label: `Preview data: a read-only copy of the live catalog taken ${new Date(snapshot.captured_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. The deployed app reads the catalog live, including product images, which this preview cannot load.`,
  },
  async load() {
    return parseCatalogRows(snapshot.rows);
  },
};

export const configResult = { ok: true as const };
