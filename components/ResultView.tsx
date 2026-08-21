import { formatDateTime } from "@/lib/format";
import type { TrackingResult } from "@/lib/types";
import { DateBoard } from "./DateBoard";
import { LiveVesselPanel } from "./LiveVesselPanel";
import { Timeline } from "./Timeline";

export function ResultView({
  result,
  demo,
  onWatch,
}: {
  result: TrackingResult;
  demo: boolean;
  onWatch?: () => void;
}) {
  const vessel = result.vessel;

  return (
    <section className="result">
      {demo || result.source === "demo" ? (
        <div className="banner demo">
          Đây là <strong>dữ liệu mẫu có sẵn</strong> — không gọi API live. Bấm Tra cứu bình thường (không «Xem mẫu»)
          sau khi dán key mới ra lịch thật.
        </div>
      ) : (
        <div className="banner live">
          {result.source === "aisstream" && "LIVE vị trí tàu — AISStream (wss://stream.aisstream.io)"}
          {result.source === "searates" && "LIVE hãng tàu — SeaRates"}
          {result.source === "jsoncargo" && "LIVE — JSONCargo"}
          {result.source === "shipsgo" && "LIVE — ShipsGo"}
          {result.vessel?.aisLive && result.source !== "aisstream" ? " · vị trí tàu bổ sung từ AISStream" : ""}
          {result.source === "aisstream" ? " · giữ trang này để AIS cập nhật" : ""}
        </div>
      )}

      <header className="hero-card">
        <div>
          <p className="kicker">
            {result.kind === "container" && "Container"}
            {result.kind === "bl" && "Bill of Lading"}
            {result.kind === "vessel" && "Tàu"}
            {result.carrier ? ` · ${result.carrier.name}` : ""}
          </p>
          <h2>{result.containerNumber || result.billOfLading || vessel?.name || result.query}</h2>
          <p className="status">{result.status || "Đã tìm thấy"}</p>
          {onWatch && (
            <button type="button" className="ghost" onClick={onWatch}>
              Theo dõi (các phòng cùng thấy)
            </button>
          )}
        </div>
        <DateBoard result={result} />
        <div className="meta-grid">
          <Meta label="Đi" value={result.loadingPort || result.origin} />
          <Meta label="Đến" value={result.dischargingPort || result.destination} />
          <Meta label="Rời cảng" value={formatDateTime(result.atd)} />
          <Meta label="ETA" value={formatDateTime(result.eta)} />
        </div>
      </header>

      <div className="split">
        <article className="panel">
          <h3>Hành trình</h3>
          <Timeline events={result.events} />
        </article>
        <article className="panel">
          <h3>Tàu</h3>
          <LiveVesselPanel result={result} />
        </article>
      </div>

      {result.relatedContainers && result.relatedContainers.length > 0 && (
        <article className="panel">
          <h3>Container trên bill</h3>
          <div className="chips">
            {result.relatedContainers.map((id) => (
              <span key={id} className="chip">
                {id}
              </span>
            ))}
          </div>
        </article>
      )}

      {result.officialUrls.length > 0 && (
        <article className="panel">
          <h3>Trang hãng tàu</h3>
          <div className="links">
            {result.officialUrls.map((item) => (
              <a key={item.url} href={item.url} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}
