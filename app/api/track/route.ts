import { NextRequest, NextResponse } from "next/server";
import { trackShipment } from "@/lib/providers";
import type { QueryKind } from "@/lib/types";

export const runtime = "nodejs";

function parseKind(value: string | null): "auto" | QueryKind | undefined {
  if (!value) return undefined;
  if (value === "auto" || value === "container" || value === "bl" || value === "vessel") {
    return value;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const result = await trackShipment({
    query: searchParams.get("q") ?? searchParams.get("query") ?? "",
    kind: parseKind(searchParams.get("kind")),
    carrier: searchParams.get("carrier") ?? undefined,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    query?: string;
    q?: string;
    kind?: string;
    carrier?: string;
  };
  const result = await trackShipment({
    query: body.query ?? body.q ?? "",
    kind: parseKind(body.kind ?? null),
    carrier: body.carrier,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
