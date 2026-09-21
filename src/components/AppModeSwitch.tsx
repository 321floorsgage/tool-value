import type { AppMode } from "../lib/urlState";

interface AppModeSwitchProps {
  value: AppMode;
  onChange: (mode: AppMode) => void;
}

const MODES: { id: AppMode; label: string }[] = [
  { id: "calculator", label: "Calculator" },
  { id: "scan", label: "Scan Tool" },
];

/** Two-option switch between typing a model and photographing one. */
export function AppModeSwitch({ value, onChange }: AppModeSwitchProps) {
  return (
    <div
      role="tablist"
      aria-label="How to find a tool"
      className="grid grid-cols-2 gap-1 rounded-md border-2 border-line-strong bg-sunk p-1 sm:w-auto sm:grid-flow-col sm:grid-cols-none"
    >
      {MODES.map((mode) => {
        const selected = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(mode.id)}
            className={`min-h-11 rounded px-4 font-display text-lg font-bold sm:min-w-32 ${
              selected ? "bg-ink text-bg shadow-sm" : "text-ink hover:bg-surface"
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
