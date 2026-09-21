# Tool Value

A mobile-first calculator that answers one question at a yard sale: **should I buy this used power tool at the seller's price, and should I resell it locally or on eBay?**

It reads a single read-only Supabase view, `public.tool_value_catalog`, with the public publishable key. Valuations, buy ceilings, fees, shipping, and risk come from the database (managed by Codex). The app only calculates the user's projected profit and the verdict.

## Quick start

Requires Node 22.12 or newer.

```bash
npm ci
cp .env.example .env.local     # public URL + publishable key only
npm run dev                    # http://localhost:5173
```

## Environment variables

| Variable | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://dbqyluplqlrvfpldbeay.supabase.co` | Public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (see `.env.example`) | Public, limited by grants and RLS |

Both are validated at startup. If either is missing or malformed, the app shows a configuration error instead of running. It also refuses `sb_secret_` and service-role keys. Every `VITE_` variable ends up in the browser bundle, so **never** add a service-role key, secret key, database password, or access token anywhere in this project.

## Scan Tool

The header switches between **Calculator** (type a model) and **Scan Tool** (photograph one). Scanning never prices anything by itself: it proposes models from the catalog, the user confirms one, and the existing calculator does the valuation.

How a scan works:

1. The browser takes 1–3 photos of a single tool, fixes EXIF orientation, resizes to a 1280 px long edge, and re-encodes at about 0.78 quality. Photos stay in memory — never in the URL, storage, logs, or Supabase.
2. `POST /api/identify-tool` (a Netlify Function) re-validates the payload, reads `public.tool_scan_catalog` with the publishable key, and asks a vision model to match the photos against that catalog only.
3. The model returns catalog IDs. The function discards any ID that isn't in the catalog, sorts by confidence, keeps at most three, and replaces each ID with the trusted catalog row before responding.
4. Candidates at 0.60 confidence or above are shown as a ranked choice; 0.85 or above highlights the best one. Nothing is selected until the user taps **Yes, this is my tool**.
5. Below 0.60, or with no valid candidate, the app shows what the photos revealed, asks for a label photo, and offers manual search. No price is estimated.

The AI is untrusted throughout: image text is treated as evidence rather than instructions, and the model can never introduce a model number the catalog doesn't already have.

### AI Gateway

Netlify AI Gateway injects `OPENAI_API_KEY` and `OPENAI_BASE_URL` into the function at runtime. The function reads both through `Netlify.env` and passes them directly to the OpenAI client. Usage is billed as Netlify credits. The model defaults to `gpt-4o-mini` and is overridable with the server-only `AI_VISION_MODEL` variable. Never create a `VITE_` AI variable — everything with that prefix ships to the browser.

Requirements on the Netlify side:

- A credit-based plan with AI features enabled. The Gateway activates only after a production deploy.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` available to the function at runtime, not just at build time.
- Optional: `AI_VISION_MODEL`.
- The function applies a built-in per-IP limit of 10 scan requests per minute so one visitor can't rapidly drain AI credits.

`netlify.toml` sets `Permissions-Policy = "camera=(self), microphone=(), geolocation=()"` so the camera input works on the deployed site, and matches `/api/identify-tool` before the SPA catch-all so the endpoint isn't swallowed.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run lint` | ESLint (includes a rule that blocks insert/update/upsert/delete/rpc calls in `src/`) |
| `npm run typecheck` | TypeScript project check |
| `npm test` | Vitest unit and component tests |
| `npm run build` | Production build to `dist/` (what Netlify runs) |
| `npm run check` | lint + typecheck + tests + build |
| `npm run test:e2e` | Playwright calculator and scan flows at 360px and desktop |
| `npm run build:artifact` | Single-file HTML for the Claude Artifact preview (`dist-artifact/`) |
| `npm run snapshot` | Refreshes the Artifact preview's catalog copy from the live view |

First-time Playwright setup: `npx playwright install chromium`.

Local test runs serve the catalog from `preview/catalog-snapshot.json` and always stub the scan endpoint, so no AI Gateway credits are ever spent by tests. Runs against a deployed target (`PLAYWRIGHT_BASE_URL`) use live catalog data and additionally check that `/api/identify-tool` is answered by the Function rather than the SPA fallback.

## Deploying to Netlify

`netlify.toml` already sets the build command, `dist` publish directory, Node 22, the SPA redirect, security headers, and immutable caching for `/assets/*`.

1. Push this project to a Git repository (GitHub, GitLab, or Bitbucket).
2. In Netlify: **Add new site → Import an existing project** and pick the repo. Netlify reads the settings from `netlify.toml`.
3. In **Site configuration → Environment variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the **Production** and **Deploy Previews** contexts. Add nothing else.
4. Open a pull request so Netlify builds a **Deploy Preview**.
5. Verify the preview:
   ```bash
   PLAYWRIGHT_BASE_URL=https://deploy-preview-1--YOUR-SITE.netlify.app npm run test:e2e
   ```
   Then check by hand: live data loads, search works, Local/eBay switching updates every number, **Refresh data** keeps your selection, and a direct link such as `/?model=DCN680B&channel=ebay&price=80` loads correctly.
6. Merge to deploy production only after the preview passes.

A manual first deploy also works: `npm run build`, then drag `dist/` into Netlify's deploy screen (env vars must be present at build time, so build locally with `.env.local`).

## How it works

```
src/
  App.tsx                    Layout, state, URL sync
  components/                Search combobox, price input, channel toggle,
                             verdict panel, price ladder, profit ledger,
                             tool details + Local/eBay comparison, evidence,
                             loading / error / config states
  components/scan/           Photo picker, candidate cards, scan orchestration
  lib/
    scan/                    Shared with the Function: limits, request and AI
                             schemas, prompt, image pipeline, API client
    calculations.ts          getVerdict + getProjectedOutcome (handoff §9, exact)
    catalogSource.live.ts    Supabase client + the one allowed query
    catalog.ts               Row validation and grouping by model
    search.ts                Client-side fuzzy search
    price.ts                 Asking-price parsing and validation
    env.ts                   Startup config validation
  types/catalog.ts           ToolValueCatalogRow contract
  test/                      Unit + component tests
netlify/functions/           identify-tool: the only server-side code
e2e/                         Playwright calculator, scan, and endpoint checks
preview/                     Artifact-preview-only data source (see below)
```

**Verdict rules** (in order): max buy ≤ 0 → Bundle/Skip; price ≤ great-buy → Great Buy; price ≤ max buy → Good Buy; price ≤ max buy + $15 → Negotiate; otherwise Pass.

**Profit:** cash profit = expected resale − price − fees − shipping; risk-adjusted = cash profit − risk buffer. The $40 target is not subtracted again because it's already built into the buy ceilings.

**Product image:** each catalog row carries `image_url`, `image_alt`, and `image_source_url` for the exact model. The image is model-level, so it stays put when you switch Local and eBay. A missing or broken image falls back to a same-size placeholder showing the model number and "Image unavailable", and never blocks the valuation. No image URLs are hardcoded in the app.

**Insufficient data:** a missing buy threshold, or a row with `confidence_label = "insufficient"` or zero samples, gets no verdict. A missing fee, shipping, or risk value shows "Insufficient data" for that metric and its profit line. Unsupported models get "We don't have enough verified data for this model yet." and no estimate.

## Artifact preview vs. deployed app

Claude Artifact pages can't make network requests, so the preview can't reach Supabase. `npm run build:artifact` builds the **same** components, calculations, and styles into one HTML file and swaps only the data source (via the `@catalog-source` alias in `vite.config.ts`) for `preview/catalog-snapshot.json`, a read-only copy of the live view. The preview labels this on screen. The Netlify build never includes that file and never falls back to it.

The Artifact preview has no Netlify Function either, so Scan Tool shows a note and its submit button stays disabled there. Artifact pages also can't load third-party images, so the preview shows the "Image unavailable" placeholder for every model. The Netlify build loads the real product images from the URLs in the catalog.

## Data contract

The app depends on the 28 columns in `src/types/catalog.ts`. If Codex changes the view, update that type, `src/lib/catalogQuery.ts`, the parser in `src/lib/catalog.ts`, and the tests. Database changes go through Codex using the `DATABASE CONTRACT REQUEST` format.
