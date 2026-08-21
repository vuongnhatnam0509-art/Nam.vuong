import { officialTrackingUrls } from "../carriers";
import type { Carrier, TrackingEvent, TrackingResult, VesselInfo } from "../types";

import { resolvedKeys, type ProviderKeys } from "./keys";

const BASE = "https://api.jsoncargo.com";

function apiKey(keys?: ProviderKeys): string | undefined {
  return resolvedKeys(keys).jsoncargo;
}

export function hasJsonCargo(keys?: ProviderKeys): boolean {
  return Boolean(apiKey(keys));
}

async function getJson(path: string, params?: Record<string, string | undefined>, keys?: ProviderKeys) {
  const key = apiKey(keys);
  if (!key) throw new Error("Missing JSONCARGO_API_KEY");

  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v) url.searchParams.set(k, v);
  }

  const response = await fetch(url, {
    headers: { "x-api-key": key, Accept: "application/json" },
    signal: AbortSignal.timeout(25000),
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    const title =
      typeof body === "object" && body && "title" in body
        ? String((body as { title: unknown }).title)
        : `JSONCargo HTTP ${response.status}`;
    const error = new Error(title);
    (error as Error & { status: number }).status = response.status;
    throw error;
  }

  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: unknown }).data;
  }
  return body;
}

function str(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function trackContainerJsonCargo(
  number: string,
  carrier: Carrier | null,
  keys?: ProviderKeys,
): Promise<TrackingResult> {
  const data = (await getJson(`/api/v1/containers/${encodeURIComponent(number)}`, {
    shipping_line: carrier?.jsoncargo,
  }, keys)) as Record<string, unknown>;

  const events: TrackingEvent[] = [];
  const push = (
    time: unknown,
    status: string,
    location: unknown,
    vessel?: unknown,
    voyage?: unknown,
    isActual = true,
  ) => {
    if (!time && !location) return;
    events.push({
      time: str(time),
      status,
      location: str(location),
      vessel: str(vessel),
      voyage: str(voyage),
      isActual,
    });
  };

  push(data.atd_origin, "Departed origin", data.shipped_from, data.last_vessel_name, data.last_voyage_number);
  push(data.timestamp_of_last_location, data.container_status as string || "Last location", data.last_location, data.current_vessel_name, data.current_voyage_number);
  push(data.eta_next_destination, "Next location", data.next_location, data.current_vessel_name, data.current_voyage_number, false);
  push(data.eta_final_destination, "ETA destination", data.shipped_to ?? data.discharging_port, data.current_vessel_name, data.current_voyage_number, false);

  const vessel: VesselInfo | null = data.current_vessel_name
    ? {
        name: String(data.current_vessel_name),
        voyage: str(data.current_voyage_number),
      }
    : null;

  return {
    kind: "container",
    query: number,
    source: "jsoncargo",
    carrier,
    containerNumber: str(data.container_id) ?? number,
    billOfLading: str(data.bill_of_lading),
    containerType: str(data.container_type),
    status: str(data.container_status) ?? str(data.status),
    origin: str(data.shipped_from),
    originTerminal: str(data.shipped_from_terminal),
    destination: str(data.shipped_to),
    destinationTerminal: str(data.shipped_to_terminal),
    loadingPort: str(data.loading_port),
    dischargingPort: str(data.discharging_port),
    atd: str(data.atd_origin),
    eta: str(data.eta_final_destination),
    lastLocation: str(data.last_location),
    nextLocation: str(data.next_location),
    vessel,
    events,
    officialUrls: officialTrackingUrls(number, "container", carrier),
    lastUpdated: str(data.last_updated),
  };
}

export async function trackBillJsonCargo(
  bl: string,
  carrier: Carrier | null,
  keys?: ProviderKeys,
): Promise<TrackingResult> {
  if (!carrier?.jsoncargo) {
    throw new Error("Bill of lading cần chọn hãng tàu (Maersk, MSC, CMA CGM, ...)");
  }

  const data = (await getJson(`/api/v1/containers/bol/${encodeURIComponent(bl)}`, {
    shipping_line: carrier.jsoncargo,
  }, keys)) as Record<string, unknown>;

  const related = Array.isArray(data.associated_container_numbers)
    ? data.associated_container_numbers.map(String)
    : [];

  let first: TrackingResult | null = null;
  if (related[0]) {
    try {
      first = await trackContainerJsonCargo(related[0], carrier, keys);
    } catch {
      first = null;
    }
  }

  return {
    kind: "bl",
    query: bl,
    source: "jsoncargo",
    carrier,
    billOfLading: str(data.bill_of_lading) ?? bl,
    relatedContainers: related,
    status: first?.status ?? `${related.length} container`,
    origin: first?.origin ?? null,
    destination: first?.destination ?? null,
    loadingPort: first?.loadingPort ?? null,
    dischargingPort: first?.dischargingPort ?? null,
    atd: first?.atd ?? null,
    eta: first?.eta ?? null,
    vessel: first?.vessel ?? null,
    events: first?.events ?? [],
    containerNumber: first?.containerNumber ?? related[0] ?? null,
    officialUrls: officialTrackingUrls(bl, "bl", carrier),
    lastUpdated: str(data.last_updated) ?? first?.lastUpdated ?? null,
  };
}

export async function trackVesselJsonCargo(query: string, keys?: ProviderKeys): Promise<TrackingResult> {
  const compact = query.replace(/\s+/g, "");
  let basic: Record<string, unknown> | null = null;

  if (/^\d{7}$/.test(compact)) {
    basic = (await getJson("/api/v1/vessel/basic", { imo: compact }, keys)) as Record<string, unknown>;
  } else if (/^\d{9}$/.test(compact)) {
    basic = (await getJson("/api/v1/vessel/basic", { mmsi: compact }, keys)) as Record<string, unknown>;
  } else {
    const found = await getJson("/api/v1/vessel/finder", {
      name: query,
      fuzzy: "1",
      limit: "5",
    }, keys);
    const rows = Array.isArray(found)
      ? found
      : found && typeof found === "object" && Array.isArray((found as { results?: unknown[] }).results)
        ? ((found as { results: unknown[] }).results)
        : found
          ? [found]
          : [];
    const first = rows[0] as Record<string, unknown> | undefined;
    if (!first) {
      throw new Error("Không tìm thấy tàu");
    }
    const id =
      (first.uuid as string | undefined) ||
      (first.imo as string | undefined) ||
      (first.mmsi as string | undefined);
    if (!id) throw new Error("Không tìm thấy tàu");
    if (first.uuid) {
      basic = (await getJson("/api/v1/vessel/basic", { uuid: String(first.uuid) }, keys)) as Record<string, unknown>;
    } else if (first.imo) {
      basic = (await getJson("/api/v1/vessel/basic", { imo: String(first.imo) }, keys)) as Record<string, unknown>;
    } else {
      basic = (await getJson("/api/v1/vessel/basic", { mmsi: String(first.mmsi) }, keys)) as Record<string, unknown>;
    }
  }

  if (!basic) throw new Error("Không có dữ liệu AIS");

  const vessel: VesselInfo = {
    name: str(basic.name) ?? query,
    imo: str(basic.imo),
    mmsi: str(basic.mmsi),
    lat: num(basic.lat),
    lng: num(basic.lon ?? basic.lng),
    speed: num(basic.speed),
    heading: num(basic.heading),
    course: num(basic.course),
    destination: str(basic.destination),
    flag: str(basic.country_iso),
    navStatus: str(basic.navigation_status),
    lastPositionAt: str(basic.last_position_UTC),
    eta: str(basic.eta_UTC),
  };

  return {
    kind: "vessel",
    query,
    source: "jsoncargo",
    carrier: null,
    status: vessel.navStatus || (vessel.speed && vessel.speed > 0.5 ? "Under way" : "AIS"),
    destination: vessel.destination,
    eta: vessel.eta,
    vessel,
    events: [
      {
        time: vessel.lastPositionAt ?? null,
        status: "AIS position",
        location: vessel.destination ?? null,
        vessel: vessel.name,
        voyage: null,
        isActual: true,
      },
    ],
    officialUrls: officialTrackingUrls(vessel.name, "vessel"),
    lastUpdated: vessel.lastPositionAt,
  };
}
