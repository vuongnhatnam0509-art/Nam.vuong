import type { ProviderKeys } from "./keys";
import { resolvedKeys } from "./keys";

export type Sailing = {
  carrier: string;
  scac: string;
  vessel: string;
  voyage: string;
  service?: string | null;
  origin: string;
  originLocode: string;
  destination: string;
  destinationLocode: string;
  etd: string | null;
  eta: string | null;
  transitDays: number | null;
  direct: boolean;
  updatedAt: string | null;
};

export type ScheduleResponse =
  | { ok: true; sailings: Sailing[]; source: "searates" | "demo"; liveProviders: string[] }
  | { ok: false; error: string; code: string; liveProviders: string[] };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapSailing(row: Record<string, unknown>): Sailing | null {
  const origin = asRecord(row.origin);
  const destination = asRecord(row.destination);
  const legs = Array.isArray(row.legs) ? row.legs.map(asRecord) : [];
  const firstLeg = legs[0] ?? {};
  const voyages = Array.isArray(firstLeg.voyages) ? firstLeg.voyages.map(asRecord) : [];
  return {
    carrier: str(row.carrier_name) || "Unknown",
    scac: str(row.carrier_scac) || "",
    vessel: str(firstLeg.vessel_name) || str(row.vessel_name) || "—",
    voyage: str(voyages[0]?.voyage) || str(firstLeg.voyage) || "",
    service: str(firstLeg.service_name),
    origin: str(origin.port_name) || "",
    originLocode: str(origin.port_locode) || "",
    destination: str(destination.port_name) || "",
    destinationLocode: str(destination.port_locode) || "",
    etd: str(origin.estimated_date) || str(asRecord(firstLeg.departure).estimated_date),
    eta: str(destination.estimated_date),
    transitDays: num(row.transit_time),
    direct: Boolean(row.direct),
    updatedAt: str(row.updated_at),
  };
}

export async function searchSchedules(input: {
  origin: string;
  destination: string;
  fromDate?: string;
  weeks?: number;
  carrier?: string;
  keys?: ProviderKeys;
}): Promise<ScheduleResponse> {
  const keys = resolvedKeys(input.keys);
  const liveProviders = keys.searates ? ["SeaRates"] : [];
  const origin = input.origin.trim().toUpperCase();
  const destination = input.destination.trim().toUpperCase();

  if (!/^[A-Z0-9]{5}$/.test(origin) || !/^[A-Z0-9]{5}$/.test(destination)) {
    return {
      ok: false,
      error: "Chọn cảng đi và cảng đến (UN/LOCODE 5 ký tự, ví dụ VNSGN → NLRTM).",
      code: "bad_ports",
      liveProviders,
    };
  }

  if (!keys.searates) {
    return {
      ok: false,
      error: "Lịch tàu live cần SeaRates API key (Cài đặt). Đó là nguồn lịch cập nhật như các nền tảng visibility.",
      code: "no_provider",
      liveProviders,
    };
  }

  const today = input.fromDate || new Date().toISOString().slice(0, 10);
  const url = new URL("https://schedules.searates.com/api/v2/schedules/by-points");
  url.searchParams.set("api_key", keys.searates);
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("from_date", today);
  url.searchParams.set("weeks", String(Math.min(6, Math.max(1, input.weeks ?? 4))));
  url.searchParams.set("sort", "DEP");
  url.searchParams.set("cargo_type", "GC");
  url.searchParams.set("direct_only", "false");
  url.searchParams.set("multimodal", "true");
  if (input.carrier) url.searchParams.set("carriers", input.carrier);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45000),
  });
  const body = asRecord(await response.json().catch(() => ({})));
  if (!response.ok || body.success === false) {
    return {
      ok: false,
      error: String(body.status_code || body.message || `SeaRates schedule HTTP ${response.status}`),
      code: "upstream",
      liveProviders,
    };
  }

  const data = asRecord(body.data);
  const rows = Array.isArray(data.schedules) ? data.schedules : [];
  const sailings = rows.map(asRecord).map(mapSailing).filter(Boolean) as Sailing[];

  return { ok: true, sailings, source: "searates", liveProviders };
}
