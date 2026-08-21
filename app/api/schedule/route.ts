import { NextRequest, NextResponse } from "next/server";
import { searchSchedules } from "@/lib/providers/schedules";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    origin?: string;
    destination?: string;
    fromDate?: string;
    weeks?: number;
    carrier?: string;
    keys?: { searates?: string };
  };
  const result = await searchSchedules({
    origin: body.origin ?? "",
    destination: body.destination ?? "",
    fromDate: body.fromDate,
    weeks: body.weeks,
    carrier: body.carrier,
    keys: body.keys,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
