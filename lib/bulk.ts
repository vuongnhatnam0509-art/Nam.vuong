import { detectQuery } from "./detect";
import { isContainerNumberShape, normalizeContainerNumber } from "./iso6346";

const LIMIT = 40;

function pushUnique(out: string[], seen: Set<string>, value: string, limit = LIMIT) {
  const key = value.trim().toUpperCase();
  if (!key || seen.has(key) || out.length >= limit) return;
  seen.add(key);
  out.push(key);
}

export function parseBulkQueries(text: string, limit = LIMIT): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const upper = text.toUpperCase();

  for (const match of upper.match(/[A-Z]{3}[UJZ]\d{7}/g) ?? []) {
    pushUnique(found, seen, normalizeContainerNumber(match), limit);
  }
  for (const match of upper.match(/\b\d{9}\b/g) ?? []) {
    pushUnique(found, seen, match, limit);
  }

  for (const rawLine of text.split(/[\n\r]+/)) {
    const cells = rawLine.split(/[,;\t]/).map((cell) => cell.trim().replace(/^["']|["']$/g, ""));
    for (const cell of cells) {
      if (!cell || cell.length < 4) continue;
      if (isContainerNumberShape(cell)) {
        pushUnique(found, seen, normalizeContainerNumber(cell), limit);
        continue;
      }
      const detected = detectQuery(cell);
      if (detected.kind !== "unknown") {
        pushUnique(found, seen, detected.normalized, limit);
      }
    }
  }

  return found;
}
