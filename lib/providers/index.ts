import { officialTrackingUrls } from "../carriers";
import { detectQuery, isMmsiNumber } from "../detect";
import type { TrackRequest, TrackResponse, TrackingResult } from "../types";
import {
  enrichWithAisStream,
  hasAisStream,
  trackVesselAisStream,
} from "./aisstream";
import { getDemoResult } from "./demo";
import {
  hasJsonCargo,
  trackBillJsonCargo,
  trackContainerJsonCargo,
  trackVesselJsonCargo,
} from "./jsoncargo";
import { knownMmsi } from "./known-mmsi";
import { liveProviderNames } from "./keys";
import { hasSeaRates, trackWithSeaRates } from "./searates";
import { hasShipsGo, trackWithShipsGo } from "./shipsgo";

function fail(
  error: string,
  code: string,
  providers: string[],
  detected: ReturnType<typeof detectQuery>,
  urls: { label: string; url: string }[],
): TrackResponse {
  return {
    ok: false,
    error,
    code,
    detected,
    officialUrls: urls,
    liveProviders: providers,
  };
}

export async function trackShipment(input: TrackRequest): Promise<TrackResponse> {
  const query = input.query?.trim() ?? "";
  const keys = input.keys;
  const providers = liveProviderNames(keys);

  if (!query) {
    return {
      ok: false,
      error: "Nhập số container, số bill hoặc MMSI/tên/IMO tàu.",
      code: "empty",
      officialUrls: [],
      liveProviders: providers,
    };
  }

  const detected = detectQuery(query, input.kind, input.carrier);
  const urls = officialTrackingUrls(
    detected.normalized,
    detected.kind === "unknown" ? "container" : detected.kind,
    detected.carrier,
  );

  if (detected.kind === "unknown") {
    return fail(
      "Không nhận diện được loại mã. Chọn Container, Bill of Lading hoặc Tàu.",
      "undetected",
      providers,
      detected,
      urls,
    );
  }

  if (input.demo) {
    const demo = getDemoResult(detected.kind, detected.normalized);
    if (demo) {
      return { ok: true, result: demo, demo: true, liveProviders: providers };
    }
    return fail(
      "Không có dữ liệu mẫu cho mã này. Mẫu chỉ có vài số cố định — không phải live API.",
      "demo_not_found",
      providers,
      detected,
      urls,
    );
  }

  const errors: string[] = [];

  if (detected.kind === "vessel") {
    const mmsi = knownMmsi(detected.normalized) ?? (isMmsiNumber(detected.normalized) ? detected.normalized : undefined);

    if (hasAisStream(keys) && mmsi) {
      try {
        const result = await trackVesselAisStream(mmsi, keys);
        return { ok: true, result, demo: false, liveProviders: providers };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "AISStream vessel error");
      }
    }

    if (hasJsonCargo(keys)) {
      try {
        const result = await enrichWithAisStream(
          await trackVesselJsonCargo(detected.normalized, keys),
          keys,
        );
        return { ok: true, result, demo: false, liveProviders: providers };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "JSONCargo vessel error");
      }
    }

    if (hasAisStream(keys) && !mmsi) {
      return fail(
        "AISStream lọc theo MMSI. Tên tàu chỉ tra được nếu có trong bảng công khai (Ever Given, Maersk Essen, CMA CGM Marco Polo, OOCL Hong Kong) hoặc JSONCargo. Hoặc nhập MMSI 9 số.",
        "need_mmsi",
        providers,
        detected,
        urls,
      );
    }

    return fail(
      errors[0] ||
        "Chưa có nguồn live cho tàu. Dán AISSTREAM_API_KEY (miễn phí tại aisstream.io, đăng nhập GitHub) rồi nhập MMSI 9 số. Tìm theo tên/IMO cần JSONCargo. App không trả dữ liệu mẫu trừ khi bấm «Xem mẫu».",
      providers.length ? "not_found" : "no_provider",
      providers,
      detected,
      urls,
    );
  }

  async function liveOrThrow(result: TrackingResult) {
    if (input.skipAisEnrich) return result;
    return enrichWithAisStream(result, keys);
  }

  if (hasSeaRates(keys)) {
    try {
      const result = await liveOrThrow(
        await trackWithSeaRates(detected.kind, detected.normalized, detected.carrier, keys),
      );
      return { ok: true, result, demo: false, liveProviders: providers };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "SeaRates error");
    }
  }

  if (hasJsonCargo(keys)) {
    try {
      const result = await liveOrThrow(
        detected.kind === "bl"
          ? await trackBillJsonCargo(detected.normalized, detected.carrier, keys)
          : await trackContainerJsonCargo(detected.normalized, detected.carrier, keys),
      );
      return { ok: true, result, demo: false, liveProviders: providers };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "JSONCargo error");
    }
  }

  if (hasShipsGo(keys)) {
    try {
      const result = await liveOrThrow(
        await trackWithShipsGo(detected.kind, detected.normalized, detected.carrier, keys),
      );
      return { ok: true, result, demo: false, liveProviders: providers };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "ShipsGo error");
    }
  }

  if (hasAisStream(keys) && providers.length === 1) {
    return fail(
      "AISStream chỉ cho vị trí tàu theo MMSI, không tra được số container hay bill of lading. Cần SeaRates hoặc ShipsGo key cho shipment live.",
      "ais_not_for_container",
      providers,
      detected,
      urls,
    );
  }

  return fail(
    errors[0] ||
      "Chưa có API live cho container/B/L. Dán SeaRates hoặc ShipsGo key trong Cài đặt / .env.local. App không bịa lịch trình — dữ liệu mẫu chỉ hiện khi bấm «Xem mẫu».",
    providers.length ? "not_found" : "no_provider",
    providers,
    detected,
    urls,
  );
}
