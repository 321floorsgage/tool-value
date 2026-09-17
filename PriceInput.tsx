import { useId } from "react";
import type { PriceParseResult } from "../lib/price";
import { sanitizePriceKeystrokes } from "../lib/price";

interface PriceInputProps {
  value: string;
  parsed: PriceParseResult;
  onChange: (value: string) => void;
}

export function PriceInput({ value, parsed, onChange }: PriceInputProps) {
  const id = useId();
  const invalid = parsed.status === "invalid";
  return (
    <div>
      <label htmlFor={id} className="block font-display text-lg font-semibold">
        Asking price
      </label>
      <div className="relative mt-1">
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-muted">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="35"
          value={value}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(e) => onChange(sanitizePriceKeystrokes(e.target.value))}
          className={`num min-h-13 w-full rounded-md border-2 bg-surface py-2 pl-7 pr-3 text-2xl font-semibold text-ink placeholder:font-normal placeholder:text-muted/70 focus:outline-none ${
            invalid ? "border-loss" : "border-line-strong focus:border-focus"
          }`}
        />
      </div>
      {invalid && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-medium text-loss">
          {parsed.message}
        </p>
      )}
    </div>
  );
}
