import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WatchItem } from "./types";

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

export async function listWatch(): Promise<WatchItem[]> {
  return (await readStore()).items;
}

export async function addWatch(item: Omit<WatchItem, "id" | "watchedAt"> & { id?: string }): Promise<WatchItem[]> {
  const store = await readStore();
  const query = item.query.trim().toUpperCase();
  const next: WatchItem = {
    ...item,
    id: item.id || `${query}-${Date.now()}`,
    query,
    watchedAt: new Date().toISOString(),
    refreshedAt: item.refreshedAt ?? new Date().toISOString(),
  };
  store.items = [next, ...store.items.filter((row) => row.query !== query)].slice(0, 200);
  await writeStore(store);
  return store.items;
}

export async function removeWatch(id: string): Promise<WatchItem[]> {
  const store = await readStore();
  store.items = store.items.filter((row) => row.id !== id);
  await writeStore(store);
  return store.items;
}
