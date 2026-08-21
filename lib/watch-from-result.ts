import { lastAndNext } from "./milestones";
import { evaluateDelay } from "./delay";
import type { TrackingResult, WatchItem } from "./types";

export function watchFieldsFromResult(
  result: TrackingResult,
  previous?: WatchItem | null,
): Omit<WatchItem, "id" | "watchedAt"> {
  const { last } = lastAndNext(result.events);
  const eta = result.eta ?? result.vessel?.eta ?? null;
  const delay = evaluateDelay({
    eta,
    status: result.status,
    previousEta: previous?.eta,
  });
  return {
    query: result.containerNumber || result.billOfLading || result.vessel?.mmsi || result.query,
    kind: result.kind,
    carrier: result.carrier?.code ?? previous?.carrier ?? null,
    status: result.status ?? null,
    origin: result.loadingPort || result.origin || null,
    destination: result.dischargingPort || result.destination || result.vessel?.destination || null,
    etd: result.atd ?? null,
    eta,
    vessel: result.vessel?.name ?? null,
    voyage: result.vessel?.voyage ?? null,
    lastEvent: last ? `${last.status} · ${last.time ?? ""}` : null,
    refreshedAt: new Date().toISOString(),
    delayed: delay.delayed,
    delayNote: delay.delayNote,
    delayHours: delay.delayHours,
    mmsi: result.vessel?.mmsi ?? null,
    lat: result.vessel?.lat ?? null,
    lng: result.vessel?.lng ?? null,
    error: null,
  };
}
