import { expect, test } from "@playwright/test";

// Runs only against a deployed Netlify target, where the Function exists:
//   PLAYWRIGHT_BASE_URL=https://deploy-preview-N--your-site.netlify.app npm run test:e2e
// It never sends photos, so no AI request is made and no credits are spent.
test.describe("identify-tool endpoint", () => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL,
    "Needs a deployed target: set PLAYWRIGHT_BASE_URL to a Netlify deploy preview.",
  );

  test("is served by the function, not the SPA fallback", async ({ request, baseURL }) => {
    const wrongMethod = await request.get(`${baseURL}/api/identify-tool`);
    expect(wrongMethod.status()).toBe(405);
    expect(wrongMethod.headers()["content-type"]).toContain("application/json");
    expect(await wrongMethod.text()).not.toContain("<!doctype html");
  });

  test("rejects a malformed request with JSON, uncached", async ({ request, baseURL }) => {
    const badBody = await request.post(`${baseURL}/api/identify-tool`, {
      data: { images: [] },
      headers: { "Content-Type": "application/json" },
    });
    expect(badBody.status()).toBe(400);
    expect((await badBody.json()).error).toBe("no_images");
    expect(badBody.headers()["cache-control"]).toContain("no-store");
  });

  test("rejects a non-image payload", async ({ request, baseURL }) => {
    const badImage = await request.post(`${baseURL}/api/identify-tool`, {
      data: { images: ["https://example.com/tool.jpg"] },
      headers: { "Content-Type": "application/json" },
    });
    expect(badImage.status()).toBe(400);
    expect((await badImage.json()).error).toBe("invalid_image");
  });
});
