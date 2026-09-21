import { expect, test } from "@playwright/test";
import { SAMPLE_JPEG, stubCatalog } from "./support";

// The AI call is always stubbed: tests never spend AI Gateway credits.
test.beforeEach(async ({ page }) => {
  await stubCatalog(page);
});

const SCAN_RESPONSE = {
  request_id: "e2e-1",
  match_status: "candidates",
  observations: {
    brand: "Milwaukee",
    visible_model_number: "2904-20",
    tool_type: "Hammer drill/driver",
    voltage_or_platform: "M18",
    kit_contents: [],
    visible_markings: ["FUEL"],
  },
  candidates: [
    {
      model: {
        model_id: 2,
        brand: "Milwaukee Tool",
        model_number: "2904-20",
        tool_name: "M18 FUEL 1/2 in. Hammer Drill/Driver",
        category: "Drills",
        item_kind: "tool",
        battery_platform: "M18",
        power_source: "cordless",
        generation: null,
        bare_tool_or_kit: "bare_tool",
        image_url: null,
        image_alt: null,
        image_source_url: null,
        aliases: ["290420"],
        search_text: "milwaukee 2904-20",
        updated_at: "2026-09-19T17:07:00.000Z",
      },
      confidence: 0.93,
      evidence: ["Model number 2904-20 readable on the label"],
      uncertainty: [],
    },
  ],
  needs_more_photos: false,
  photo_guidance: [],
};

async function stubScan(page: import("@playwright/test").Page, body: unknown = SCAN_RESPONSE, status = 200) {
  await page.route("**/api/identify-tool", (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }),
  );
}

test("scan flow: photo, identify, confirm, then price in the calculator", async ({ page }) => {
  await stubScan(page);
  await page.goto("/?mode=scan");

  const scan = page.getByTestId("scan-submit");
  await expect(scan).toBeVisible({ timeout: 15_000 });
  await expect(scan).toBeDisabled();

  // Primary controls are reachable and big enough for a thumb.
  for (const name of ["Take a photo with the camera", "Choose from photos"]) {
    const box = await page.getByRole("button", { name }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page
    .locator('input[type="file"]:not([capture])')
    .setInputFiles({ name: "tool.jpg", mimeType: "image/jpeg", buffer: SAMPLE_JPEG });
  await expect(page.getByAltText("Photo 1 of the tool")).toBeVisible();
  await expect(scan).toBeEnabled();

  await scan.click();
  const candidate = page.getByTestId("scan-candidate");
  await expect(candidate).toBeVisible();
  await expect(page.getByTestId("candidate-confidence")).toContainText("High match, 93%");

  await candidate.getByRole("button", { name: "Yes, this is my tool" }).click();
  const price = page.getByRole("textbox", { name: "Asking price" });
  await expect(price).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Tool" })).toHaveValue("Milwaukee 2904-20");
  await expect(page.getByTestId("scan-candidate")).toHaveCount(0);

  await price.fill("35");
  await expect(page.getByTestId("verdict")).toHaveText("Good buy");
  await expect(page.getByTestId("max-buy")).toHaveText("$40");
});

test("scan flow: an uncertain result offers no price and keeps manual search", async ({ page }) => {
  await stubScan(page, {
    ...SCAN_RESPONSE,
    match_status: "unsupported_or_uncertain",
    candidates: [],
    needs_more_photos: true,
    photo_guidance: ["Photograph the model-number label"],
  });
  await page.goto("/?mode=scan");
  await page
    .locator('input[type="file"]:not([capture])')
    .setInputFiles({ name: "tool.jpg", mimeType: "image/jpeg", buffer: SAMPLE_JPEG });
  await page.getByTestId("scan-submit").click();

  await expect(page.getByRole("heading", { name: "No confident match" })).toBeVisible();
  await expect(page.getByText("Photograph the model-number label")).toBeVisible();
  await expect(page.getByTestId("verdict")).toHaveCount(0);

  await page.getByRole("button", { name: "Search manually" }).click();
  await expect(page.getByRole("combobox", { name: "Tool" })).toBeFocused();
});

test("scan flow: a provider failure keeps the photo and allows a retry", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/identify-tool", (route) => {
    calls += 1;
    if (calls === 1) {
      return route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "provider_unavailable", message: "The scanner is busy. Try again in a moment.", retryable: true }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SCAN_RESPONSE) });
  });
  await page.goto("/?mode=scan");
  await page
    .locator('input[type="file"]:not([capture])')
    .setInputFiles({ name: "tool.jpg", mimeType: "image/jpeg", buffer: SAMPLE_JPEG });
  await page.getByTestId("scan-submit").click();

  await expect(page.getByRole("alert")).toContainText("The scanner is busy");
  await expect(page.getByAltText("Photo 1 of the tool")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByTestId("scan-candidate")).toBeVisible();
  expect(calls).toBe(2);
});
