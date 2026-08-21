"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CARRIERS } from "@/lib/carriers";
import type { QueryKind, TrackResponse } from "@/lib/types";
import { ResultView } from "./ResultView";

const HISTORY_KEY = "ocean-track-history";
const KEYS_KEY = "ocean-track-keys";

type KindOption = "auto" | QueryKind;
type SavedKeys = { searates: string; shipsgo: string; jsoncargo: string };

function readKeys(): SavedKeys {
  const empty = { searates: "", shipsgo: "", jsoncargo: "" };
  if (typeof window === "undefined") return empty;
  try {
    const stored = JSON.parse(localStorage.getItem(KEYS_KEY) || "{}") as Partial<SavedKeys>;
    return {
      searates: stored.searates ?? "",
      shipsgo: stored.shipsgo ?? "",
      jsoncargo: stored.jsoncargo ?? "",
    };
  } catch {
    return empty;
  }
}

export function TrackerApp() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [kind, setKind] = useState<KindOption>((params.get("kind") as KindOption) || "auto");
  const [carrier, setCarrier] = useState(params.get("carrier") ?? "");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<TrackResponse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keys, setKeys] = useState<SavedKeys>(readKeys);
  const [envProviders, setEnvProviders] = useState<string[]>([]);
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
    void fetch("/api/track?status=1")
      .then((res) => res.json())
      .then((data: { liveProviders?: string[] }) => setEnvProviders(data.liveProviders ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const initial = params.get("q");
    if (initial) {
      void search(initial, (params.get("kind") as KindOption) || "auto", params.get("carrier") ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasLive = Boolean(keys.searates || keys.shipsgo || keys.jsoncargo || envProviders.length);

  const providersLabel = useMemo(() => {
    if (hasLive) return "Live: paste số container / bill / tàu";
    return "Chưa gắn API — mở Cài đặt để lấy dữ liệu hãng tàu";
  }, [hasLive]);

  function saveKeys(next: SavedKeys) {
    setKeys(next);
    localStorage.setItem(KEYS_KEY, JSON.stringify(next));
  }

  async function search(nextQuery: string, nextKind: KindOption, nextCarrier: string) {
    const q = nextQuery.trim();
    if (!q) return;
    setLoading(true);
    setQuery(q);
    setKind(nextKind);
    setCarrier(nextCarrier);

    const searchParams = new URLSearchParams({ q });
    if (nextKind !== "auto") searchParams.set("kind", nextKind);
    if (nextCarrier) searchParams.set("carrier", nextCarrier);
    router.replace(`/?${searchParams.toString()}`);

    const payloadKeys = {
      searates: keys.searates || undefined,
      shipsgo: keys.shipsgo || undefined,
      jsoncargo: keys.jsoncargo || undefined,
    };

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          kind: nextKind,
          carrier: nextCarrier || undefined,
          keys: payloadKeys,
        }),
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
          <p className="tag">Paste số container, bill hoặc tàu — lấy dữ liệu live từ hãng</p>
        </div>
        <div className="top-actions">
          <p className="provider-note">{providersLabel}</p>
          <button type="button" className="ghost" onClick={() => setSettingsOpen((open) => !open)}>
            Cài đặt API
          </button>
        </div>
      </header>

      {settingsOpen && (
        <section className="search-card">
          <h3 className="settings-title">Dán API key một lần, rồi chỉ việc paste số</h3>
          <p className="muted">
            Hãng tàu không cho lấy JSON công khai. Cần 1 key aggregator. Nên dùng{" "}
            <a href="https://www.searates.com/reference/tracking" target="_blank" rel="noreferrer">
              SeaRates
            </a>{" "}
            (tự nhận hãng, container + bill + AIS tàu) hoặc{" "}
            <a href="https://shipsgo.com" target="_blank" rel="noreferrer">
              ShipsGo
            </a>{" "}
            (phổ biến ở VN). Key lưu trên máy này, không đưa lên GitHub.
          </p>
          <label className="field">
            SeaRates API key
            <input
              type="password"
              value={keys.searates}
              onChange={(event) => saveKeys({ ...keys, searates: event.target.value.trim() })}
              placeholder="dán key SeaRates"
            />
          </label>
          <label className="field">
            ShipsGo auth code
            <input
              type="password"
              value={keys.shipsgo}
              onChange={(event) => saveKeys({ ...keys, shipsgo: event.target.value.trim() })}
              placeholder="tùy chọn"
            />
          </label>
          <label className="field">
            JSONCargo API key (tìm tàu theo tên/IMO)
            <input
              type="password"
              value={keys.jsoncargo}
              onChange={(event) => saveKeys({ ...keys, jsoncargo: event.target.value.trim() })}
              placeholder="tùy chọn"
            />
          </label>
        </section>
      )}

      {!hasLive && (
        <div className="banner error">
          Chưa có API key nên chưa lấy được dữ liệu live. Bấm <strong>Cài đặt API</strong>, dán SeaRates
          hoặc ShipsGo key, rồi paste số container/bill.
        </div>
      )}

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
              placeholder="Paste số container, bill hoặc IMO/tên tàu"
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
