import { NextRequest, NextResponse } from "next/server";
import { refreshWatchlist } from "@/lib/watchlist";
import type { ProviderKeys } from "@/lib/providers/keys";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { keys?: ProviderKeys };
  const items = await refreshWatchlist(body.keys);
  return NextResponse.json({ items });
}
