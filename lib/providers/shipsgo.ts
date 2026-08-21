import { officialTrackingUrls } from "../carriers";
import type { Carrier, TrackingEvent, TrackingResult } from "../types";
import { resolvedKeys, type ProviderKeys } from "./keys";

function authCode(keys?: ProviderKeys): string | undefined {
  return resolvedKeys(keys).shipsgo;
}

export function hasShipsGo(keys?: ProviderKeys): boolean {
  return Boolean(authCode(keys));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
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

function pick(data: Record<string, unknown>, keys: string[]): unknown {
  const lower = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") return data[key];
    const hit = lower[key.toLowerCase()];
    if (hit !== undefined && hit !== null && hit !== "") return hit;
  }
  return undefined;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function createShipment(kind: "container" | "bl", query: string, carrier: Carrier | null, keys?: ProviderKeys) {
  const code = authCode(keys);
  if (!code) throw new Error("Missing SHIPSGO_AUTH_CODE");

  const form = new URLSearchParams();
  form.set("authCode", code);
  if (kind === "container") form.set("containerNumber", query);
  else form.set("blContainersRef", query);
  if (carrier?.shipsgo) form.set("shippingLine", carrier.shipsgo);

  const response = await fetch("https://shipsgo.com/api/v1.2/ContainerService/PostContainerInfo/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form.toString(),
    signal: AbortSignal.timeout(25000),
  });

  const body = await readBody(response);
  return { ok: response.ok, status: response.status, body };
}

async function getVoyage(requestId: string, keys?: ProviderKeys): Promise<Record<string, unknown>> {
  const code = authCode(keys);
  if (!code) throw new Error("Missing SHIPSGO_AUTH_CODE");

  const url = new URL("https://shipsgo.com/api/v1.2/ContainerService/GetContainerInfo/");
  url.searchParams.set("authCode", code);
  url.searchParams.set("requestId", requestId);
  url.searchParams.set("mapPoint", "true");
  url.searchParams.set("extended", "true");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(25000),
  });
  const body = await readBody(response);
  if (!response.ok) {
    throw new Error(`ShipsGo HTTP ${response.status}`);
  }
  if (Array.isArray(body)) return asRecord(body[0]);
  const rec = asRecord(body);
  if (Array.isArray(rec.message)) return asRecord(rec.message[0]);
  if (rec.message && typeof rec.message === "object") return asRecord(rec.message);
  return rec;
}

function parseEvents(data: Record<string, unknown>): TrackingEvent[] {
  const raw =
    pick(data, ["movements", "Movements", "events", "Events", "container_history"]) ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = asRecord(item);
    return {
      time: str(pick(row, ["date", "Date", "event_date", "EventDate", "time"])),
      status: str(pick(row, ["movement", "status", "event", "Event", "description"])) ?? "Event",
      location: str(pick(row, ["location", "Location", "port", "Port"])),
      vessel: str(pick(row, ["vessel", "Vessel", "vessel_name"])),
      voyage: str(pick(row, ["voyage", "Voyage"])),
      isActual: String(pick(row, ["isActual", "actual", "event_type"]) || "true") !== "false",
    };
  });
}

function toResult(
  kind: "container" | "bl",
  query: string,
  carrier: Carrier | null,
  data: Record<string, unknown>,
): TrackingResult {
  const container = str(pick(data, ["container_number", "ContainerNumber", "containerNumber"]));
  const bl = str(pick(data, ["bl_reference", "BLReference", "blContainersRef", "bill_of_lading"]));
  return {
    kind,
    query,
    source: "shipsgo",
    carrier,
    containerNumber: container,
    billOfLading: bl,
    status: str(pick(data, ["status", "Status", "shipment_status"])),
    origin: str(pick(data, ["pol", "POL", "from", "PortOfLoading"])),
    destination: str(pick(data, ["pod", "POD", "to", "PortOfDischarge"])),
    loadingPort: str(pick(data, ["pol", "POL", "PortOfLoading"])),
    dischargingPort: str(pick(data, ["pod", "POD", "PortOfDischarge"])),
    atd: str(pick(data, ["departure_date", "DepartureDate", "atd"])),
    eta: str(pick(data, ["eta", "ETA", "first_eta", "FirstETA"])),
    lastLocation: str(pick(data, ["ts_port", "TSPort", "last_location"])),
    vessel: {
      name: str(pick(data, ["vessel", "Vessel", "vessel_name"])) ?? "Unknown",
      voyage: str(pick(data, ["voyage", "Voyage"])),
      mmsi: str(pick(data, ["mmsi", "MMSI"])),
      imo: str(pick(data, ["imo", "IMO"])),
      lat: num(pick(data, ["latitude", "Latitude", "lat"])),
      lng: num(pick(data, ["longitude", "Longitude", "lng", "lon"])),
    },
    events: parseEvents(data),
    relatedContainers: Array.isArray(pick(data, ["containers"]))
      ? (pick(data, ["containers"]) as unknown[]).map(String)
      : undefined,
    officialUrls: officialTrackingUrls(query, kind, carrier),
    lastUpdated: str(pick(data, ["updated_at", "UpdatedAt", "last_update"])),
  };
}

export async function trackWithShipsGo(
  kind: "container" | "bl",
  query: string,
  carrier: Carrier | null,
  keys?: ProviderKeys,
): Promise<TrackingResult> {
  const created = await createShipment(kind, query, carrier, keys);
  const createdBody = asRecord(created.body);
  const requestId =
    str(pick(createdBody, ["requestId", "RequestId", "id", "Id"])) ?? query;

  try {
    const voyage = await getVoyage(requestId, keys);
    return toResult(kind, query, carrier, voyage);
  } catch {
    const voyage = await getVoyage(query, keys);
    return toResult(kind, query, carrier, voyage);
  }
}
