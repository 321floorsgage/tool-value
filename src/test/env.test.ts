import { describe, expect, it } from "vitest";
import { readSupabaseConfig } from "../lib/env";
import { CATALOG_COLUMNS, CATALOG_TABLE } from "../lib/catalogQuery";

const URL_OK = "https://dbqyluplqlrvfpldbeay.supabase.co";
const KEY_OK = "sb_publishable_OfHjGLy3-PkQIREEh1TNMg_1eRWIsLV";

describe("readSupabaseConfig", () => {
  it("accepts the public URL and publishable key", () => {
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_PUBLISHABLE_KEY: KEY_OK })).toEqual({
      ok: true,
      config: { url: URL_OK, publishableKey: KEY_OK },
    });
  });

  it("reports each missing variable", () => {
    const result = readSupabaseConfig({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems).toEqual([
        "VITE_SUPABASE_URL is not set.",
        "VITE_SUPABASE_PUBLISHABLE_KEY is not set.",
      ]);
    }
  });

  it("rejects bad URLs", () => {
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: "not a url", VITE_SUPABASE_PUBLISHABLE_KEY: KEY_OK }).ok).toBe(false);
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: "http://x.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: KEY_OK }).ok).toBe(false);
  });

  it("refuses secret and service-role keys", () => {
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc" }).ok).toBe(false);
    const payload = btoa(JSON.stringify({ role: "service_role" })).replace(/=+$/, "");
    const jwt = `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_PUBLISHABLE_KEY: jwt }).ok).toBe(false);
  });
});

describe("catalog query contract", () => {
  it("reads only tool_value_catalog with the contract columns", () => {
    expect(CATALOG_TABLE).toBe("tool_value_catalog");
    const cols = CATALOG_COLUMNS.split(",").map((c) => c.trim());
    expect(cols).toHaveLength(25);
    expect(cols).toContain("maximum_recommended_buy");
    expect(cols).not.toContain("*");
  });
});
