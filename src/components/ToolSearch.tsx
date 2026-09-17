import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { ToolGroup } from "../types/catalog";
import { searchTools } from "../lib/search";
import { selectionLabel, shortBrand } from "../lib/catalog";
import { UNSUPPORTED_MESSAGE } from "../lib/constants";

interface ToolSearchProps {
  groups: ToolGroup[];
  query: string;
  onQueryChange: (query: string) => void;
  selected: ToolGroup | null;
  onSelect: (group: ToolGroup | null) => void;
}

export function ToolSearch({ groups, query, onQueryChange, selected, onSelect }: ToolSearchProps) {
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const showingSelection = selected !== null && query === selectionLabel(selected);
  const results = useMemo(
    () => (showingSelection ? [] : searchTools(groups, query)),
    [groups, query, showingSelection],
  );
  const noMatch = !showingSelection && query.trim().length >= 2 && results.length === 0;
  const expanded = open && results.length > 0;
  const brands = useMemo(() => [...new Set(groups.map((g) => shortBrand(g.brand)))].join(" and "), [groups]);

  function choose(group: ToolGroup) {
    onSelect(group);
    onQueryChange(selectionLabel(group));
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Home" && expanded) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && expanded) {
      e.preventDefault();
      setActive(results.length - 1);
    } else if (e.key === "Enter") {
      if (expanded && results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === "Escape") {
      if (expanded) {
        e.preventDefault();
        setOpen(false);
      } else if (query) {
        onQueryChange(selected ? selectionLabel(selected) : "");
      }
    }
  }

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="block font-display text-lg font-semibold">
        Tool
      </label>
      <div className="relative mt-1">
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? `${id}-opt-${active}` : undefined}
          aria-describedby={hintId}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          placeholder="Brand, model, or tool type"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            if (!showingSelection) setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className={`min-h-13 w-full rounded-md border-2 border-line-strong bg-surface py-2.5 pl-3 ${query ? "pr-20" : "pr-3"} text-lg text-ink placeholder:text-muted focus:border-focus focus:outline-none`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onQueryChange("");
              onSelect(null);
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 top-1/2 min-h-10 -translate-y-1/2 rounded px-3 text-sm font-medium text-muted hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label="Matching tools"
        hidden={!expanded}
        className="absolute left-0 right-0 z-20 mt-1 max-h-[22rem] overflow-y-auto rounded-md border border-line-strong bg-surface py-1 shadow-lg"
      >
        {results.map((group, i) => (
          <li
            key={group.model_id}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onMouseMove={() => setActive(i)}
            onClick={() => choose(group)}
            className={`cursor-pointer border-l-4 px-3 py-2.5 ${
              i === active ? "border-focus bg-sunk" : "border-transparent"
            }`}
          >
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-lg font-bold">{group.model_number}</span>
              <span className="text-sm text-muted">{shortBrand(group.brand)}</span>
            </span>
            <span className="block text-[0.95rem] leading-snug">{group.tool_name}</span>
            <span className="block text-sm text-muted">
              {group.category}
              {Object.keys(group.rows).length < 2 && `, ${Object.keys(group.rows).map((c) => (c === "ebay" ? "eBay" : "Local"))[0]} only`}
            </span>
          </li>
        ))}
      </ul>

      <div id={hintId} aria-live="polite">
        {noMatch ? (
          <div className="mt-2 rounded-md border border-line bg-sunk p-3">
            <p className="font-medium">{UNSUPPORTED_MESSAGE}</p>
            <p className="mt-0.5 text-sm text-muted">No estimate is shown for tools we haven't verified.</p>
            <button
              type="button"
              aria-disabled="true"
              title="Model requests aren't open yet"
              onClick={(e) => e.preventDefault()}
              className="mt-2 min-h-11 cursor-not-allowed rounded-md border border-line-strong px-3 text-sm font-medium text-muted"
            >
              Request this model
            </button>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">
            {groups.length} models from {brands}. Bare tools, batteries, and chargers.
          </p>
        )}
      </div>
    </div>
  );
}
