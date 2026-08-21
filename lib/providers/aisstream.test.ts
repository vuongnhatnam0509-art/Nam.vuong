import { describe, expect, it } from "vitest";
import { applyAisEnvelope, finalizeAisPosition } from "./aisstream";
import { knownMmsi, suggestVessels } from "./known-mmsi";

describe("AISStream parser", () => {
  it("reads a PositionReport envelope from aisstream.io", () => {
    const draft = applyAisEnvelope(
      { mmsi: "353136000" },
      {
        MessageType: "PositionReport",
        MetaData: {
          MMSI: 353136000,
          ShipName: "EVER GIVEN          ",
          latitude: 1.27,
          longitude: 103.78,
          time_utc: "2026-08-21 07:40:00.000000 +0000 UTC",
        },
        Message: {
          PositionReport: {
            Cog: 180,
            Latitude: 1.27,
            Longitude: 103.78,
            NavigationalStatus: 1,
            Sog: 0.1,
            TrueHeading: 180,
            UserID: 353136000,
          },
        },
      },
    );
    const live = finalizeAisPosition(draft);
    expect(live).not.toBeNull();
    expect(live?.name).toBe("EVER GIVEN");
    expect(live?.lat).toBe(1.27);
    expect(live?.lng).toBe(103.78);
    expect(live?.speed).toBe(0.1);
    expect(live?.navStatus).toBe("At anchor");
    expect(live?.aisLive).toBe(true);
  });

  it("rejects invalid AIS coordinates", () => {
    const draft = applyAisEnvelope(
      { mmsi: "1" },
      {
        MessageType: "PositionReport",
        MetaData: { MMSI: 1, latitude: 91, longitude: 181 },
        Message: { PositionReport: { Latitude: 91, Longitude: 181, UserID: 1 } },
      },
    );
    expect(finalizeAisPosition(draft)).toBeNull();
  });

  it("maps public vessel names and IMO numbers to MMSI", () => {
    expect(knownMmsi("EVER GIVEN")).toBe("353136000");
    expect(knownMmsi("evergiven")).toBe("353136000");
    expect(knownMmsi("9811000")).toBe("353136000");
    expect(knownMmsi("MAERSK ESSEN")).toBe("219210000");
    expect(knownMmsi("CMA CGM MARCO POLO")).toBe("311000923");
    expect(knownMmsi("MSC GULSUN")).toBe("372003000");
    expect(knownMmsi("UNKNOWN STAR")).toBeUndefined();
  });

  it("suggests vessels by partial name", () => {
    const hits = suggestVessels("ever");
    expect(hits.some((row) => row.mmsi === "353136000")).toBe(true);
  });
});
