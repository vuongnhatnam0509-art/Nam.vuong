import { describe, expect, it } from "vitest";
import { deriveMilestones } from "./milestones";

describe("deriveMilestones", () => {
  it("maps carrier events into date board slots", () => {
    const milestones = deriveMilestones(
      [
        { time: "2026-08-05T16:40:00Z", status: "Gate in full (export)", location: "Cát Lái", isActual: true },
        { time: "2026-08-08T11:05:00Z", status: "Loaded on vessel", location: "Cái Mép", isActual: true },
        { time: "2026-08-12T09:20:00Z", status: "Vessel departed", location: "Cái Mép", isActual: true },
        { time: "2026-09-18T06:00:00Z", status: "ETA discharge", location: "Rotterdam", isActual: false },
      ],
      { eta: "2026-09-18T06:00:00Z", destination: "Rotterdam" },
    );
    expect(milestones.find((item) => item.key === "gate_in")?.isActual).toBe(true);
    expect(milestones.find((item) => item.key === "departed")?.time).toContain("2026-08-12");
    expect(milestones.find((item) => item.key === "arrived")?.isActual).toBe(false);
  });
});
