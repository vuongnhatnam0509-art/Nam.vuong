/** Public identity mappings (name/IMO → MMSI). Positions still come from AISStream. */

export type KnownVessel = { name: string; imo: string; mmsi: string };

export const KNOWN_VESSELS: KnownVessel[] = [
  { name: "EVER GIVEN", imo: "9811000", mmsi: "353136000" },
  { name: "MAERSK ESSEN", imo: "9456783", mmsi: "219210000" },
  { name: "CMA CGM MARCO POLO", imo: "9454436", mmsi: "311000923" },
  { name: "OOCL HONG KONG", imo: "9776171", mmsi: "477333500" },
];

export function normalizeVesselKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/^IMO\s*/, "")
    .replace(/\b(M\/V|MV|MT|MS|SS)\b/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function knownMmsi(query: string): string | undefined {
  const compact = query.trim().toUpperCase().replace(/\s+/g, " ").replace(/^IMO\s*/, "");
  const digits = compact.replace(/\s+/g, "");
  if (/^\d{9}$/.test(digits)) return digits;

  const imoHit = KNOWN_VESSELS.find((row) => row.imo === digits);
  if (imoHit) return imoHit.mmsi;

  const exact = KNOWN_VESSELS.find((row) => row.name === compact);
  if (exact) return exact.mmsi;

  const key = normalizeVesselKey(query);
  if (key.length < 7) return undefined;
  const matches = KNOWN_VESSELS.filter((row) => {
    const nameKey = normalizeVesselKey(row.name);
    return nameKey === key || (key.length >= 8 && (nameKey.startsWith(key) || key.startsWith(nameKey)));
  });
  return matches.length === 1 ? matches[0].mmsi : undefined;
}

export function knownVesselLabel(query: string): string | undefined {
  const mmsi = knownMmsi(query);
  if (!mmsi) return undefined;
  return KNOWN_VESSELS.find((row) => row.mmsi === mmsi)?.name;
}
