import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { trackShipment } from "./providers";
import type { ProviderKeys } from "./providers/keys";
import type { WatchItem } from "./types";
import { watchFieldsFromResult } from "./watch-from-result";

type Store = { items: WatchItem[] };

const FILE = path.join(process.cwd(), "data", "watchlist.json");

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Store;
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

async function writeStore(store: Store) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify({ items: store.items.slice(0, 200) }, null, 2));
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) || 0 }, () => worker());
  await Promise.all(workers);
  return out;
}

export async function listWatch(): Promise<WatchItem[]> {
  return (await readStore()).items;
}

export async function addWatch(item: Omit<WatchItem, "id" | "watchedAt"> & { id?: string }): Promise<WatchItem[]> {
  const store = await readStore();
  const query = item.query.trim().toUpperCase();
  const existing = store.items.find((row) => row.query === query);
  const next: WatchItem = {
    ...existing,
    ...item,
    id: existing?.id || item.id || `${query}-${Date.now()}`,
    query,
    watchedAt: existing?.watchedAt || new Date().toISOString(),
    refreshedAt: item.refreshedAt ?? new Date().toISOString(),
  };
  store.items = [next, ...store.items.filter((row) => row.query !== query)].slice(0, 200);
  await writeStore(store);
  return store.items;
}

export async function addManyWatch(
  rows: Array<Omit<WatchItem, "id" | "watchedAt"> & { id?: string }>,
): Promise<WatchItem[]> {
  let items: WatchItem[] = [];
  for (const row of rows) {
    items = await addWatch(row);
  }
  return items;
}

export async function removeWatch(id: string): Promise<WatchItem[]> {
  const store = await readStore();
  store.items = store.items.filter((row) => row.id !== id);
  await writeStore(store);
  return store.items;
}

export async function refreshWatchlist(keys?: ProviderKeys): Promise<WatchItem[]> {
  const store = await readStore();
  store.items = await mapPool(store.items, 2, async (item) => {
    const tracked = await trackShipment({
      query: item.query,
      kind: item.kind,
      carrier: item.carrier ?? undefined,
      keys,
      skipAisEnrich: item.kind !== "vessel",
    });
    if (!tracked.ok) {
      return {
        ...item,
        error: tracked.error,
        refreshedAt: new Date().toISOString(),
      };
    }
    return {
      ...item,
      ...watchFieldsFromResult(tracked.result, item),
      id: item.id,
      watchedAt: item.watchedAt,
    };
  });
  await writeStore(store);
  return store.items;
}
