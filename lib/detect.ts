import { getCarrierByCode, getCarrierByPrefix } from "./carriers";
import { isContainerNumberShape, normalizeContainerNumber } from "./iso6346";
import { lookupMmsi } from "./providers/known-mmsi";
import type { Carrier, QueryKind } from "./types";

export type DetectedQuery = {
  kind: QueryKind | "unknown";
  normalized: string;
  carrier: Carrier | null;
};

const IMO_RE = /^(?:IMO\s*)?(\d{7})$/i;
const MMSI_RE = /^\d{9}$/;

export function isMmsiNumber(raw: string): boolean {
  return MMSI_RE.test(raw.trim().replace(/\s/g, ""));
}

export function isImoNumber(raw: string): boolean {
  const match = raw.trim().match(IMO_RE);
  if (!match) return false;
  return isValidImo(match[1]);
}

export function isValidImo(imo: string): boolean {
  if (!/^\d{7}$/.test(imo)) return false;
  let sum = 0;
  for (let i = 0; i < 6; i += 1) {
    sum += Number(imo[i]) * (7 - i);
  }
  return sum % 10 === Number(imo[6]);
}

export function looksLikeVesselName(raw: string): boolean {
  const value = raw.trim();
  if (value.length < 3 || value.length > 40) return false;
  if (!/[A-Za-z]/.test(value)) return false;
  if (/\d{6,}/.test(value.replace(/^IMO\s*/i, ""))) return false;
  return /[A-Za-z]{2,}[\s-]+[A-Za-z0-9]/.test(value) || /^(MV|MT|MS|SS)\s+/i.test(value);
}

export function detectQuery(
  raw: string,
  forcedKind?: "auto" | QueryKind,
  forcedCarrier?: string,
): DetectedQuery {
  const trimmed = raw.trim();
  const carrierHint = getCarrierByCode(forcedCarrier) ?? null;

  if (forcedKind && forcedKind !== "auto") {
    if (forcedKind === "container") {
      const normalized = normalizeContainerNumber(trimmed);
      return {
        kind: "container",
        normalized,
        carrier: carrierHint ?? getCarrierByPrefix(normalized),
      };
    }
    if (forcedKind === "bl") {
      return {
        kind: "bl",
        normalized: trimmed.toUpperCase().replace(/\s+/g, ""),
        carrier: carrierHint,
      };
    }
    const imo = trimmed.match(IMO_RE)?.[1];
    return {
      kind: "vessel",
      normalized: imo ?? trimmed.toUpperCase(),
      carrier: carrierHint,
    };
  }

  if (isContainerNumberShape(trimmed)) {
    const normalized = normalizeContainerNumber(trimmed);
    return {
      kind: "container",
      normalized,
      carrier: carrierHint ?? getCarrierByPrefix(normalized),
    };
  }

  if (isImoNumber(trimmed) || MMSI_RE.test(trimmed.replace(/\s/g, ""))) {
    const compact = trimmed.replace(/\s/g, "").toUpperCase().replace(/^IMO/, "");
    return { kind: "vessel", normalized: compact, carrier: carrierHint };
  }

  if (looksLikeVesselName(trimmed)) {
    return { kind: "vessel", normalized: trimmed.toUpperCase(), carrier: carrierHint };
  }

  if (lookupMmsi(trimmed) || lookupMmsi(trimmed.toUpperCase())) {
    return { kind: "vessel", normalized: trimmed.toUpperCase(), carrier: carrierHint };
  }

  if (/^[A-Z0-9-]{6,20}$/i.test(trimmed.replace(/\s+/g, ""))) {
    return {
      kind: "bl",
      normalized: trimmed.toUpperCase().replace(/\s+/g, ""),
      carrier: carrierHint,
    };
  }

  return { kind: "unknown", normalized: trimmed, carrier: carrierHint };
}
