export type QueryKind = "container" | "bl" | "vessel";

export type CarrierCode =
  | "MAERSK"
  | "MSC"
  | "CMA_CGM"
  | "HAPAG_LLOYD"
  | "ONE"
  | "EVERGREEN"
  | "COSCO"
  | "OOCL"
  | "ZIM"
  | "HMM"
  | "YANG_MING"
  | "PIL"
  | "WAN_HAI"
  | "YANGMING";

export type Carrier = {
  code: string;
  name: string;
  nameVi: string;
  scac: string[];
  jsoncargo?: string;
  shipsgo?: string;
};

export type TrackingEvent = {
  time: string | null;
  status: string;
  location: string | null;
  vessel: string | null;
  voyage: string | null;
  isActual: boolean;
};

export type VesselInfo = {
  name: string;
  voyage?: string | null;
  imo?: string | null;
  mmsi?: string | null;
  lat?: number | null;
  lng?: number | null;
  speed?: number | null;
  heading?: number | null;
  course?: number | null;
  destination?: string | null;
  flag?: string | null;
  navStatus?: string | null;
  lastPositionAt?: string | null;
  eta?: string | null;
};

export type TrackingResult = {
  kind: QueryKind;
  query: string;
  source: "searates" | "jsoncargo" | "shipsgo" | "demo";
  carrier: Carrier | null;
  containerNumber?: string | null;
  billOfLading?: string | null;
  bookingNumber?: string | null;
  containerType?: string | null;
  status?: string | null;
  origin?: string | null;
  originTerminal?: string | null;
  destination?: string | null;
  destinationTerminal?: string | null;
  loadingPort?: string | null;
  dischargingPort?: string | null;
  atd?: string | null;
  eta?: string | null;
  lastLocation?: string | null;
  nextLocation?: string | null;
  vessel?: VesselInfo | null;
  events: TrackingEvent[];
  relatedContainers?: string[];
  officialUrls: { label: string; url: string }[];
  lastUpdated?: string | null;
};

export type WatchItem = {
  id: string;
  query: string;
  kind: QueryKind;
  carrier?: string | null;
  status?: string | null;
  origin?: string | null;
  destination?: string | null;
  etd?: string | null;
  eta?: string | null;
  vessel?: string | null;
  voyage?: string | null;
  lastEvent?: string | null;
  watchedAt: string;
  refreshedAt?: string | null;
};

export type TrackRequest = {
  query: string;
  kind?: "auto" | QueryKind;
  carrier?: string;
  keys?: {
    searates?: string;
    shipsgo?: string;
    jsoncargo?: string;
  };
};

export type TrackResponse =
  | { ok: true; result: TrackingResult; demo: boolean; liveProviders: string[] }
  | {
      ok: false;
      error: string;
      code: string;
      detected?: {
        kind: QueryKind | "unknown";
        carrier: Carrier | null;
        normalized: string;
      };
      officialUrls: { label: string; url: string }[];
      liveProviders: string[];
    };
