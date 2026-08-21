"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CARRIERS } from "@/lib/carriers";
import { KNOWN_VESSELS } from "@/lib/providers/known-mmsi";
import type { QueryKind, TrackResponse, WatchItem } from "@/lib/types";
import { watchFieldsFromResult } from "@/lib/watch-from-result";
import { BulkSearch } from "./BulkSearch";
import { ResultView } from "./ResultView";
import { ScheduleBoard } from "./ScheduleBoard";
import { WatchPanel } from "./WatchPanel";

const HISTORY_KEY = "ocean-track-history";
const KEYS_KEY = "ocean-track-keys";

type KindOption = "auto" | QueryKind;
type AppTab = "shipment" | "schedule" | "watch";
type SavedKeys = { searates: string; shipsgo: string; jsoncargo: string; aisstream: string };

function readKeys(): SavedKeys {
  const empty = { searates: "", shipsgo: "", jsoncargo: "", aisstream: "" };
  if (typeof window === "undefined") return empty;
  try {
    const stored = JSON.parse(localStorage.getItem(KEYS_KEY) || "{}") as Partial<SavedKeys>;
    return {
      searates: stored.searates ?? "",
      shipsgo: stored.shipsgo ?? "",
      jsoncargo: stored.jsoncargo ?? "",
      aisstream: stored.aisstream ?? "",
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
  const [tab, setTab] = useState<AppTab>("shipment");
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [watchRefreshing, setWatchRefreshing] = useState(false);
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
    void fetch("/api/watchlist")
      .then((res) => res.json())
      .then((data: { items?: WatchItem[] }) => setWatchlist(data.items ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const initial = params.get("q");
    if (initial) {
      void search(
        initial,
        (params.get("kind") as KindOption) || "auto",
        params.get("carrier") ?? "",
        params.get("demo") === "1",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasLive = Boolean(keys.searates || keys.shipsgo || keys.jsoncargo || keys.aisstream || envProviders.length);

  const providersLabel = useMemo(() => {
    const names = [...new Set([...envProviders, ...(keys.aisstream ? ["AISStream"] : []), ...(keys.searates ? ["SeaRates"] : []), ...(keys.jsoncargo ? ["JSONCargo"] : []), ...(keys.shipsgo ? ["ShipsGo"] : [])])];
    if (names.length) return `Live: ${names.join(" · ")}`;
    return "Chưa gắn API — app không bịa dữ liệu";
  }, [envProviders, keys]);

  function saveKeys(next: SavedKeys) {
    setKeys(next);
    localStorage.setItem(KEYS_KEY, JSON.stringify(next));
  }

  function payloadKeys() {
    return {
      searates: keys.searates || undefined,
      shipsgo: keys.shipsgo || undefined,
      jsoncargo: keys.jsoncargo || undefined,
      aisstream: keys.aisstream || undefined,
    };
  }

  async function search(nextQuery: string, nextKind: KindOption, nextCarrier: string, demo = false) {
    const q = nextQuery.trim();
    if (!q) return;
    setLoading(true);
    setQuery(q);
    setKind(nextKind);
    setCarrier(nextCarrier);

    const searchParams = new URLSearchParams({ q });
    if (nextKind !== "auto") searchParams.set("kind", nextKind);
    if (nextCarrier) searchParams.set("carrier", nextCarrier);
    if (demo) searchParams.set("demo", "1");
    router.replace(`/?${searchParams.toString()}`);

    const payloadKeysBody = payloadKeys();

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          kind: nextKind,
          carrier: nextCarrier || undefined,
          demo,
          keys: payloadKeysBody,
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

  async function watchCurrent() {
    if (!response?.ok) return;
    const fields = watchFieldsFromResult(response.result);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = (await res.json()) as { items?: WatchItem[] };
    setWatchlist(data.items ?? []);
    setTab("watch");
  }

  async function unwatch(id: string) {
    const res = await fetch(`/api/watchlist?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json()) as { items?: WatchItem[] };
    setWatchlist(data.items ?? []);
  }

  async function refreshWatch() {
    if (watchRefreshing) return;
    setWatchRefreshing(true);
    try {
      const res = await fetch("/api/watchlist/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: payloadKeys() }),
      });
      const data = (await res.json()) as { items?: WatchItem[] };
      setWatchlist(data.items ?? []);
    } finally {
      setWatchRefreshing(false);
    }
  }

  useEffect(() => {
    if (tab !== "watch" || watchlist.length === 0) return;
    const id = window.setInterval(() => {
      void refreshWatch();
    }, 180_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, watchlist.length]);

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="logo">OceanTrack</p>
          <p className="tag">Gọi API live — container/B/L qua SeaRates, vị trí tàu qua AISStream</p>
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
          <h3 className="settings-title">Admin dán key — app mới gọi API live</h3>
          <p className="muted">
            Không có key thì <strong>không có dữ liệu</strong> (trừ nút «Xem mẫu»). Nên ghi key vào{" "}
            <code>.env.local</code> trên máy chủ nội bộ để mọi phòng mở cùng URL là live.
          </p>
          <label className="field">
            AISStream API key — vị trí tàu live (miễn phí)
            <input
              type="password"
              value={keys.aisstream}
              onChange={(event) => saveKeys({ ...keys, aisstream: event.target.value.trim() })}
              placeholder="aisstream.io — đăng nhập GitHub"
            />
          </label>
          <p className="muted">
            Repo:{" "}
            <a href="https://github.com/aisstream/aisstream" target="_blank" rel="noreferrer">
              aisstream/aisstream
            </a>
            . Tạo key:{" "}
            <a href="https://aisstream.io" target="_blank" rel="noreferrer">
              aisstream.io
            </a>
            . Chỉ lọc theo <strong>MMSI 9 số</strong> — không tra container/B/L.
          </p>
          <label className="field">
            SeaRates API key — container + bill + lịch tàu (trả phí)
            <input
              type="password"
              value={keys.searates}
              onChange={(event) => saveKeys({ ...keys, searates: event.target.value.trim() })}
              placeholder="dán key SeaRates"
            />
          </label>
          <label className="field">
            ShipsGo auth code — container/B/L
            <input
              type="password"
              value={keys.shipsgo}
              onChange={(event) => saveKeys({ ...keys, shipsgo: event.target.value.trim() })}
              placeholder="tùy chọn"
            />
          </label>
          <label className="field">
            JSONCargo API key — đổi tên/IMO tàu → MMSI
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
          Chưa có API key nên chưa lấy được dữ liệu live. Admin dán AISStream (tàu) và/hoặc SeaRates (container/B/L)
          trong Cài đặt hoặc file <code>.env.local</code>. App sẽ không trả lịch trình giả.
        </div>
      )}

      <div className="tabs app-tabs">
        {(
          [
            ["shipment", "Shipment"],
            ["schedule", "Lịch tàu"],
            ["watch", `Theo dõi (${watchlist.length})`],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" className={tab === value ? "active" : ""} onClick={() => setTab(value)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "schedule" && <ScheduleBoard keys={{ searates: keys.searates || undefined }} />}

      {tab === "watch" && (
        <WatchPanel
          items={watchlist}
          refreshing={watchRefreshing}
          onRefresh={() => void refreshWatch()}
          onOpen={(nextQuery, nextKind, nextCarrier) => {
            setTab("shipment");
            void search(nextQuery, nextKind, nextCarrier);
          }}
          onRemove={(id) => void unwatch(id)}
        />
      )}

      {tab === "shipment" && (
        <>
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
              placeholder="Container, bill, MMSI, hoặc tên tàu (Ever Given…)"
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
              {loading ? "Đang gọi API…" : "Tra cứu live"}
            </button>
          </div>
        </form>

        <div className="hints">
          <span>Tàu theo tên (AIS):</span>
          {KNOWN_VESSELS.map((ship) => (
            <button key={ship.mmsi} type="button" onClick={() => void search(ship.name, "vessel", "")}>
              {ship.name}
            </button>
          ))}
        </div>

        <div className="hints">
          <span>Muốn xem giao diện thôi:</span>
          <button type="button" onClick={() => void search("MSKU3900520", "container", "", true)}>
            Xem mẫu (không live)
          </button>
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

      <BulkSearch
        keys={payloadKeys()}
        onOpen={(nextQuery) => void search(nextQuery, "auto", "")}
        onWatchlist={(items) => {
          setWatchlist(items);
          setTab("watch");
        }}
      />

      {response?.ok && <ResultView result={response.result} demo={response.demo} onWatch={() => void watchCurrent()} />}

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
        </>
      )}
    </div>
  );
}
