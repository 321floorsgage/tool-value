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

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run lint` | ESLint (includes a rule that blocks insert/update/upsert/delete/rpc calls in `src/`) |
| `npm run typecheck` | TypeScript project check |
| `npm test` | Vitest unit and component tests |
| `npm run build` | Production build to `dist/` (what Netlify runs) |
| `npm run check` | lint + typecheck + tests + build |
| `npm run test:e2e` | Playwright critical calculator flow at 360px and desktop |
| `npm run build:artifact` | Single-file HTML for the Claude Artifact preview (`dist-artifact/`) |
| `npm run snapshot` | Refreshes the Artifact preview's catalog copy from the live view |

First-time Playwright setup: `npx playwright install chromium`.

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
  lib/
    calculations.ts          getVerdict + getProjectedOutcome (handoff §9, exact)
    catalogSource.live.ts    Supabase client + the one allowed query
    catalog.ts               Row validation and grouping by model
    search.ts                Client-side fuzzy search
    price.ts                 Asking-price parsing and validation
    env.ts                   Startup config validation
  types/catalog.ts           ToolValueCatalogRow contract
  test/                      Unit + component tests
e2e/                         Playwright critical flow
preview/                     Artifact-preview-only data source (see below)
```

**Verdict rules** (in order): max buy ≤ 0 → Bundle/Skip; price ≤ great-buy → Great Buy; price ≤ max buy → Good Buy; price ≤ max buy + $15 → Negotiate; otherwise Pass.

**Profit:** cash profit = expected resale − price − fees − shipping; risk-adjusted = cash profit − risk buffer. The $40 target is not subtracted again because it's already built into the buy ceilings.

**Insufficient data:** a missing buy threshold, or a row with `confidence_label = "insufficient"` or zero samples, gets no verdict. A missing fee, shipping, or risk value shows "Insufficient data" for that metric and its profit line. Unsupported models get "We don't have enough verified data for this model yet." and no estimate.

## Artifact preview vs. deployed app

Claude Artifact pages can't make network requests, so the preview can't reach Supabase. `npm run build:artifact` builds the **same** components, calculations, and styles into one HTML file and swaps only the data source (via the `@catalog-source` alias in `vite.config.ts`) for `preview/catalog-snapshot.json`, a read-only copy of the live view. The preview labels this on screen. The Netlify build never includes that file and never falls back to it.

## Data contract

The app depends on the 25 columns in `src/types/catalog.ts`. If Codex changes the view, update that type, `src/lib/catalogQuery.ts`, the parser in `src/lib/catalog.ts`, and the tests. Database changes go through Codex using the `DATABASE CONTRACT REQUEST` format.
