import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { sampleRows } from "./fixtures";
import { makeAiOutput, scanCatalog, TINY_JPEG_DATA_URL } from "./scanFixtures";
import type { IdentifyToolResponse } from "../types/scan";

const load = vi.fn();
vi.mock("@catalog-source", () => ({
  configResult: { ok: true },
  catalogSource: { info: { kind: "live", label: "Live catalog" }, load: () => load() },
}));

// The browser resize/encode path needs canvas, which jsdom lacks; the pure
// parts of that module are covered in images.test.ts.
const prepare = vi.fn();
vi.mock("../lib/scan/images", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/scan/images")>();
  return { ...actual, prepareScanPhoto: (file: File) => prepare(file) };
});

const { default: App } = await import("../App");

function photoFile(name = "tool.jpg") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/jpeg" });
}

function preparedPhoto(id: string) {
  return {
    id,
    dataUrl: TINY_JPEG_DATA_URL,
    previewUrl: `blob:${id}`,
    fileName: `${id}.jpg`,
    width: 1280,
    height: 960,
    bytes: 1200,
    mimeType: "image/jpeg",
  };
}

function response(overrides: Partial<IdentifyToolResponse> = {}): IdentifyToolResponse {
  const ai = makeAiOutput();
  return {
    request_id: "req-1",
    match_status: "candidates",
    observations: ai.observations,
    candidates: [
      { model: scanCatalog[0], confidence: 0.93, evidence: ["Model number 2904-20 visible on the label"], uncertainty: [] },
    ],
    needs_more_photos: false,
    photo_guidance: [],
    ...overrides,
  };
}

function mockFetch(body: unknown, init: { status?: number } = {}) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function openScan(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("tab", { name: "Scan Tool" }));
}

async function addPhoto(user: ReturnType<typeof userEvent.setup>, id = "p1", label = /Choose from photos/) {
  prepare.mockResolvedValueOnce(preparedPhoto(id));
  const input = screen.getByRole("button", { name: label }) as HTMLButtonElement;
  const fileInput = input.parentElement?.parentElement?.querySelector<HTMLInputElement>('input[type="file"]:not([capture])');
  await user.upload(fileInput as HTMLInputElement, photoFile(`${id}.jpg`));
}

describe("Scan Tool", () => {
  beforeEach(() => {
    load.mockReset().mockResolvedValue(sampleRows);
    prepare.mockReset();
    vi.unstubAllGlobals();
  });

  it("offers camera and library controls with accessible names", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    expect(screen.getByRole("button", { name: "Take a photo with the camera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Choose from photos/ })).toBeInTheDocument();
    const camera = document.querySelector('input[type="file"][capture="environment"]');
    expect(camera).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    expect(screen.getByTestId("scan-submit")).toBeDisabled();
    expect(
      screen.getByText("Photos are analyzed for this scan and are not saved to your account or catalog."),
    ).toBeInTheDocument();
  });

  it("identifies a tool and hands the confirmed model to the calculator", async () => {
    const fetchMock = mockFetch(response());
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    await addPhoto(user);
    expect(await screen.findByAltText("Photo 1 of the tool")).toBeInTheDocument();

    await user.click(screen.getByTestId("scan-submit"));
    expect(await screen.findByTestId("scan-candidate")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/identify-tool");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body)).images).toEqual([TINY_JPEG_DATA_URL]);

    const card = screen.getByTestId("scan-candidate");
    expect(within(card).getByText("2904-20")).toBeInTheDocument();
    expect(within(card).getByTestId("candidate-confidence")).toHaveTextContent("High match, 93%");
    expect(within(card).getByText(/Model number 2904-20 visible/)).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "Yes, this is my tool" }));

    // Transferred into the existing calculator, price focused, no scan photos left.
    const price = await screen.findByRole("textbox", { name: "Asking price" });
    await waitFor(() => expect(price).toHaveFocus());
    expect(screen.getByRole("combobox", { name: "Tool" })).toHaveValue("Milwaukee 2904-20");
    expect(screen.queryByTestId("scan-candidate")).not.toBeInTheDocument();

    await user.type(price, "35");
    expect(screen.getByTestId("verdict")).toHaveTextContent("Good buy");
    expect(screen.getByTestId("max-buy")).toHaveTextContent("$40");
  });

  it("keeps the Local or eBay choice through a confirmed scan", async () => {
    mockFetch(response());
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("radio", { name: /eBay/ }));
    await openScan(user);
    await addPhoto(user);
    await user.click(screen.getByTestId("scan-submit"));
    await user.click(await screen.findByRole("button", { name: "Yes, this is my tool" }));
    expect(screen.getByRole("radio", { name: /eBay/ })).toBeChecked();
    await user.type(screen.getByRole("textbox", { name: "Asking price" }), "35");
    expect(screen.getByTestId("expected-resale")).toHaveTextContent("$97.47");
  });

  it("shows a ranked choice without highlighting when confidence is moderate", async () => {
    mockFetch(
      response({
        candidates: [
          { model: scanCatalog[0], confidence: 0.72, evidence: ["M18 badge"], uncertainty: ["Label not readable"] },
          { model: scanCatalog[1], confidence: 0.64, evidence: ["Yellow body"], uncertainty: ["Model number hidden"] },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    await addPhoto(user);
    await user.click(screen.getByTestId("scan-submit"));
    expect(await screen.findByRole("heading", { name: "Which one is it?" })).toBeInTheDocument();
    expect(screen.getAllByTestId("scan-candidate")).toHaveLength(2);
    expect(screen.getAllByTestId("candidate-confidence")[0]).toHaveTextContent("Possible match, 72%");
    expect(screen.getAllByText("Not confirmed")).toHaveLength(2);
  });

  it("gives no valuation when nothing matches, and offers manual search", async () => {
    mockFetch(
      response({
        match_status: "unsupported_or_uncertain",
        candidates: [],
        needs_more_photos: true,
        photo_guidance: ["Photograph the silver model-number sticker"],
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    await addPhoto(user);
    await user.click(screen.getByTestId("scan-submit"));
    expect(await screen.findByRole("heading", { name: "No confident match" })).toBeInTheDocument();
    expect(screen.getByText(/no price is estimated/)).toBeInTheDocument();
    expect(screen.getByText("Photograph the silver model-number sticker")).toBeInTheDocument();
    expect(screen.queryByTestId("scan-candidate")).not.toBeInTheDocument();
    expect(screen.queryByTestId("verdict")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Search manually" }));
    const box = await screen.findByRole("combobox", { name: "Tool" });
    await waitFor(() => expect(box).toHaveFocus());
  });

  it("drops a low-confidence candidate rather than suggesting it", async () => {
    mockFetch(
      response({
        candidates: [{ model: scanCatalog[0], confidence: 0.35, evidence: ["Red plastic"], uncertainty: ["No label"] }],
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    await addPhoto(user);
    await user.click(screen.getByTestId("scan-submit"));
    expect(await screen.findByRole("heading", { name: "No confident match" })).toBeInTheDocument();
    expect(screen.queryByTestId("scan-candidate")).not.toBeInTheDocument();
  });

  it("keeps the photos after a retryable failure and retries once asked", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "provider_unavailable", message: "The scanner is busy. Try again in a moment.", retryable: true }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(response()), { status: 200, headers: { "Content-Type": "application/json" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    await addPhoto(user);
    await user.click(screen.getByTestId("scan-submit"));

    expect(await screen.findByRole("alert")).toHaveTextContent("The scanner is busy");
    expect(screen.getByAltText("Photo 1 of the tool")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByTestId("scan-candidate")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a request the server rejected as invalid", async () => {
    mockFetch({ error: "too_many_images", message: "Send at most 3 photos.", retryable: false }, { status: 400 });
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    await addPhoto(user);
    await user.click(screen.getByTestId("scan-submit"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Send at most 3 photos.");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("removes a photo, clears stale results, and stops at three photos", async () => {
    mockFetch(response());
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    await addPhoto(user, "p1");
    await addPhoto(user, "p2");
    await addPhoto(user, "p3");
    expect(await screen.findByAltText("Photo 3 of the tool")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take a photo with the camera" })).toBeDisabled();
    expect(screen.getByText(/Remove one to swap it out/)).toBeInTheDocument();

    await user.click(screen.getByTestId("scan-submit"));
    expect(await screen.findByTestId("scan-candidate")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove photo 2" }));
    expect(screen.queryByAltText("Photo 3 of the tool")).not.toBeInTheDocument();
    expect(screen.queryByTestId("scan-candidate")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take a photo with the camera" })).toBeEnabled();
  });

  it("clears everything when the user says none of these", async () => {
    mockFetch(response());
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    await addPhoto(user);
    await user.click(screen.getByTestId("scan-submit"));
    await user.click(await screen.findByRole("button", { name: "None of these" }));
    expect(screen.queryByTestId("scan-candidate")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Photo 1 of the tool")).not.toBeInTheDocument();
    expect(screen.getByTestId("scan-submit")).toBeDisabled();
  });

  it("reports an unusable photo without sending it", async () => {
    const fetchMock = mockFetch(response());
    const { PhotoPrepareError } = await import("../lib/scan/images");
    prepare.mockRejectedValueOnce(
      new PhotoPrepareError({ code: "decode_failed", message: "That photo couldn't be read. Try again." }),
    );
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]:not([capture])');
    await user.upload(fileInput as HTMLInputElement, photoFile("broken.jpg"));
    expect(await screen.findByRole("alert")).toHaveTextContent("That photo couldn't be read.");
    expect(screen.getByTestId("scan-submit")).toBeDisabled();
    expect(screen.queryByAltText("Photo 1 of the tool")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only accepts the supported image types at the file input", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    for (const input of document.querySelectorAll('input[type="file"]')) {
      expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    }
    expect(prepare).not.toHaveBeenCalled();
  });

  it("disables scanning when the build has no scan endpoint", async () => {
    vi.resetModules();
    vi.doMock("@catalog-source", () => ({
      configResult: { ok: true },
      catalogSource: { info: { kind: "snapshot", label: "Preview data" }, load: () => load() },
    }));
    const { default: PreviewApp } = await import("../App");
    const user = userEvent.setup();
    render(<PreviewApp />);
    await openScan(user);
    expect(screen.getByText(/This preview can't reach the scanner/)).toBeInTheDocument();
    expect(screen.getByTestId("scan-submit")).toBeDisabled();
    vi.doUnmock("@catalog-source");
    vi.resetModules();
  });

  it("switches modes through the URL and keeps manual search available", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openScan(user);
    await waitFor(() => expect(window.location.search).toContain("mode=scan"));
    await user.click(screen.getByRole("tab", { name: "Calculator" }));
    expect(await screen.findByRole("combobox", { name: "Tool" })).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).not.toContain("mode=scan"));
  });
});
