import { describe, expect, it } from "vitest";
import { detectQuery, isImoNumber } from "./detect";

describe("detectQuery", () => {
  it("detects a container number and Maersk prefix", () => {
    const detected = detectQuery("msku3900520");
    expect(detected.kind).toBe("container");
    expect(detected.normalized).toBe("MSKU3900520");
    expect(detected.carrier?.code).toBe("MAERSK");
  });

  it("detects a vessel name", () => {
    expect(detectQuery("Maersk Essen").kind).toBe("vessel");
  });

  it("detects IMO numbers", () => {
    expect(isImoNumber("IMO 9811000")).toBe(true);
    expect(detectQuery("9811000").kind).toBe("vessel");
  });

  it("detects bill of lading numbers", () => {
    const detected = detectQuery("MAEU918273645");
    expect(detected.kind).toBe("bl");
  });

  it("honors a forced kind", () => {
    expect(detectQuery("MAEU918273645", "container").kind).toBe("container");
  });
});
