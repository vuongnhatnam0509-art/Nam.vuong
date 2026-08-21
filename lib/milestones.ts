export type MilestoneKey = "gate_in" | "loaded" | "departed" | "arrived" | "discharged";

export type Milestone = {
  key: MilestoneKey;
  label: string;
  time: string | null;
  location: string | null;
  isActual: boolean;
};

const RULES: { key: MilestoneKey; label: string; match: RegExp }[] = [
  { key: "gate_in", label: "Gate in", match: /gate in|gtin|cgi|picked-up|empty picked|full in/i },
  { key: "loaded", label: "Loaded", match: /loaded|load on|cll|\bload\b/i },
  { key: "departed", label: "Rời cảng (ETD/ATD)", match: /depart|sailed|vdl|atd|vessel departure/i },
  { key: "arrived", label: "Đến cảng (ETA/ATA)", match: /arriv|vad|ata|vessel arrival/i },
  { key: "discharged", label: "Dỡ hàng", match: /discharg|unloaded|disc|gate out full|full out/i },
];

type EventLike = {
  time: string | null;
  status: string;
  location: string | null;
  isActual: boolean;
};

export function deriveMilestones(
  events: EventLike[],
  fallback?: { atd?: string | null; eta?: string | null; origin?: string | null; destination?: string | null },
): Milestone[] {
  const found = new Map<MilestoneKey, Milestone>();

  for (const event of events) {
    for (const rule of RULES) {
      if (!rule.match.test(event.status)) continue;
      const current = found.get(rule.key);
      if (!current || (event.time && (!current.time || event.time > current.time))) {
        found.set(rule.key, {
          key: rule.key,
          label: rule.label,
          time: event.time,
          location: event.location,
          isActual: event.isActual,
        });
      }
    }
  }

  if (!found.has("departed") && fallback?.atd) {
    found.set("departed", {
      key: "departed",
      label: "Rời cảng (ETD/ATD)",
      time: fallback.atd,
      location: fallback.origin ?? null,
      isActual: true,
    });
  }
  if (!found.has("arrived") && fallback?.eta) {
    found.set("arrived", {
      key: "arrived",
      label: "Đến cảng (ETA/ATA)",
      time: fallback.eta,
      location: fallback.destination ?? null,
      isActual: false,
    });
  }

  return RULES.map((rule) => found.get(rule.key)).filter(Boolean) as Milestone[];
}

export function lastAndNext(events: EventLike[]): { last: EventLike | null; next: EventLike | null } {
  const actual = events.filter((event) => event.isActual && event.time);
  const planned = events.filter((event) => !event.isActual && event.time);
  return {
    last: actual.at(-1) ?? null,
    next: planned[0] ?? null,
  };
}
