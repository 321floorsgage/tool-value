import type { SalesChannel } from "../types/catalog";

export type AppMode = "calculator" | "scan";

export interface UrlState {
  mode: AppMode;
  model: string | null;
  channel: SalesChannel;
  price: string;
}

export function readUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const channel = params.get("channel");
  return {
    mode: params.get("mode") === "scan" ? "scan" : "calculator",
    model: params.get("model"),
    channel: channel === "ebay" ? "ebay" : "local",
    price: (params.get("price") ?? "").slice(0, 12),
  };
}

export function writeUrlState(state: UrlState): void {
  try {
    const params = new URLSearchParams();
    if (state.mode === "scan") params.set("mode", "scan");
    if (state.model) params.set("model", state.model);
    if (state.channel !== "local") params.set("channel", state.channel);
    if (state.price) params.set("price", state.price);
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  } catch {
    // Some embedded viewers block history changes; the calculator still works.
  }
}
