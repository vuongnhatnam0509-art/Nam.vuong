/** Public identity mappings (name/IMO → MMSI). Positions still come from AISStream. */

export type KnownVessel = { name: string; imo?: string | null; mmsi: string };

export const KNOWN_VESSELS: KnownVessel[] = [
  { name: "EVER GIVEN", imo: "9811000", mmsi: "353136000" },
  { name: "MAERSK ESSEN", imo: "9456783", mmsi: "219210000" },
  { name: "CMA CGM MARCO POLO", imo: "9454436", mmsi: "311000923" },
  { name: "OOCL HONG KONG", imo: "9776171", mmsi: "477333500" },
  { name: "MSC GULSUN", imo: "9839430", mmsi: "372003000" },
];

export function normalizeVesselKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/^IMO\s*/, "")
    .replace(/\b(M\/V|MV|MT|MS|SS)\b/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function lookupMmsi(query: string, catalog: KnownVessel[] = KNOWN_VESSELS): string | undefined {
  const compact = query.trim().toUpperCase().replace(/\s+/g, " ").replace(/^IMO\s*/, "");
  const digits = compact.replace(/\s+/g, "");
  if (/^\d{9}$/.test(digits)) return digits;

  const imoHit = catalog.find((row) => row.imo && row.imo === digits);
  if (imoHit) return imoHit.mmsi;

  const exact = catalog.find((row) => row.name.toUpperCase() === compact);
  if (exact) return exact.mmsi;

  const key = normalizeVesselKey(query);
  if (key.length < 7) return undefined;
  const matches = catalog.filter((row) => {
    const nameKey = normalizeVesselKey(row.name);
    return nameKey === key || (key.length >= 8 && (nameKey.startsWith(key) || key.startsWith(nameKey)));
  });
  const unique = [...new Set(matches.map((row) => row.mmsi))];
  return unique.length === 1 ? unique[0] : undefined;
}

export function knownMmsi(query: string): string | undefined {
  return lookupMmsi(query);
}

export function knownVesselLabel(query: string, catalog: KnownVessel[] = KNOWN_VESSELS): string | undefined {
  const mmsi = lookupMmsi(query, catalog);
  if (!mmsi) return undefined;
  return catalog.find((row) => row.mmsi === mmsi)?.name;
}

export function suggestVessels(query: string, catalog: KnownVessel[] = KNOWN_VESSELS, limit = 8): KnownVessel[] {
  const key = normalizeVesselKey(query);
  if (key.length < 2) {
    const seen = new Set<string>();
    return catalog.filter((row) => {
      if (seen.has(row.mmsi)) return false;
      seen.add(row.mmsi);
      return true;
    }).slice(0, limit);
  }
  const scored = catalog
    .map((row) => {
      const nameKey = normalizeVesselKey(row.name);
      let score = 0;
      if (row.mmsi === query.trim() || row.imo === query.trim()) score = 100;
      else if (nameKey === key) score = 90;
      else if (nameKey.startsWith(key)) score = 70;
      else if (nameKey.includes(key)) score = 40;
      return { row, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name));

  const seen = new Set<string>();
  const out: KnownVessel[] = [];
  for (const item of scored) {
    if (seen.has(item.row.mmsi + item.row.name)) continue;
    seen.add(item.row.mmsi + item.row.name);
    out.push(item.row);
    if (out.length >= limit) break;
  }
  return out;
}
