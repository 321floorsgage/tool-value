export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export type ConfigResult =
  | { ok: true; config: SupabasePublicConfig }
  | { ok: false; problems: string[] };

/** Validates the two public browser variables. Never accepts a secret key. */
export function readSupabaseConfig(env: Record<string, string | undefined>): ConfigResult {
  const problems: string[] = [];
  const url = env.VITE_SUPABASE_URL?.trim() ?? "";
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  if (!url) {
    problems.push("VITE_SUPABASE_URL is not set.");
  } else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") problems.push("VITE_SUPABASE_URL must use https.");
    } catch {
      problems.push("VITE_SUPABASE_URL is not a valid URL.");
    }
  }

  if (!publishableKey) {
    problems.push("VITE_SUPABASE_PUBLISHABLE_KEY is not set.");
  } else if (publishableKey.startsWith("sb_secret_") || looksLikeServiceRoleJwt(publishableKey)) {
    problems.push(
      "VITE_SUPABASE_PUBLISHABLE_KEY contains a secret or service-role key. Remove it and use the publishable key.",
    );
  }

  return problems.length ? { ok: false, problems } : { ok: true, config: { url, publishableKey } };
}

function looksLikeServiceRoleJwt(key: string): boolean {
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}
