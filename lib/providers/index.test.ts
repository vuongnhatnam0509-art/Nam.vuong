import { describe, expect, it } from "vitest";
import { trackShipment } from "./index";

delete process.env.AISSTREAM_API_KEY;
delete process.env.SEARATES_API_KEY;
delete process.env.SHIPSGO_AUTH_CODE;
delete process.env.JSONCARGO_API_KEY;

describe("trackShipment", () => {
  it("does not invent live data for a sample container when demo is off", async () => {
    const response = await trackShipment({ query: "MSKU3900520" });
    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.code).toBe("no_provider");
  });

  it("returns canned samples only when demo is requested", async () => {
    const response = await trackShipment({ query: "MSKU3900520", demo: true });
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.demo).toBe(true);
    expect(response.result.source).toBe("demo");
    expect(response.result.carrier?.code).toBe("MAERSK");
    expect(response.result.events.length).toBeGreaterThan(3);
  });

  it("does not invent vessel positions for a famous name without keys", async () => {
    const response = await trackShipment({ query: "EVER GIVEN", kind: "vessel" });
    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.code).toBe("no_provider");
  });

  it("returns vessel demo data when explicitly requested", async () => {
    const response = await trackShipment({ query: "EVER GIVEN", kind: "vessel", demo: true });
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.result.vessel?.imo).toBe("9811000");
    expect(response.result.source).toBe("demo");
  });

  it("requires an API key for a live container that is not a demo sample", async () => {
    const response = await trackShipment({ query: "MSKU1234565" });
    expect(response.ok).toBe(false);
    if (response.ok) return;
    expect(response.code).toBe("no_provider");
  });
});
