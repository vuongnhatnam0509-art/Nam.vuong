"use client";

import { useState } from "react";
import { parseBulkQueries } from "@/lib/bulk";
import { formatDate } from "@/lib/format";
import type { TrackResponse, WatchItem } from "@/lib/types";

type Keys = { searates?: string; shipsgo?: string; jsoncargo?: string; aisstream?: string };
type BulkRow = { query: string; response: TrackResponse };

export function BulkSearch({
  keys,
  onOpen,
  onWatchlist,
}: {
  keys: Keys;
  onOpen: (query: string) => void;
  onWatchlist: (items: WatchItem[]) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);

  async function run(watch: boolean) {
    const queries = parseBulkQueries(text);
    if (queries.length === 0) {
      setError("Dán số container / bill / MMSI (mỗi dòng hoặc cách nhau bằng dấu phẩy).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/track/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries, keys, watch }),
      });
      const data = (await res.json()) as {
        error?: string;
        results?: BulkRow[];
        watchItems?: WatchItem[];
      };
      if (!res.ok) {
        setError(data.error || "Không tra được danh sách.");
        return;
      }
      setRows(data.results ?? []);
      if (data.watchItems) onWatchlist(data.watchItems);
    } catch {
      setError("Không gọi được API nội bộ.");
    } finally {
      setLoading(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/track/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xlsxBase64: btoa(binary), keys, watch: false }),
        });
        const data = (await res.json()) as { error?: string; results?: BulkRow[] };
        if (!res.ok) {
          setError(data.error || "Không đọc được Excel. Hãy xuất CSV.");
          return;
        }
        setRows(data.results ?? []);
      } catch {
        setError("Không đọc được file.");
      } finally {
        setLoading(false);
      }
      return;
    }
    setText(await file.text());
  }

  return (
    <section className="search-card">
      <h3 className="settings-title">Danh sách hàng loạt</h3>
      <p className="muted">
        Dán nhiều số (container, bill, MMSI) hoặc tải CSV / Excel. Tối đa 40 mã / lần. Container live cần SeaRates;
        tàu live cần AISStream.
      </p>
      <textarea
        className="bulk-text"
        rows={5}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={"MSKU3900520\nMSCU7349821\n353136000"}
      />
      <div className="hints">
        <label className="ghost file-btn">
          Tải CSV / Excel
          <input
            type="file"
            accept=".csv,.txt,.xlsx"
            hidden
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </label>
        <button type="button" disabled={loading} onClick={() => void run(false)}>
          {loading ? "Đang gọi API…" : `Tra ${parseBulkQueries(text).length || ""} mã`}
        </button>
        <button type="button" disabled={loading} onClick={() => void run(true)}>
          Tra và theo dõi
        </button>
      </div>
      {error && <div className="banner error">{error}</div>}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Kết quả</th>
                <th>ETA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.query}>
                  <td>{row.query}</td>
                  <td>
                    {row.response.ok
                      ? row.response.result.status || row.response.result.vessel?.name || "OK"
                      : row.response.error}
                  </td>
                  <td>{row.response.ok ? formatDate(row.response.result.eta) : "—"}</td>
                  <td>
                    <button type="button" className="linkish" onClick={() => onOpen(row.query)}>
                      Mở
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
