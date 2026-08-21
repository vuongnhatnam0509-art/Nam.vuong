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
import { hasShipsGo, trackWithShipsGo } from "./shipsgo";

export function liveProviders(): string[] {
  const names: string[] = [];
  if (hasJsonCargo()) names.push("JSONCargo");
  if (hasShipsGo()) names.push("ShipsGo");
  return names;
}

export async function trackShipment(input: TrackRequest): Promise<TrackResponse> {
  const query = input.query?.trim() ?? "";
  const providers = liveProviders();

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

  const demo = getDemoResult(detected.kind, detected.normalized);
  const errors: string[] = [];

  if (detected.kind === "vessel") {
    if (hasJsonCargo()) {
      try {
        const result = await trackVesselJsonCargo(detected.normalized);
        return { ok: true, result, demo: false, liveProviders: providers };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "JSONCargo vessel error");
      }
    }
    if (demo) {
      return { ok: true, result: demo, demo: true, liveProviders: providers };
    }
    return {
      ok: false,
      error: errors[0] || "Chưa có API key tàu (JSONCARGO_API_KEY). Dùng mẫu MAERSK ESSEN hoặc EVER GIVEN.",
      code: providers.length ? "not_found" : "no_provider",
      detected,
      officialUrls: urls,
      liveProviders: providers,
    };
  }

  if (hasJsonCargo()) {
    try {
      const result =
        detected.kind === "bl"
          ? await trackBillJsonCargo(detected.normalized, detected.carrier)
          : await trackContainerJsonCargo(detected.normalized, detected.carrier);
      return { ok: true, result, demo: false, liveProviders: providers };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "JSONCargo error");
    }
  }

  if (hasShipsGo()) {
    try {
      const result = await trackWithShipsGo(detected.kind, detected.normalized, detected.carrier);
      return { ok: true, result, demo: false, liveProviders: providers };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "ShipsGo error");
    }
  }

  if (demo) {
    return { ok: true, result: demo, demo: true, liveProviders: providers };
  }

  return {
    ok: false,
    error:
      errors[0] ||
      (providers.length
        ? "Không tìm thấy lô hàng trên API."
        : "Chưa cấu hình API. Thêm JSONCARGO_API_KEY hoặc SHIPSGO_AUTH_CODE, hoặc thử mã demo MSKU3900520."),
    code: providers.length ? "not_found" : "no_provider",
    detected,
    officialUrls: urls,
    liveProviders: providers,
  };
}
