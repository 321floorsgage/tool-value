import { useId } from "react";
import type { SalesChannel } from "../types/catalog";
import { CHANNEL_LABEL } from "../lib/constants";

interface ChannelToggleProps {
  value: SalesChannel;
  onChange: (channel: SalesChannel) => void;
}

const HINT: Record<SalesChannel, string> = {
  local: "Cash, no fees",
  ebay: "Fees and shipping",
};

export function ChannelToggle({ value, onChange }: ChannelToggleProps) {
  const name = useId();
  return (
    <fieldset>
      <legend className="font-display text-lg font-semibold">Resell it</legend>
      <div className="mt-1 grid grid-cols-2 gap-0 rounded-md border-2 border-line-strong bg-sunk p-1">
        {(["local", "ebay"] as const).map((channel) => {
          const checked = value === channel;
          return (
            <label
              key={channel}
              className={`relative flex min-h-12 cursor-pointer flex-col items-center justify-center rounded px-2 py-1 text-center has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus ${
                checked ? "bg-ink text-bg shadow-sm" : "text-ink hover:bg-surface"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={channel}
                checked={checked}
                onChange={() => onChange(channel)}
                className="sr-only"
              />
              <span className="font-display text-lg font-bold leading-tight">{CHANNEL_LABEL[channel]}</span>
              <span className={`text-xs leading-tight ${checked ? "opacity-85" : "text-muted"}`}>{HINT[channel]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
