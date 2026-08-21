/** Public MMSI lookups so AISStream can be used without JSONCargo for a few well-known ships.
 * AISStream filters by MMSI only — not by vessel name or IMO.
 * Values here are identity mappings, not positions.
 */
const BY_NAME: Record<string, string> = {
  "EVER GIVEN": "353136000",
};

const BY_IMO: Record<string, string> = {
  "9811000": "353136000",
};

export function knownMmsi(query: string): string | undefined {
  const compact = query.trim().toUpperCase().replace(/\s+/g, " ").replace(/^IMO\s*/, "");
  const digits = compact.replace(/\s+/g, "");
  if (/^\d{9}$/.test(digits)) return digits;
  return BY_NAME[compact] ?? BY_IMO[digits];
}
