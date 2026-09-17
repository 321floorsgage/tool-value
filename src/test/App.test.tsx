import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { sampleRows } from "./fixtures";

const load = vi.fn();

vi.mock("@catalog-source", () => ({
  configResult: { ok: true },
  catalogSource: { info: { kind: "live", label: "Live catalog" }, load: () => load() },
}));

const { default: App } = await import("../App");

async function pickTool(user: ReturnType<typeof userEvent.setup>, query: string, optionText: RegExp) {
  const box = await screen.findByRole("combobox", { name: "Tool" });
  await user.clear(box);
  await user.type(box, query);
  await user.click(await screen.findByRole("option", { name: optionText }));
}

describe("App", () => {
  beforeEach(() => {
    load.mockReset();
  });

  it("runs the critical calculator flow and keeps inputs when switching channels", async () => {
    load.mockResolvedValue(sampleRows);
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText(/Loading the price catalog/)).toBeInTheDocument();
    expect(await screen.findByText(/Pick a tool, enter the seller's price/)).toBeInTheDocument();

    await pickTool(user, "2904", /2904-20/);
    await user.type(screen.getByRole("textbox", { name: "Asking price" }), "35");

    expect(screen.getByTestId("verdict")).toHaveTextContent("Good buy");
    expect(screen.getByTestId("max-buy")).toHaveTextContent("$40");
    expect(screen.getByTestId("great-buy")).toHaveTextContent("$20");
    expect(screen.getByTestId("expected-resale")).toHaveTextContent("$89.99");
    expect(screen.getByTestId("fast-sale")).toHaveTextContent("$67.46");
    expect(screen.getByTestId("cash-profit-row")).toHaveTextContent("$54.99");
    expect(screen.getByTestId("risk-profit-row")).toHaveTextContent("$48.24");
    expect(screen.getByTestId("confidence")).toHaveTextContent("Low");
    expect(screen.getByText(/Local estimate is currently a proxy/)).toBeInTheDocument();
    expect(screen.getByText("Check before you pay")).toBeInTheDocument();

    // Switch to eBay: same tool and price, every value updates.
    await user.click(screen.getByRole("radio", { name: /eBay/ }));
    expect(screen.getByRole("textbox", { name: "Asking price" })).toHaveValue("35");
    // eBay max buy is $20, so $35 falls in the $15 negotiate band.
    expect(screen.getByTestId("verdict")).toHaveTextContent("Negotiate");
    expect(screen.getByTestId("verdict").parentElement).toHaveTextContent("Offer $20 or less");
    expect(screen.getByTestId("max-buy")).toHaveTextContent("$20");
    expect(screen.getByTestId("expected-resale")).toHaveTextContent("$97.47");
    // 97.47 - 35 - 13.66 - 12 = 36.81; - 7.31 = 29.50
    expect(screen.getByTestId("cash-profit-row")).toHaveTextContent("$36.81");
    expect(screen.getByTestId("risk-profit-row")).toHaveTextContent("$29.50");
    expect(screen.getByTestId("confidence")).toHaveTextContent("Medium");
    expect(screen.queryByText(/Local estimate is currently a proxy/)).not.toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Asking price" }));
    await user.type(screen.getByRole("textbox", { name: "Asking price" }), "36");
    expect(screen.getByTestId("verdict")).toHaveTextContent("Pass");
    expect(screen.queryByText("Check before you pay")).not.toBeInTheDocument();
  });

  it.each([
    ["20", "Great buy"],
    ["35", "Good buy"],
    ["50", "Negotiate"],
    ["60", "Pass"],
  ])("2904-20 Local at $%s shows %s", async (price, verdict) => {
    load.mockResolvedValue(sampleRows);
    const user = userEvent.setup();
    render(<App />);
    await pickTool(user, "2904-20", /2904-20/);
    await user.type(screen.getByRole("textbox", { name: "Asking price" }), price);
    expect(screen.getByTestId("verdict")).toHaveTextContent(verdict);
  });

  it("shows Bundle or skip for a $0 max buy, even before a price", async () => {
    load.mockResolvedValue(sampleRows);
    const user = userEvent.setup();
    render(<App />);
    await pickTool(user, "1850", /48-11-1850/);
    expect(screen.getByTestId("verdict")).toHaveTextContent("Bundle or skip");
    await user.type(screen.getByRole("textbox", { name: "Asking price" }), "5");
    expect(screen.getByTestId("verdict")).toHaveTextContent("Bundle or skip");
    expect(screen.getByTestId("verdict")).not.toHaveTextContent("Great buy");
  });

  it("rejects bad prices without a verdict", async () => {
    load.mockResolvedValue(sampleRows);
    const user = userEvent.setup();
    render(<App />);
    await pickTool(user, "DCN680B", /DCN680B/);
    const input = screen.getByRole("textbox", { name: "Asking price" });
    await user.type(input, "-5");
    expect(screen.getByRole("alert")).toHaveTextContent("$0 or more");
    expect(screen.queryByTestId("verdict")).not.toBeInTheDocument();
    expect(screen.getByText("Fix the asking price for a verdict")).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, "35.555");
    expect(screen.getByRole("alert")).toHaveTextContent("dollar amount");
  });

  it("gives no estimate for an unsupported model", async () => {
    load.mockResolvedValue(sampleRows);
    const user = userEvent.setup();
    render(<App />);
    const box = await screen.findByRole("combobox", { name: "Tool" });
    await user.type(box, "makita xdt13");
    expect(screen.getByText("We don't have enough verified data for this model yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request this model" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByTestId("verdict")).not.toBeInTheDocument();
  });

  it("shows Insufficient data instead of a verdict when a threshold is missing", async () => {
    const rows = sampleRows.map((r) =>
      r.model_number === "DCN680B" && r.sales_channel === "local"
        ? { ...r, maximum_recommended_buy: null, estimated_fees: null }
        : r,
    );
    load.mockResolvedValue(rows);
    const user = userEvent.setup();
    render(<App />);
    await pickTool(user, "DCN680B", /DCN680B/);
    await user.type(screen.getByRole("textbox", { name: "Asking price" }), "50");
    expect(screen.getByText("Insufficient data", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByTestId("verdict")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("cash-profit-row")).getByText("Insufficient data")).toBeInTheDocument();
  });

  it("shows a retryable error and never substitutes data", async () => {
    load.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValueOnce(sampleRows);
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText("Prices didn't load")).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("combobox", { name: "Tool" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps the selection through a refresh", async () => {
    load.mockResolvedValue(sampleRows);
    const user = userEvent.setup();
    render(<App />);
    await pickTool(user, "2904", /2904-20/);
    await user.type(screen.getByRole("textbox", { name: "Asking price" }), "20");
    await user.click(screen.getByRole("button", { name: "Refresh data" }));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh data" })).toBeEnabled());
    expect(screen.getByTestId("verdict")).toHaveTextContent("Great buy");
  });

  it("supports keyboard selection in the tool search", async () => {
    load.mockResolvedValue(sampleRows);
    const user = userEvent.setup();
    render(<App />);
    const box = await screen.findByRole("combobox", { name: "Tool" });
    await user.type(box, "dewalt");
    expect(box).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Enter}");
    expect(box).toHaveValue("DEWALT DCN680B");
    expect(box).toHaveAttribute("aria-expanded", "false");
  });

  it("loads the tool, channel, and price from a direct URL", async () => {
    window.history.replaceState(null, "", "/?model=DCN680B&channel=ebay&price=80");
    vi.resetModules();
    const { default: FreshApp } = await import("../App");
    load.mockResolvedValue(sampleRows);
    render(<FreshApp />);
    expect(await screen.findByTestId("verdict")).toHaveTextContent("Negotiate");
    expect(screen.getByRole("combobox", { name: "Tool" })).toHaveValue("DEWALT DCN680B");
  });
});
