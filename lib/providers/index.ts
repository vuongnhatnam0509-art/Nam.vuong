import { officialTrackingUrls } from "../carriers";
import { detectQuery } from "../detect";
import type { TrackRequest, TrackResponse } from "../types";
import { getDemoResult } from "./demo";
import {
  hasJsonCargo,
  trackBillJsonCargo,
  trackContainerJsonCargo,
  trackVesselJsonCargo,
} from "./jsoncargo";
import { liveProviderNames } from "./keys";
import { hasSeaRates, trackWithSeaRates } from "./searates";
import { hasShipsGo, trackWithShipsGo } from "./shipsgo";

export async function trackShipment(input: TrackRequest): Promise<TrackResponse> {
  const query = input.query?.trim() ?? "";
  const keys = input.keys;
  const providers = liveProviderNames(keys);

  if (!query) {
    return {
      ok: false,
      error: "Nhập số container, số bill hoặc tên/IMO tàu.",
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
    return {
      ok: false,
      error: "Không nhận diện được loại mã. Chọn Container, Bill of Lading hoặc Tàu.",
      code: "undetected",
      detected,
      officialUrls: urls,
      liveProviders: providers,
    };
  }

  const errors: string[] = [];

  if (detected.kind === "vessel") {
    if (hasJsonCargo(keys)) {
      try {
        const result = await trackVesselJsonCargo(detected.normalized, keys);
        return { ok: true, result, demo: false, liveProviders: providers };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "JSONCargo vessel error");
      }
    }
    const demo = getDemoResult(detected.kind, detected.normalized);
    if (demo && providers.length === 0) {
      return { ok: true, result: demo, demo: true, liveProviders: providers };
    }
    return {
      ok: false,
      error:
        errors[0] ||
        "Tìm tàu theo tên/IMO cần JSONCargo API key. Container và bill dùng SeaRates hoặc ShipsGo.",
      code: providers.length ? "not_found" : "no_provider",
      detected,
      officialUrls: urls,
      liveProviders: providers,
    };
  }

  if (hasSeaRates(keys)) {
    try {
      const result = await trackWithSeaRates(detected.kind, detected.normalized, detected.carrier, keys);
      return { ok: true, result, demo: false, liveProviders: providers };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "SeaRates error");
    }
  }

  if (hasJsonCargo(keys)) {
    try {
      const result =
        detected.kind === "bl"
          ? await trackBillJsonCargo(detected.normalized, detected.carrier, keys)
          : await trackContainerJsonCargo(detected.normalized, detected.carrier, keys);
      return { ok: true, result, demo: false, liveProviders: providers };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "JSONCargo error");
    }
  }

  if (hasShipsGo(keys)) {
    try {
      const result = await trackWithShipsGo(detected.kind, detected.normalized, detected.carrier, keys);
      return { ok: true, result, demo: false, liveProviders: providers };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "ShipsGo error");
    }
  }

  const demo = getDemoResult(detected.kind, detected.normalized);
  if (demo && providers.length === 0) {
    return { ok: true, result: demo, demo: true, liveProviders: providers };
  }

  return {
    ok: false,
    error:
      errors[0] ||
      "Chưa có API key. Mở Cài đặt, dán SeaRates hoặc ShipsGo key một lần — sau đó chỉ việc paste số container/bill.",
    code: providers.length ? "not_found" : "no_provider",
    detected,
    officialUrls: urls,
    liveProviders: providers,
  };
}
