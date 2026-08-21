import { NextRequest, NextResponse } from "next/server";
import { addWatch, listWatch, removeWatch } from "@/lib/watchlist";
import type { QueryKind } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ items: await listWatch() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    query?: string;
    kind?: QueryKind;
    carrier?: string | null;
    status?: string | null;
    origin?: string | null;
    destination?: string | null;
    etd?: string | null;
    eta?: string | null;
    vessel?: string | null;
    voyage?: string | null;
    lastEvent?: string | null;
  };
  if (!body.query) {
    return NextResponse.json({ error: "Thiếu số shipment" }, { status: 400 });
  }
  const items = await addWatch({
    query: body.query,
    kind: body.kind ?? "container",
    carrier: body.carrier,
    status: body.status,
    origin: body.origin,
    destination: body.destination,
    etd: body.etd,
    eta: body.eta,
    vessel: body.vessel,
    voyage: body.voyage,
    lastEvent: body.lastEvent,
  });
  return NextResponse.json({ items });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const items = await removeWatch(id);
  return NextResponse.json({ items });
}
