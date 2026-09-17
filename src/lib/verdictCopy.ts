import type { Verdict } from "./calculations";
import { formatMoney } from "./format";

export interface VerdictCopy {
  title: string;
  action: string;
}

export const VERDICT_TITLE: Record<Verdict, string> = {
  great_buy: "Great buy",
  good_buy: "Good buy",
  negotiate: "Negotiate",
  pass: "Pass",
  bundle_skip: "Bundle or skip",
};

export function verdictCopy(verdict: Verdict, maxBuy: number, target: number): VerdictCopy {
  const t = formatMoney(target);
  switch (verdict) {
    case "great_buy":
      return {
        title: VERDICT_TITLE.great_buy,
        action: `Buy it after you test it. This clears your ${t} target even at the fast-sale price.`,
      };
    case "good_buy":
      return {
        title: VERDICT_TITLE.good_buy,
        action: `Buy it if the condition matches. This clears your ${t} target at the expected resale.`,
      };
    case "negotiate":
      return {
        title: VERDICT_TITLE.negotiate,
        action: `Close. Offer ${formatMoney(maxBuy)} or less and it clears your ${t} target.`,
      };
    case "pass":
      return {
        title: VERDICT_TITLE.pass,
        action: `Too high for a ${t} flip. The most you'd want to pay is ${formatMoney(maxBuy)}.`,
      };
    case "bundle_skip":
      return {
        title: VERDICT_TITLE.bundle_skip,
        action: `On its own this can't reliably clear ${t}. Only pick it up extremely cheap or as part of a profitable lot.`,
      };
  }
}

/** Reminder shown with every positive recommendation (handoff section 9). */
export function verificationChecklist(itemKind: string): string[] {
  const kind = itemKind.toLowerCase();
  if (kind === "battery") {
    return [
      "Model number on the label matches",
      "Battery charges, holds charge, and shows healthy fuel-gauge bars",
      "No swelling, cracks, or corroded contacts",
    ];
  }
  if (kind === "charger") {
    return [
      "Model number on the label matches",
      "It charges a known-good battery",
      "Cord, housing, and contacts are undamaged",
    ];
  }
  return [
    "Model number on the tool matches (bare tool, no extras assumed)",
    "It runs: trigger, speeds, clutch, and brake work",
    "If a battery comes with it, test its health",
    "Condition is ordinary used: no cracks, burning smell, or missing parts",
  ];
}
