import { defineConfig, devices } from "@playwright/test";

// Default: build + preview the app locally and hit live Supabase.
// Deploy Preview check: PLAYWRIGHT_BASE_URL=https://deploy-preview-N--your-site.netlify.app npm run test:e2e
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: externalBaseUrl ?? "http://localhost:4173",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: "mobile-360", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 780 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: process.env.E2E_ARTIFACT_BUILD
          ? "npx vite build --mode artifact && npx vite preview --outDir dist-artifact --port 4173 --strictPort"
          : "npm run build && npx vite preview --port 4173 --strictPort",
        port: 4173,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
