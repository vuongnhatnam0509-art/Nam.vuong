import { officialTrackingUrls } from "../carriers";
import { isMmsiNumber } from "../detect";
import type { TrackingResult, VesselInfo } from "../types";
import { knownMmsi } from "./known-mmsi";
import { resolvedKeys, type ProviderKeys } from "./keys";

const WS_URL = "wss://stream.aisstream.io/v0/stream";
const DEFAULT_TIMEOUT_MS = 20000;
const ENRICH_TIMEOUT_MS = 12000;

const NAV_STATUS: Record<number, string> = {
  0: "Under way",
  1: "At anchor",
  2: "Not under command",
  3: "Restricted manoeuvrability",
  4: "Constrained by draught",
  5: "Moored",
  6: "Aground",
  7: "Engaged in fishing",
  8: "Under way sailing",
  11: "Power-driven towing astern",
  12: "Power-driven pushing ahead",
  14: "AIS-SART",
  15: "Undefined",
};

export type AisLivePosition = {
  mmsi: string;
  name: string;
  imo?: string | null;
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  course?: number | null;
  destination?: string | null;
  eta?: string | null;
  navStatus?: string | null;
  lastPositionAt: string;
  aisLive: true;
};

export type AisPositionDraft = {
  mmsi: string;
  name?: string | null;
  imo?: string | null;
  lat?: number | null;
  lng?: number | null;
  speed?: number | null;
  heading?: number | null;
  course?: number | null;
  destination?: string | null;
  eta?: string | null;
  navStatus?: string | null;
  lastPositionAt?: string | null;
};

export function hasAisStream(keys?: ProviderKeys): boolean {
  return Boolean(resolvedKeys(keys).aisstream);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function validAisCoord(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  return true;
}

function payloadToText(data: unknown): string {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  }
  return String(data);
}

function parseUtc(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const parsed = Date.parse(text.replace(" +0000 UTC", " UTC"));
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return text;
}

function aisEta(eta: unknown): string | null {
  const rec = asRecord(eta);
  const month = num(rec.Month ?? rec.month);
  const day = num(rec.Day ?? rec.day);
  if (!month || !day) return str(eta);
  const hour = num(rec.Hour ?? rec.hour) ?? 0;
  const minute = num(rec.Minute ?? rec.minute) ?? 0;
  const year = new Date().getUTCFullYear();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
}

export function applyAisEnvelope(draft: AisPositionDraft, raw: unknown): AisPositionDraft {
  const envelope = asRecord(raw);
  const meta = asRecord(envelope.MetaData ?? envelope.metadata);
  const message = asRecord(envelope.Message ?? envelope.message);
  const type = str(envelope.MessageType ?? envelope.messageType) ?? "";
  const body = asRecord(message[type] ?? Object.values(message)[0]);

  const mmsi = str(meta.MMSI ?? meta.mmsi ?? body.UserID ?? body.userID);
  if (mmsi) draft.mmsi = mmsi;

  const lat = num(body.Latitude ?? body.latitude ?? meta.Latitude ?? meta.latitude);
  const lng = num(body.Longitude ?? body.longitude ?? meta.Longitude ?? meta.longitude);
  if (validAisCoord(lat, lng)) {
    draft.lat = lat;
    draft.lng = lng;
  }

  const name = str(body.Name ?? body.name ?? meta.ShipName ?? meta.shipName ?? meta.Ship_Name);
  if (name) draft.name = name.replace(/\s+/g, " ").trim();

  const imo = num(body.ImoNumber ?? body.imoNumber ?? body.IMO);
  if (imo && imo > 0) draft.imo = String(Math.trunc(imo));

  const sog = num(body.Sog ?? body.sog ?? body.SOG);
  if (sog != null) draft.speed = sog;

  const cog = num(body.Cog ?? body.cog ?? body.COG);
  if (cog != null) draft.course = cog;

  const heading = num(body.TrueHeading ?? body.trueHeading ?? body.Heading);
  if (heading != null && heading !== 511) draft.heading = heading;

  const nav = num(body.NavigationalStatus ?? body.navigationalStatus);
  if (nav != null) draft.navStatus = NAV_STATUS[nav] ?? `Nav ${nav}`;

  const destination = str(body.Destination ?? body.destination);
  if (destination) draft.destination = destination.replace(/@+$/g, "").trim();

  if (body.Eta != null || body.ETA != null) {
    draft.eta = aisEta(body.Eta ?? body.ETA);
  }

  draft.lastPositionAt = parseUtc(meta.time_utc ?? meta.timeUtc) ?? new Date().toISOString();
  return draft;
}

export function finalizeAisPosition(draft: AisPositionDraft): AisLivePosition | null {
  if (!validAisCoord(draft.lat, draft.lng) || !draft.mmsi) return null;
  return {
    mmsi: draft.mmsi,
    name: draft.name?.trim() || `MMSI ${draft.mmsi}`,
    imo: draft.imo ?? null,
    lat: draft.lat!,
    lng: draft.lng!,
    speed: draft.speed ?? null,
    heading: draft.heading ?? null,
    course: draft.course ?? null,
    destination: draft.destination ?? null,
    eta: draft.eta ?? null,
    navStatus: draft.navStatus ?? null,
    lastPositionAt: draft.lastPositionAt ?? new Date().toISOString(),
    aisLive: true,
  };
}

export async function listenAisPosition(
  mmsi: string,
  keys?: ProviderKeys,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<AisLivePosition> {
  const apiKey = resolvedKeys(keys).aisstream;
  if (!apiKey) throw new Error("Missing AISSTREAM_API_KEY");
  if (!isMmsiNumber(mmsi)) throw new Error("AISStream lọc theo MMSI 9 số, không theo tên tàu hay số container.");
  if (typeof WebSocket === "undefined") {
    throw new Error("Môi trường này không hỗ trợ WebSocket để gọi AISStream.");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const draft: AisPositionDraft = { mmsi };
    const ws = new WebSocket(WS_URL);

    const done = (error?: Error, value?: AisLivePosition) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      if (error) reject(error);
      else resolve(value!);
    };

    const timer = setTimeout(() => {
      const built = finalizeAisPosition(draft);
      if (built) done(undefined, built);
      else {
        done(
          new Error(
            "AISStream không nhận được vị trí trong thời gian chờ. Tàu có thể ngoài vùng phủ sóng AIS, hoặc API key sai.",
          ),
        );
      }
    }, timeoutMs);

    ws.addEventListener("open", () => {
      ws.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: [
            [
              [-90, -180],
              [90, 180],
            ],
          ],
          FiltersShipMMSI: [mmsi],
          FilterMessageTypes: [
            "PositionReport",
            "ShipStaticData",
            "StandardClassBPositionReport",
            "ExtendedClassBPositionReport",
          ],
        }),
      );
    });

    ws.addEventListener("message", (event) => {
      try {
        const json: unknown = JSON.parse(payloadToText(event.data));
        const rec = asRecord(json);
        if (typeof rec.error === "string") {
          done(new Error(rec.error));
          return;
        }
        applyAisEnvelope(draft, json);
        const built = finalizeAisPosition(draft);
        if (built) done(undefined, built);
      } catch {
        /* ignore non-JSON frames */
      }
    });

    ws.addEventListener("error", () => {
      done(new Error("Không kết nối được wss://stream.aisstream.io (mạng công ty có thể chặn WebSocket)."));
    });

    ws.addEventListener("close", () => {
      if (settled) return;
      const built = finalizeAisPosition(draft);
      if (built) done(undefined, built);
      else done(new Error("AISStream đóng kết nối trước khi có vị trí."));
    });
  });
}

function vesselFromLive(live: AisLivePosition): VesselInfo {
  return {
    name: live.name,
    imo: live.imo,
    mmsi: live.mmsi,
    lat: live.lat,
    lng: live.lng,
    speed: live.speed,
    heading: live.heading,
    course: live.course,
    destination: live.destination,
    navStatus: live.navStatus,
    lastPositionAt: live.lastPositionAt,
    eta: live.eta,
    aisLive: true,
  };
}

export async function trackVesselAisStream(query: string, keys?: ProviderKeys): Promise<TrackingResult> {
  const mmsi = knownMmsi(query);
  if (!mmsi) {
    throw new Error(
      "AISStream không lọc được theo tên/IMO. Nhập MMSI 9 số (ví dụ Ever Given: 353136000) hoặc gắn JSONCargo để đổi tên → MMSI.",
    );
  }
  const live = await listenAisPosition(mmsi, keys);
  const vessel = vesselFromLive(live);
  return {
    kind: "vessel",
    query,
    source: "aisstream",
    carrier: null,
    status: vessel.navStatus || (vessel.speed && vessel.speed > 0.5 ? "Under way (AIS live)" : "AIS live"),
    destination: vessel.destination,
    eta: vessel.eta,
    vessel,
    events: [
      {
        time: vessel.lastPositionAt ?? null,
        status: "AIS position (AISStream live)",
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

export async function enrichWithAisStream(
  result: TrackingResult,
  keys?: ProviderKeys,
): Promise<TrackingResult> {
  const mmsi = result.vessel?.mmsi;
  if (!hasAisStream(keys) || !mmsi || !isMmsiNumber(mmsi)) return result;
  try {
    const live = await listenAisPosition(mmsi, keys, ENRICH_TIMEOUT_MS);
    const vessel: VesselInfo = {
      ...result.vessel!,
      name: live.name !== `MMSI ${live.mmsi}` ? live.name : result.vessel!.name,
      imo: live.imo || result.vessel!.imo,
      mmsi: live.mmsi,
      lat: live.lat,
      lng: live.lng,
      speed: live.speed ?? result.vessel!.speed,
      heading: live.heading ?? result.vessel!.heading,
      course: live.course ?? result.vessel!.course,
      destination: live.destination || result.vessel!.destination,
      navStatus: live.navStatus || result.vessel!.navStatus,
      lastPositionAt: live.lastPositionAt,
      eta: live.eta || result.vessel!.eta,
      aisLive: true,
    };
    return {
      ...result,
      vessel,
      lastUpdated: live.lastPositionAt ?? result.lastUpdated,
    };
  } catch {
    return result;
  }
}
