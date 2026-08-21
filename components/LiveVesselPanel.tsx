"use client";

import { useEffect, useState } from "react";
import { formatCoord, formatDateTime } from "@/lib/format";
import type { TrackingResult, VesselInfo } from "@/lib/types";
import { MapEmbed } from "./MapEmbed";

type LivePos = {
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  course?: number | null;
  name?: string;
  destination?: string | null;
  navStatus?: string | null;
  lastPositionAt: string;
};

function mergeLive(current: VesselInfo | null, data: LivePos, mmsi: string): VesselInfo {
  return {
    ...(current ?? { name: data.name || mmsi }),
    name: data.name || current?.name || mmsi,
    lat: data.lat,
    lng: data.lng,
    speed: data.speed ?? current?.speed,
    heading: data.heading ?? current?.heading,
    course: data.course ?? current?.course,
    destination: data.destination || current?.destination,
    navStatus: data.navStatus || current?.navStatus,
    lastPositionAt: data.lastPositionAt,
    aisLive: true,
    mmsi,
  };
}

export function LiveVesselPanel({ result }: { result: TrackingResult }) {
  const [vessel, setVessel] = useState<VesselInfo | null>(result.vessel ?? null);
  const [map, setMap] = useState<{ lat: number; lng: number } | null>(
    result.vessel?.lat != null && result.vessel?.lng != null
      ? { lat: result.vessel.lat, lng: result.vessel.lng }
      : null,
  );
  const [live, setLive] = useState(Boolean(result.vessel?.aisLive));
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    setVessel(result.vessel ?? null);
    if (result.vessel?.lat != null && result.vessel?.lng != null) {
      setMap({ lat: result.vessel.lat, lng: result.vessel.lng });
    }
  }, [result]);

  const mmsi = result.vessel?.mmsi ?? "";

  useEffect(() => {
    if (!mmsi || result.source === "demo") return;
    const source = new EventSource(`/api/ais?mmsi=${encodeURIComponent(mmsi)}`);
    source.addEventListener("position", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as LivePos;
      setLive(true);
      setStreamError(null);
      setVessel((current) => mergeLive(current, data, mmsi));
      setMap((current) => {
        if (!current) return { lat: data.lat, lng: data.lng };
        if (Math.abs(current.lat - data.lat) > 0.02 || Math.abs(current.lng - data.lng) > 0.02) {
          return { lat: data.lat, lng: data.lng };
        }
        return current;
      });
    });
    source.addEventListener("error", (event) => {
      if (event instanceof MessageEvent && event.data) {
        try {
          const payload = JSON.parse(String(event.data)) as { error?: string };
          if (payload.error) setStreamError(payload.error);
        } catch {
          /* browser connection error */
        }
      }
    });
    return () => source.close();
  }, [mmsi, result.source]);

  if (!vessel) {
    return <p className="muted">Chưa có thông tin tàu.</p>;
  }

  return (
    <>
      <p className="vessel-name">
        {vessel.name}
        {live && <span className="live-dot"> LIVE</span>}
      </p>
      {streamError && <p className="muted">{streamError}</p>}
      <ul className="kv">
        {vessel.voyage && (
          <li>
            <span>Chuyến</span>
            <strong>{vessel.voyage}</strong>
          </li>
        )}
        {vessel.imo && (
          <li>
            <span>IMO</span>
            <strong>{vessel.imo}</strong>
          </li>
        )}
        {vessel.mmsi && (
          <li>
            <span>MMSI (mã AIS 9 số)</span>
            <strong>{vessel.mmsi}</strong>
          </li>
        )}
        {formatCoord(vessel.lat, vessel.lng) && (
          <li>
            <span>Vị trí</span>
            <strong>{formatCoord(vessel.lat, vessel.lng)}</strong>
          </li>
        )}
        {vessel.speed != null && (
          <li>
            <span>Tốc độ</span>
            <strong>{vessel.speed} kn</strong>
          </li>
        )}
        {vessel.destination && (
          <li>
            <span>Điểm đến AIS</span>
            <strong>{vessel.destination}</strong>
          </li>
        )}
        {vessel.lastPositionAt && (
          <li>
            <span>AIS lúc</span>
            <strong>{formatDateTime(vessel.lastPositionAt)}</strong>
          </li>
        )}
        {vessel.aisLive && (
          <li>
            <span>Nguồn vị trí</span>
            <strong>AISStream live</strong>
          </li>
        )}
      </ul>
      {map && <MapEmbed lat={map.lat} lng={map.lng} label={vessel.name} />}
    </>
  );
}
