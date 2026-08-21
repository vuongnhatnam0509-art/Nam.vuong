import { formatDate } from "@/lib/format";
import { deriveMilestones } from "@/lib/milestones";
import type { TrackingResult } from "@/lib/types";

export function DateBoard({ result }: { result: TrackingResult }) {
  const milestones = deriveMilestones(result.events, {
    atd: result.atd,
    eta: result.eta,
    origin: result.loadingPort || result.origin,
    destination: result.dischargingPort || result.destination,
  });

  if (!milestones.length) return null;

  return (
    <div className="date-board">
      {milestones.map((item) => (
        <div key={item.key} className={item.isActual ? "actual" : "expected"}>
          <span>{item.label}</span>
          <strong>{formatDate(item.time)}</strong>
          <em>{item.isActual ? "Thực tế" : "Dự kiến"}</em>
          {item.location && <p>{item.location}</p>}
        </div>
      ))}
    </div>
  );
}
