import { formatCoord, formatDateTime } from "@/lib/format";
import type { TrackingResult } from "@/lib/types";
import { MapEmbed } from "./MapEmbed";
import { Timeline } from "./Timeline";

export function ResultView({ result, demo }: { result: TrackingResult; demo: boolean }) {
  const vessel = result.vessel;
  const hasMap = vessel?.lat != null && vessel?.lng != null;

  return (
    <section className="result">
      {demo ? (
        <div className="banner demo">
          Đang hiển thị <strong>dữ liệu mẫu</strong>. Gắn JSONCARGO_API_KEY hoặc SHIPSGO_AUTH_CODE để tra cứu thật.
        </div>
      ) : (
        <div className="banner live">Nguồn: {result.source === "searates" ? "SeaRates (hãng tàu live)" : result.source === "jsoncargo" ? "JSONCargo" : "ShipsGo"}</div>
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
        </div>
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
          {vessel ? (
            <>
              <p className="vessel-name">{vessel.name}</p>
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
                    <span>MMSI</span>
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
              </ul>
              {hasMap && <MapEmbed lat={vessel.lat!} lng={vessel.lng!} label={vessel.name} />}
            </>
          ) : (
            <p className="muted">Chưa có thông tin tàu.</p>
          )}
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
