"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CARRIERS } from "@/lib/carriers";
import { DEMO_HINTS } from "@/lib/providers/demo";
import type { QueryKind, TrackResponse } from "@/lib/types";
import { ResultView } from "./ResultView";

const HISTORY_KEY = "ocean-track-history";

type KindOption = "auto" | QueryKind;

export function TrackerApp() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [kind, setKind] = useState<KindOption>((params.get("kind") as KindOption) || "auto");
  const [carrier, setCarrier] = useState(params.get("carrier") ?? "");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<TrackResponse | null>(null);
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(stored)) return stored.slice(0, 8).map(String);
    } catch {
      return [];
    }
    return [];
  });

  useEffect(() => {
    const initial = params.get("q");
    if (initial) {
      void search(initial, (params.get("kind") as KindOption) || "auto", params.get("carrier") ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providersLabel = useMemo(() => {
    if (!response) return "";
    if (response.liveProviders.length === 0) return "Chế độ demo — chưa gắn API key";
    return `API: ${response.liveProviders.join(", ")}`;
  }, [response]);

  async function search(nextQuery: string, nextKind: KindOption, nextCarrier: string) {
    const q = nextQuery.trim();
    if (!q) return;
    setLoading(true);
    setQuery(q);
    setKind(nextKind);
    setCarrier(nextCarrier);

    const search = new URLSearchParams({ q });
    if (nextKind !== "auto") search.set("kind", nextKind);
    if (nextCarrier) search.set("carrier", nextCarrier);
    router.replace(`/?${search.toString()}`);

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, kind: nextKind, carrier: nextCarrier || undefined }),
      });
      const data = (await res.json()) as TrackResponse;
      setResponse(data);
      if (data.ok) {
        const nextHistory = [q, ...history.filter((item) => item !== q)].slice(0, 8);
        setHistory(nextHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      }
    } catch {
      setResponse({
        ok: false,
        error: "Không gọi được API nội bộ.",
        code: "network",
        officialUrls: [],
        liveProviders: [],
      });
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void search(query, kind, carrier);
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="logo">OceanTrack</p>
          <p className="tag">Theo dõi container · bill of lading · tàu</p>
        </div>
        <p className="provider-note">{providersLabel}</p>
      </header>

      <section className="search-card">
        <form onSubmit={onSubmit}>
          <div className="tabs" role="tablist">
            {(
              [
                ["auto", "Tự động"],
                ["container", "Container"],
                ["bl", "Bill of Lading"],
                ["vessel", "Tàu"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={kind === value ? "active" : ""}
                onClick={() => setKind(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="search-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="MSKU3900520 · MAEU918273645 · MAERSK ESSEN"
              autoComplete="off"
              spellCheck={false}
            />
            <select value={carrier} onChange={(event) => setCarrier(event.target.value)}>
              <option value="">Hãng tàu (tự nhận)</option>
              {CARRIERS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={loading}>
              {loading ? "Đang tìm…" : "Tra cứu"}
            </button>
          </div>
        </form>

        <div className="hints">
          <span>Thử mẫu:</span>
          {DEMO_HINTS.containers.map((item) => (
            <button key={item} type="button" onClick={() => void search(item, "container", "")}>
              {item}
            </button>
          ))}
          {DEMO_HINTS.bills.map((item) => (
            <button key={item} type="button" onClick={() => void search(item, "bl", "")}>
              {item}
            </button>
          ))}
          {DEMO_HINTS.vessels.map((item) => (
            <button key={item} type="button" onClick={() => void search(item, "vessel", "")}>
              {item}
            </button>
          ))}
        </div>

        {history.length > 0 && (
          <div className="hints history">
            <span>Gần đây:</span>
            {history.map((item) => (
              <button key={item} type="button" onClick={() => void search(item, kind, carrier)}>
                {item}
              </button>
            ))}
          </div>
        )}
      </section>

      {response?.ok && <ResultView result={response.result} demo={response.demo} />}

      {response && !response.ok && (
        <section className="result">
          <div className="banner error">{response.error}</div>
          {response.detected && (
            <p className="muted">
              Đã nhận: {response.detected.kind}
              {response.detected.carrier ? ` · ${response.detected.carrier.name}` : ""} ·{" "}
              {response.detected.normalized}
            </p>
          )}
          {response.officialUrls.length > 0 && (
            <div className="links">
              {response.officialUrls.map((item) => (
                <a key={item.url} href={item.url} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
