import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolScanCatalogRow } from "../types/scan";
import { parseScanCatalogRows } from "./scan/catalog";
import { SCAN_CATALOG_COLUMNS, SCAN_CATALOG_TABLE } from "./scanCatalogQuery";
import { readSupabaseConfig } from "./env";

const configResult = readSupabaseConfig(import.meta.env);

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!configResult.ok) throw new Error(configResult.problems.join(" "));
  client ??= createClient(configResult.config.url, configResult.config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** Read-only list of the models the scanner can identify. No fallback data. */
export async function loadScanCatalog(): Promise<ToolScanCatalogRow[]> {
  const { data, error } = await getClient()
    .from(SCAN_CATALOG_TABLE)
    .select(SCAN_CATALOG_COLUMNS)
    .order("brand")
    .order("model_number");

  if (error) throw new Error(error.message || "The scan catalog request failed.");
  return parseScanCatalogRows(data);
}
