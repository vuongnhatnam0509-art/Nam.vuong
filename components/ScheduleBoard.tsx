"use client";

import { FormEvent, useState } from "react";
import { CARRIERS } from "@/lib/carriers";
import { formatDate } from "@/lib/format";
import { PORTS } from "@/lib/ports";
import type { ScheduleResponse } from "@/lib/providers/schedules";

type Keys = { searates?: string };

export function ScheduleBoard({ keys }: { keys: Keys }) {
  const [origin, setOrigin] = useState("VNSGN");
  const [destination, setDestination] = useState("NLRTM");
  const [carrier, setCarrier] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScheduleResponse | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          weeks: 4,
          carrier: carrier || undefined,
          keys,
        }),
      });
      setResult((await res.json()) as ScheduleResponse);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="search-card">
      <h3 className="settings-title">Lịch tàu (POL → POD)</h3>
      <p className="muted">
        Lịch cập nhật từ SeaRates (cùng kiểu aggregator như Project44): ETD/ETA, tàu, chuyến, transship.
      </p>
      <form onSubmit={onSubmit} className="schedule-form">
        <select value={origin} onChange={(event) => setOrigin(event.target.value)}>
          {PORTS.map((port) => (
            <option key={port.locode} value={port.locode}>
              {port.locode} — {port.name}
            </option>
          ))}
        </select>
        <select value={destination} onChange={(event) => setDestination(event.target.value)}>
          {PORTS.map((port) => (
            <option key={`d-${port.locode}`} value={port.locode}>
              {port.locode} — {port.name}
            </option>
          ))}
        </select>
        <select value={carrier} onChange={(event) => setCarrier(event.target.value)}>
          <option value="">Mọi hãng</option>
          {CARRIERS.map((item) => (
            <option key={item.code} value={item.scac[0]}>
              {item.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={loading}>
          {loading ? "Đang lấy lịch…" : "Lấy lịch mới nhất"}
        </button>
      </form>

      {result && !result.ok && <div className="banner error">{result.error}</div>}

      {result && result.ok && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hãng</th>
                <th>Tàu / chuyến</th>
                <th>ETD</th>
                <th>ETA</th>
                <th>Transit</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {result.sailings.map((row, index) => (
                <tr key={`${row.scac}-${row.vessel}-${row.etd}-${index}`}>
                  <td>{row.carrier}</td>
                  <td>
                    <strong>{row.vessel}</strong>
                    <div className="muted">{row.voyage || row.service}</div>
                  </td>
                  <td>{formatDate(row.etd)}</td>
                  <td>{formatDate(row.eta)}</td>
                  <td>{row.transitDays != null ? `${row.transitDays} ngày` : "—"}</td>
                  <td>{row.direct ? "Direct" : "Có transship"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.sailings.length === 0 && <p className="muted">Không có chuyến trong 4 tuần tới.</p>}
        </div>
      )}
    </section>
  );
}
