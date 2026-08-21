import { formatDateTime } from "@/lib/format";
import type { TrackingEvent } from "@/lib/types";

export function Timeline({ events }: { events: TrackingEvent[] }) {
  if (!events.length) {
    return <p className="muted">Chưa có mốc sự kiện.</p>;
  }

  return (
    <ol className="timeline">
      {events.map((event, index) => (
        <li key={`${event.time}-${event.status}-${index}`} className={event.isActual ? "actual" : "expected"}>
          <span className="dot" />
          <div>
            <p className="when">{formatDateTime(event.time)}</p>
            <p className="what">{event.status}</p>
            <p className="where">
              {[event.location, event.vessel, event.voyage].filter(Boolean).join(" · ")}
              {!event.isActual ? " · dự kiến" : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
