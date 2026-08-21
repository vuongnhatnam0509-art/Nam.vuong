import { NextRequest, NextResponse } from "next/server";
import { isMmsiNumber } from "@/lib/detect";
import { rememberVessel, searchVesselDirectory, vesselCatalog } from "@/lib/providers/vessel-directory";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const items = q.trim() ? await searchVesselDirectory(q) : (await vesselCatalog()).slice(0, 12);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    mmsi?: string;
    imo?: string;
  };
  const name = body.name?.trim();
  const mmsi = body.mmsi?.trim();
  if (!name || name.length < 3 || !mmsi || !isMmsiNumber(mmsi)) {
    return NextResponse.json(
      { error: "Cần tên tàu (≥3 ký tự) và MMSI 9 số. MMSI là mã radio AIS của tàu, không phải số container." },
      { status: 400 },
    );
  }
  await rememberVessel({ name, mmsi, imo: body.imo });
  return NextResponse.json({ ok: true, items: await searchVesselDirectory(name) });
}
