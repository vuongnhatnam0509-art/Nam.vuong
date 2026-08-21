import { getCarrierByCode, officialTrackingUrls } from "../carriers";
import type { Carrier, QueryKind, TrackingEvent, TrackingResult, VesselInfo } from "../types";
import { resolvedKeys, type ProviderKeys } from "./keys";

type SeaRatesLocation = {
  id?: number;
  name?: string;
  country?: string;
  country_code?: string;
  locode?: string;
  lat?: number;
  lng?: number;
};

type SeaRatesVessel = {
  id?: number;
  name?: string;
  imo?: number | string;
  mmsi?: number | string;
  flag?: string;
};

type SeaRatesEvent = {
  description?: string;
  date?: string;
  actual?: boolean;
  location?: number;
  voyage?: string | null;
  vessel?: number | null;
};

type SeaRatesContainer = {
  number?: string;
  size_type?: string;
  status?: string;
  events?: SeaRatesEvent[];
};

type SeaRatesData = {
  metadata?: {
    type?: string;
    number?: string;
    sealine?: string;
    sealine_name?: string;
    status?: string;
    updated_at?: string;
  };
  locations?: SeaRatesLocation[];
  vessels?: SeaRatesVessel[];
  containers?: SeaRatesContainer[];
  route?: {
    pol?: { location?: number; date?: string | null; actual?: boolean };
    pod?: { location?: number; date?: string | null; actual?: boolean };
  };
  route_data?: {
    ais?: {
      data?: {
        last_event?: { voyage?: string; description?: string };
        vessel?: SeaRatesVessel;
        last_vessel_position?: { lat?: number; lng?: number; updated_at?: string };
        discharge_port?: { name?: string; date?: string };
      };
    };
  };
};

export function hasSeaRates(keys?: ProviderKeys): boolean {
  return Boolean(resolvedKeys(keys).searates);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function locLabel(locations: SeaRatesLocation[], id?: number | null): string | null {
  if (id == null) return null;
  const loc = locations.find((item) => item.id === id);
  if (!loc) return null;
  return [loc.name, loc.country_code || loc.country].filter(Boolean).join(", ");
}

export async function trackWithSeaRates(
  kind: QueryKind,
  query: string,
  carrier: Carrier | null,
  keys?: ProviderKeys,
): Promise<TrackingResult> {
  if (kind === "vessel") {
    throw new Error("SeaRates theo dõi theo container hoặc bill, không theo tên tàu.");
  }

  const apiKey = resolvedKeys(keys).searates;
  if (!apiKey) throw new Error("Missing SEARATES_API_KEY");

  const url = new URL("https://tracking.searates.com/tracking");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("number", query);
  url.searchParams.set("type", kind === "bl" ? "BL" : "CT");
  url.searchParams.set("sealine", carrier?.scac[0] || "auto");
  url.searchParams.set("route", "true");
  url.searchParams.set("ais", "true");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45000),
  });
  const body = asRecord(await response.json().catch(() => ({})));
  if (!response.ok || body.status === "error") {
    throw new Error(String(body.message || `SeaRates HTTP ${response.status}`));
  }

  const data = (body.data || body) as SeaRatesData;
  const locations = data.locations ?? [];
  const vessels = data.vessels ?? [];
  const containers = data.containers ?? [];
  const picked =
    containers.find((item) => item.number?.toUpperCase() === query.toUpperCase()) ?? containers[0];

  const vesselById = (id?: number | null) => vessels.find((item) => item.id === id);

  const events: TrackingEvent[] = (picked?.events ?? []).map((event) => {
    const vessel = vesselById(event.vessel ?? undefined);
    return {
      time: event.date ?? null,
      status: event.description || "Event",
      location: locLabel(locations, event.location),
      vessel: vessel?.name ?? null,
      voyage: event.voyage ?? null,
      isActual: event.actual !== false,
    };
  });

  const ais = data.route_data?.ais?.data;
  const lastVesselEvent = [...(picked?.events ?? [])].reverse().find((event) => event.vessel);
  const currentVessel = ais?.vessel || vesselById(lastVesselEvent?.vessel ?? undefined) || vessels[vessels.length - 1];

  const vessel: VesselInfo | null = currentVessel
    ? {
        name: currentVessel.name || "Unknown",
        voyage: ais?.last_event?.voyage || lastVesselEvent?.voyage || null,
        imo: currentVessel.imo != null ? String(currentVessel.imo) : null,
        mmsi: currentVessel.mmsi != null ? String(currentVessel.mmsi) : null,
        flag: currentVessel.flag ?? null,
        lat: ais?.last_vessel_position?.lat ?? null,
        lng: ais?.last_vessel_position?.lng ?? null,
        lastPositionAt: ais?.last_vessel_position?.updated_at ?? null,
        destination: ais?.discharge_port?.name ?? locLabel(locations, data.route?.pod?.location),
        eta: ais?.discharge_port?.date ?? data.route?.pod?.date ?? null,
      }
    : null;

  const metaCarrier =
    getCarrierByCode(data.metadata?.sealine) ||
    getCarrierByCode(data.metadata?.sealine_name) ||
    carrier;

  return {
    kind,
    query,
    source: "searates",
    carrier: metaCarrier,
    containerNumber: picked?.number ?? (kind === "container" ? query : null),
    billOfLading: data.metadata?.type === "BL" ? data.metadata.number : null,
    containerType: picked?.size_type ?? null,
    status: picked?.status || data.metadata?.status || null,
    origin: locLabel(locations, data.route?.pol?.location),
    destination: locLabel(locations, data.route?.pod?.location),
    loadingPort: locLabel(locations, data.route?.pol?.location),
    dischargingPort: locLabel(locations, data.route?.pod?.location),
    atd: data.route?.pol?.date ?? null,
    eta: data.route?.pod?.date ?? null,
    vessel,
    events,
    relatedContainers: containers.map((item) => item.number).filter(Boolean) as string[],
    officialUrls: officialTrackingUrls(query, kind, metaCarrier),
    lastUpdated: data.metadata?.updated_at ?? null,
  };
}
