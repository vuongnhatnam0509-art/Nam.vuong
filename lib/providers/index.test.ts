import { describe, expect, it } from "vitest";
import { trackShipment } from "./index";

describe("trackShipment demo", () => {
  it("returns Maersk demo container data without API keys", async () => {
    const response = await trackShipment({ query: "MSKU3900520" });
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.demo).toBe(true);
    expect(response.result.carrier?.code).toBe("MAERSK");
    expect(response.result.events.length).toBeGreaterThan(3);
  });

  it("returns vessel demo data", async () => {
    const response = await trackShipment({ query: "EVER GIVEN", kind: "vessel" });
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.vessel?.imo).toBe("9811000");
  });
});
