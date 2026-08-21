import { NextRequest, NextResponse } from "next/server";
import { parseBulkQueries } from "@/lib/bulk";
import { trackShipment } from "@/lib/providers";
import type { ProviderKeys } from "@/lib/providers/keys";
import type { TrackResponse } from "@/lib/types";
import { addManyWatch } from "@/lib/watchlist";
import { watchFieldsFromResult } from "@/lib/watch-from-result";
import { queriesFromXlsx } from "@/lib/xlsx-strings";

export const runtime = "nodejs";
export const maxDuration = 120;

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) || 0 }, () => worker()));
  return out;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    queries?: string[];
    csv?: string;
    xlsxBase64?: string;
    watch?: boolean;
    keys?: ProviderKeys;
  };

  let queries = Array.isArray(body.queries) ? body.queries.map(String) : [];
  if (body.csv) queries = [...queries, ...parseBulkQueries(body.csv)];
  if (body.xlsxBase64) {
    try {
      queries = [...queries, ...queriesFromXlsx(Buffer.from(body.xlsxBase64, "base64"))];
    } catch {
      return NextResponse.json({ error: "Không đọc được file Excel. Xuất CSV rồi tải lại." }, { status: 400 });
    }
  }

  const unique = parseBulkQueries(queries.join("\n"));
  if (unique.length === 0) {
    return NextResponse.json({ error: "Không thấy số container, bill hoặc MMSI trong danh sách." }, { status: 400 });
  }

  const results = await mapPool(unique, 3, async (query) => {
    const response = await trackShipment({
      query,
      keys: body.keys,
      skipAisEnrich: true,
    });
    return { query, response };
  });

  let watchItems = undefined;
  if (body.watch) {
    const rows = results
      .map((row) => row.response)
      .filter((response): response is Extract<TrackResponse, { ok: true }> => response.ok)
      .map((response) => watchFieldsFromResult(response.result));
    if (rows.length) watchItems = await addManyWatch(rows);
  }

  return NextResponse.json({
    ok: true,
    count: unique.length,
    results,
    watchItems,
  });
}
