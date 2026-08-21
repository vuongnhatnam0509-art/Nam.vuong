import { Suspense } from "react";
import { TrackerApp } from "@/components/TrackerApp";

export default function Home() {
  return (
    <Suspense fallback={<div className="shell muted">Đang tải…</div>}>
      <TrackerApp />
    </Suspense>
  );
}
