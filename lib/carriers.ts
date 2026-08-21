import type { Carrier } from "./types";

export const CARRIERS: Carrier[] = [
  {
    code: "MAERSK",
    name: "Maersk",
    nameVi: "Maersk",
    scac: ["MAEU", "SEAU", "SAFM", "MCPU"],
    jsoncargo: "MAERSK",
    shipsgo: "Maersk",
  },
  {
    code: "MSC",
    name: "MSC",
    nameVi: "Mediterranean Shipping Company",
    scac: ["MSCU", "MEDU"],
    jsoncargo: "MSC",
    shipsgo: "MSC",
  },
  {
    code: "CMA_CGM",
    name: "CMA CGM",
    nameVi: "CMA CGM",
    scac: ["CMDU", "CMCU", "ANRM"],
    jsoncargo: "CMA_CGM",
    shipsgo: "CMA CGM",
  },
  {
    code: "HAPAG_LLOYD",
    name: "Hapag-Lloyd",
    nameVi: "Hapag-Lloyd",
    scac: ["HLCU", "HLXU"],
    jsoncargo: "HAPAG_LLOYD",
    shipsgo: "Hapag-Lloyd",
  },
  {
    code: "ONE",
    name: "Ocean Network Express",
    nameVi: "ONE",
    scac: ["ONEY", "NYKS", "MOLU", "KKTU"],
    jsoncargo: "ONE",
    shipsgo: "ONE",
  },
  {
    code: "EVERGREEN",
    name: "Evergreen",
    nameVi: "Evergreen",
    scac: ["EGLV", "EISU"],
    jsoncargo: "EVERGREEN",
    shipsgo: "Evergreen",
  },
  {
    code: "COSCO",
    name: "COSCO",
    nameVi: "COSCO Shipping",
    scac: ["COSU", "CSCL"],
    jsoncargo: "COSCO",
    shipsgo: "COSCO",
  },
  {
    code: "OOCL",
    name: "OOCL",
    nameVi: "OOCL",
    scac: ["OOLU"],
    jsoncargo: "COSCO",
    shipsgo: "OOCL",
  },
  {
    code: "HMM",
    name: "HMM",
    nameVi: "HMM (Hyundai)",
    scac: ["HDMU", "HMMU"],
    jsoncargo: "HMM",
    shipsgo: "HMM",
  },
  {
    code: "YANG_MING",
    name: "Yang Ming",
    nameVi: "Yang Ming",
    scac: ["YMLU"],
    jsoncargo: "YANG_MING",
    shipsgo: "Yang Ming",
  },
  {
    code: "ZIM",
    name: "ZIM",
    nameVi: "ZIM",
    scac: ["ZIMU"],
    jsoncargo: "ZIM",
    shipsgo: "ZIM",
  },
  {
    code: "PIL",
    name: "PIL",
    nameVi: "Pacific International Lines",
    scac: ["PCIU"],
    jsoncargo: "PIL",
    shipsgo: "PIL",
  },
  {
    code: "WAN_HAI",
    name: "Wan Hai",
    nameVi: "Wan Hai",
    scac: ["WHLC", "WHLU"],
    shipsgo: "Wan Hai",
  },
];

const PREFIX_TO_CODE: Record<string, string> = {
  MSKU: "MAERSK",
  MRKU: "MAERSK",
  MWMU: "MAERSK",
  SUDU: "MAERSK",
  PONU: "MAERSK",
  MAEU: "MAERSK",
  MAAU: "MAERSK",
  MCAU: "MAERSK",
  MCRU: "MAERSK",
  SEAU: "MAERSK",
  HASU: "MAERSK",
  MSCU: "MSC",
  MEDU: "MSC",
  MSMU: "MSC",
  MSDU: "MSC",
  MSTU: "MSC",
  CMAU: "CMA_CGM",
  CGMU: "CMA_CGM",
  ECMU: "CMA_CGM",
  FCIU: "CMA_CGM",
  GESU: "CMA_CGM",
  TRHU: "CMA_CGM",
  HLCU: "HAPAG_LLOYD",
  HLXU: "HAPAG_LLOYD",
  HAMU: "HAPAG_LLOYD",
  UACU: "HAPAG_LLOYD",
  ONEU: "ONE",
  NYKU: "ONE",
  MOLU: "ONE",
  KKTU: "ONE",
  MOSU: "ONE",
  KKFU: "ONE",
  EMCU: "EVERGREEN",
  EGSU: "EVERGREEN",
  EISU: "EVERGREEN",
  EGHU: "EVERGREEN",
  EGCU: "EVERGREEN",
  EITU: "EVERGREEN",
  COSU: "COSCO",
  CBHU: "COSCO",
  CCLU: "COSCO",
  CSNU: "COSCO",
  OOLU: "OOCL",
  OOCU: "OOCL",
  HMMU: "HMM",
  HDMU: "HMM",
  YMLU: "YANG_MING",
  YMMU: "YANG_MING",
  ZIMU: "ZIM",
  ZCSU: "ZIM",
  PCIU: "PIL",
  PILU: "PIL",
  WHLU: "WAN_HAI",
  WHSU: "WAN_HAI",
};

export function getCarrierByCode(code?: string | null): Carrier | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return (
    CARRIERS.find(
      (c) =>
        c.code === normalized ||
        c.jsoncargo === normalized ||
        c.scac.includes(normalized) ||
        c.name.toUpperCase() === code.trim().toUpperCase() ||
        c.shipsgo?.toUpperCase() === code.trim().toUpperCase(),
    ) ?? null
  );
}

export function getCarrierByPrefix(containerOrPrefix: string): Carrier | null {
  const prefix = containerOrPrefix
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .slice(0, 4);
  const code = PREFIX_TO_CODE[prefix];
  return code ? getCarrierByCode(code) : null;
}

export function officialTrackingUrls(
  query: string,
  kind: "container" | "bl" | "vessel" | "unknown",
  carrier?: Carrier | null,
): { label: string; url: string }[] {
  const q = encodeURIComponent(query.trim());
  const urls: { label: string; url: string }[] = [];

  if (kind === "vessel") {
    urls.push({
      label: "VesselFinder",
      url: `https://www.vesselfinder.com/vessels?name=${q}`,
    });
    urls.push({
      label: "MarineTraffic",
      url: `https://www.marinetraffic.com/en/ais/index/search/all?keyword=${q}`,
    });
    return urls;
  }

  const byCarrier: Record<string, (value: string) => string> = {
    MAERSK: (value) => `https://www.maersk.com/tracking/${value}`,
    MSC: (value) =>
      `https://www.msc.com/track-a-shipment?query=${encodeURIComponent(value)}`,
    CMA_CGM: (value) =>
      `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=${kind === "bl" ? "BL" : "Container"}&SearchValue=${encodeURIComponent(value)}`,
    HAPAG_LLOYD: (value) =>
      `https://www.hapag-lloyd.com/en/online-business/tracing/tracing-by-container.html?container=${encodeURIComponent(value)}`,
    ONE: () => "https://ecomm.one-line.com/ecom/CUP_HOM_3301.do",
    EVERGREEN: () => "https://www.shipmentlink.com/servlet/TDB1_CargoTracking.do",
    COSCO: () => "https://elines.coscoshipping.com/ebusiness/cargoTracking",
    OOCL: () =>
      "https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx",
    HMM: () => "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
    YANG_MING: () =>
      "https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx",
    ZIM: (value) =>
      `https://www.zim.com/tools/track-a-shipment?consnumber=${encodeURIComponent(value)}`,
    PIL: () => "https://www.pilship.com/en-/120.html",
    WAN_HAI: () => "https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml",
  };

  if (carrier && byCarrier[carrier.code]) {
    urls.push({
      label: `Trang ${carrier.name}`,
      url: byCarrier[carrier.code](query.trim()),
    });
  } else {
    urls.push({
      label: "Maersk",
      url: `https://www.maersk.com/tracking/${query.trim()}`,
    });
    urls.push({
      label: "MSC",
      url: `https://www.msc.com/track-a-shipment?query=${q}`,
    });
  }

  urls.push({
    label: "Searates",
    url: `https://www.searates.com/container/tracking/?number=${q}&type=${kind === "bl" ? "BL" : "CT"}&sealine=auto`,
  });

  return urls;
}
