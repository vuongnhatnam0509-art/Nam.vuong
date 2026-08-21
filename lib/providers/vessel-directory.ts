import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isMmsiNumber } from "../detect";
import {
  KNOWN_VESSELS,
  lookupMmsi,
  suggestVessels,
  type KnownVessel,
} from "./known-mmsi";

const FILE = path.join(process.cwd(), "data", "vessel-aliases.json");

async function readAliases(): Promise<KnownVessel[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as { items?: KnownVessel[] };
    return Array.isArray(parsed.items) ? parsed.items.filter((row) => row?.name && row?.mmsi) : [];
  } catch {
    return [];
  }
}

async function writeAliases(items: KnownVessel[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify({ items: items.slice(0, 500) }, null, 2));
}

export async function vesselCatalog(): Promise<KnownVessel[]> {
  const aliases = await readAliases();
  const seen = new Set<string>();
  const merged: KnownVessel[] = [];
  for (const row of [...aliases, ...KNOWN_VESSELS]) {
    const key = `${row.mmsi}:${row.name.toUpperCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      name: row.name.trim().toUpperCase(),
      imo: row.imo || null,
      mmsi: row.mmsi,
    });
  }
  return merged;
}

export async function resolveMmsi(query: string): Promise<string | undefined> {
  return lookupMmsi(query, await vesselCatalog());
}

export async function rememberVessel(input: { name?: string | null; imo?: string | null; mmsi?: string | null }) {
  const mmsi = input.mmsi?.trim();
  const name = input.name?.trim().toUpperCase().replace(/\s+/g, " ");
  if (!mmsi || !isMmsiNumber(mmsi) || !name || name.length < 3 || name.startsWith("MMSI ")) return;
  const aliases = await readAliases();
  const next: KnownVessel = { name, imo: input.imo?.trim() || null, mmsi };
  const items = [next, ...aliases.filter((row) => row.name !== name)].slice(0, 500);
  await writeAliases(items);
}

export async function searchVesselDirectory(query: string): Promise<KnownVessel[]> {
  return suggestVessels(query, await vesselCatalog());
}
