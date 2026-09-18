import { expect, test } from "@playwright/test";

// Critical calculator flow. Run against a Netlify Deploy Preview with:
//   PLAYWRIGHT_BASE_URL=https://deploy-preview-N--your-site.netlify.app npm run test:e2e
// Verdict values are regression examples as of Sept 17, 2026 (handoff section 15);
// update them if Codex's weekly refresh moves the thresholds.

test.beforeEach(async ({ page }) => {
  // Guard: the app may only READ public.tool_value_catalog.
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes(".supabase.co/")) {
      expect(request.method(), `Unexpected Supabase call: ${request.method()} ${url}`).toMatch(/^(GET|HEAD|OPTIONS)$/);
      expect(new URL(url).pathname).toBe("/rest/v1/tool_value_catalog");
    }
  });
});

test("search, price, verdict, and channel switching", async ({ page }) => {
  await page.goto("/");
  const tool = page.getByRole("combobox", { name: "Tool" });
  await expect(tool).toBeVisible({ timeout: 15_000 });

  await tool.fill("2904");
  await page.getByRole("option", { name: /2904-20/ }).click();
  const price = page.getByRole("textbox", { name: "Asking price" });

  for (const [value, verdict] of [
    ["20", "Great buy"],
    ["35", "Good buy"],
    ["50", "Negotiate"],
    ["60", "Pass"],
  ] as const) {
    await price.fill(value);
    await expect(page.getByTestId("verdict")).toHaveText(verdict);
  }

  await price.fill("35");
  await expect(page.getByTestId("max-buy")).toHaveText("$40");
  await expect(page.getByTestId("cash-profit-row")).toContainText("$54.99");
  await expect(page.getByTestId("risk-profit-row")).toContainText("$48.24");

  await page.getByText("eBay", { exact: true }).first().click();
  await expect(price).toHaveValue("35");
  await expect(tool).toHaveValue("Milwaukee 2904-20");
  await expect(page.getByTestId("max-buy")).toHaveText("$20");
  await expect(page.getByTestId("expected-resale")).toHaveText("$97.47");

  // No horizontal scrolling at any viewport.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("DEWALT DCN680B eBay boundaries via direct URL", async ({ page }) => {
  for (const [value, verdict] of [
    ["40", "Great buy"],
    ["65", "Good buy"],
    ["80", "Negotiate"],
    ["100", "Pass"],
  ] as const) {
    await page.goto(`/?model=DCN680B&channel=ebay&price=${value}`);
    await expect(page.getByTestId("verdict")).toHaveText(verdict, { timeout: 15_000 });
  }
});

test("battery is Bundle or skip on both channels", async ({ page }) => {
  await page.goto("/?model=48-11-1850&price=10");
  await expect(page.getByTestId("verdict")).toHaveText("Bundle or skip", { timeout: 15_000 });
  await page.getByText("eBay", { exact: true }).first().click();
  await expect(page.getByTestId("verdict")).toHaveText("Bundle or skip");
});

test("unsupported model gets no estimate", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Tool" }).fill("makita xdt13");
  await expect(page.getByText("We don't have enough verified data for this model yet.")).toBeVisible();
  await expect(page.getByTestId("verdict")).toHaveCount(0);
});

test("selected model shows one product image that survives a channel switch", async ({ page }) => {
  // Serve a stub for the third-party image so the assertion is about the app,
  // not about a remote CDN being reachable from wherever this runs.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.route("**/*.{png,jpg,jpeg,webp,avif,gif}", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: png }),
  );
  await page.route(/milwaukeetool\.com\/--\/web-images/, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: png }),
  );

  await page.goto("/?model=2904-20&price=35");
  const img = page.getByTestId("product-image-img");
  await expect(img).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("product-image")).toHaveCount(1);
  const before = await img.getAttribute("src");
  expect(before).toMatch(/^https:\/\//);

  await page.getByText("eBay", { exact: true }).first().click();
  await expect(page.getByTestId("max-buy")).toHaveText("$20");
  await expect(img).toHaveAttribute("src", before ?? "");
  await expect(page.getByTestId("product-image")).toHaveCount(1);

  // The image sits inside its container at any width.
  const box = await img.boundingBox();
  expect(box?.width ?? 0).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
});

test("a failing image falls back without disturbing the valuation", async ({ page }) => {
  await page.route("**/*.{png,jpg,jpeg,webp,avif,gif}", (route) => route.abort());
  await page.goto("/?model=2904-20&price=35");
  await expect(page.getByTestId("product-image-placeholder")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("verdict")).toHaveText("Good buy");
  await expect(page.getByTestId("max-buy")).toHaveText("$40");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
