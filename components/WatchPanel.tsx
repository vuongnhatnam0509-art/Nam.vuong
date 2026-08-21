"use client";

import { formatDate } from "@/lib/format";
import type { QueryKind, WatchItem } from "@/lib/types";

export function WatchPanel({
  items,
  refreshing,
  onRefresh,
  onOpen,
  onRemove,
}: {
  items: WatchItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (query: string, kind: QueryKind, carrier: string) => void;
  onRemove: (id: string) => void;
}) {
  const delayed = items.filter((item) => item.delayed).length;

  return (
    <section className="search-card">
      <div className="watch-head">
        <div>
          <h3 className="settings-title">Shipment các phòng đang theo dõi</h3>
          <p className="muted">
            Tự làm mới mỗi 3 phút khi mở tab này. {delayed > 0 ? `${delayed} lô trễ ETA.` : "Chưa có cờ trễ."}
          </p>
        </div>
        <button type="button" className="ghost" disabled={refreshing || items.length === 0} onClick={onRefresh}>
          {refreshing ? "Đang cập nhật…" : "Cập nhật live"}
        </button>
      </div>
      {items.length === 0 && <p className="muted">Chưa có shipment. Tra cứu xong bấm Theo dõi, hoặc dán danh sách.</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Số</th>
              <th>Trạng thái</th>
              <th>Tuyến</th>
              <th>ETD</th>
              <th>ETA</th>
              <th>Tàu</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={item.delayed ? "delayed" : undefined}>
                <td>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => onOpen(item.query, item.kind, item.carrier ?? "")}
                  >
                    {item.query}
                  </button>
                </td>
                <td>
                  {item.delayed ? <strong className="delay-flag">{item.delayNote || "Trễ"}</strong> : item.status || "—"}
                  {item.error && <p className="muted">{item.error}</p>}
                </td>
                <td>
                  {item.origin || "—"} → {item.destination || "—"}
                </td>
                <td>{formatDate(item.etd)}</td>
                <td>{formatDate(item.eta)}</td>
                <td>{item.vessel || "—"}</td>
                <td>
                  <button type="button" className="ghost" onClick={() => onRemove(item.id)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
