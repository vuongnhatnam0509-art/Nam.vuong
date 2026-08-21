import { describe, expect, it } from "vitest";
import { evaluateDelay } from "./delay";

describe("evaluateDelay", () => {
  it("flags an ETA that slipped by a day", () => {
    const verdict = evaluateDelay({
      previousEta: "2026-09-01T00:00:00Z",
      eta: "2026-09-02T06:00:00Z",
      now: new Date("2026-08-21T00:00:00Z"),
    });
    expect(verdict.delayed).toBe(true);
    expect(verdict.delayNote).toMatch(/lùi/);
  });

  it("flags an ETA already more than 12 hours past", () => {
    const verdict = evaluateDelay({
      eta: "2026-08-20T00:00:00Z",
      now: new Date("2026-08-21T00:00:00Z"),
    });
    expect(verdict.delayed).toBe(true);
    expect(verdict.delayNote).toMatch(/đã qua/);
  });

  it("does not flag a discharged shipment", () => {
    const verdict = evaluateDelay({
      eta: "2026-08-01T00:00:00Z",
      status: "Discharged",
      now: new Date("2026-08-21T00:00:00Z"),
    });
    expect(verdict.delayed).toBe(false);
  });
});
