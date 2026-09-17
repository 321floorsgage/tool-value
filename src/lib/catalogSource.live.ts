import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CatalogSource } from "../types/catalog";
import { CATALOG_COLUMNS, CATALOG_TABLE } from "./catalogQuery";
import { parseCatalogRows } from "./catalog";
import { readSupabaseConfig } from "./env";

export class ConfigurationError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(problems.join(" "));
    this.name = "ConfigurationError";
    this.problems = problems;
  }
}

export const configResult = readSupabaseConfig(import.meta.env);

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!configResult.ok) throw new ConfigurationError(configResult.problems);
  client ??= createClient(configResult.config.url, configResult.config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** Live, read-only catalog. No mock fallback: errors surface to the UI. */
export const catalogSource: CatalogSource = {
  info: { kind: "live", label: "Live catalog" },
  async load() {
    const supabase = getClient();
    const { data, error } = await supabase
      .from(CATALOG_TABLE)
      .select(CATALOG_COLUMNS)
      .order("brand")
      .order("model_number")
      .order("sales_channel");

    if (error) throw new Error(error.message || "The catalog request failed.");
    return parseCatalogRows(data);
  },
};
