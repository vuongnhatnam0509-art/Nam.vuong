import { NextRequest, NextResponse } from "next/server";
import { isMmsiNumber } from "@/lib/detect";
import { hasAisStream, subscribeAisPosition } from "@/lib/providers/aisstream";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function GET(request: NextRequest) {
  const mmsi = request.nextUrl.searchParams.get("mmsi") ?? "";
  if (!isMmsiNumber(mmsi)) {
    return NextResponse.json({ error: "Cần MMSI 9 số" }, { status: 400 });
  }
  if (!hasAisStream()) {
    return NextResponse.json(
      { error: "Live AIS trên bản đồ cần AISSTREAM_API_KEY trong .env.local trên máy chủ." },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  let cleanup = () => undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const stop = subscribeAisPosition(mmsi, undefined, {
        onPosition: (live) => send("position", live),
        onError: (error) => {
          send("error", { error: error.message });
          cleanup();
          try {
            controller.close();
          } catch {
            /* ignore */
          }
        },
      });
      const beat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);
      cleanup = () => {
        clearInterval(beat);
        stop();
      };
      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
