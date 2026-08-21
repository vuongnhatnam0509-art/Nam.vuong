"use client";

import { FormEvent, useState } from "react";

export function MmsiGuide({
  onSaved,
}: {
  onSaved?: (name: string, mmsi: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mmsi, setMmsi] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const res = await fetch("/api/vessels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mmsi }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(data.error || "Không lưu được.");
      return;
    }
    setMessage("Đã lưu. Lần sau gõ tên tàu là ra.");
    onSaved?.(name, mmsi);
  }

  return (
    <div className="mmsi-guide">
      <button type="button" className="linkish" onClick={() => setOpen((value) => !value)}>
        MMSI là gì?
      </button>
      {open && (
        <div className="mmsi-box">
          <p>
            <strong>MMSI</strong> (Maritime Mobile Service Identity) là <strong>số nhận dạng radio AIS 9 chữ số</strong>{" "}
            của con tàu — giống biển số, không phải số container hay bill of lading.
          </p>
          <ul>
            <li>AISStream chỉ lọc theo MMSI, nên app cần mã này để lấy vị trí live.</li>
            <li>IMO (7 số) là số đăng kiểm tàu; MMSI là số máy AIS đang phát.</li>
            <li>
              Tra MMSI:{" "}
              <a href="https://www.vesselfinder.com" target="_blank" rel="noreferrer">
                VesselFinder
              </a>{" "}
              → search tên tàu → copy MMSI 9 số.
            </li>
          </ul>
          <p>Đã có MMSI? Gắn vào tên để lần sau khỏi nhớ số:</p>
          <form className="mmsi-form" onSubmit={(event) => void onSubmit(event)}>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên tàu" />
            <input
              value={mmsi}
              onChange={(event) => setMmsi(event.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="MMSI 9 số"
              inputMode="numeric"
            />
            <button type="submit">Lưu vào sổ tàu</button>
          </form>
          {message && <p className="muted">{message}</p>}
        </div>
      )}
    </div>
  );
}
