import type { ToolGroup } from "../types/catalog";

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

interface Indexed {
  group: ToolGroup;
  model: string;
  brandWords: string[];
  nameWords: string[];
  categoryWords: string[];
  allWords: string[];
  haystack: string;
}

function index(group: ToolGroup): Indexed {
  const brandWords = words(group.brand);
  const nameWords = words(group.tool_name);
  const categoryWords = words(group.category);
  const allWords = [...brandWords, ...words(group.model_number), ...nameWords, ...categoryWords, ...words(group.item_kind)];
  return {
    group,
    model: compact(group.model_number),
    brandWords,
    nameWords,
    categoryWords,
    allWords,
    haystack: compact([group.brand, group.model_number, group.tool_name, group.category, group.item_kind].join(" ")),
  };
}

/** Score one query token against a tool; 0 means no match. */
function scoreToken(token: string, item: Indexed): number {
  const t = compact(token);
  if (!t) return 1;
  if (item.model === t) return 100;
  if (item.model.startsWith(t)) return 60;
  if (t.length >= 3 && item.model.includes(t)) return 45;
  if (item.brandWords.some((w) => w.startsWith(t))) return 30;
  if (item.categoryWords.some((w) => w.startsWith(t) || (t.length >= 4 && t.startsWith(w.replace(/s$/, ""))))) return 25;
  if (item.nameWords.some((w) => w.startsWith(t))) return 20;
  if (t.length >= 3 && item.haystack.includes(t)) return 10;
  // Light typo tolerance: "milwakee", "grinderr", "sawzal"
  if (t.length >= 4 && item.allWords.some((w) => w.length >= 4 && withinOneEdit(t, w))) return 6;
  return 0;
}

/**
 * Client-side fuzzy search across brand, model number, tool name, and
 * category. Every query token must match; results are ranked by score.
 */
export function searchTools(groups: ToolGroup[], query: string, limit = 8): ToolGroup[] {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const whole = compact(query);
  const results: { group: ToolGroup; score: number }[] = [];

  for (const group of groups) {
    const item = index(group);
    // Model numbers are often typed with or without separators or spaces ("2904 20").
    if (whole.length >= 3 && item.model.startsWith(whole)) {
      results.push({ group, score: item.model === whole ? 200 : 150 });
      continue;
    }
    let total = 0;
    let matchedAll = true;
    for (const token of tokens) {
      const s = scoreToken(token, item);
      if (s === 0) {
        matchedAll = false;
        break;
      }
      total += s;
    }
    if (matchedAll) results.push({ group, score: total });
  }

  return results
    .sort((a, b) => b.score - a.score || a.group.model_number.localeCompare(b.group.model_number))
    .slice(0, limit)
    .map((r) => r.group);
}
