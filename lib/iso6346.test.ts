import { describe, expect, it } from "vitest";
import { checkDigit, isValidContainerNumber, normalizeContainerNumber } from "./iso6346";

describe("ISO 6346", () => {
  it("normalizes spaces and dashes", () => {
    expect(normalizeContainerNumber("msk u-1234565")).toBe("MSKU1234565");
  });

  it("computes a matching check digit", () => {
    const body = "MSKU123456";
    const digit = checkDigit(body);
    expect(isValidContainerNumber(body + String(digit))).toBe(true);
  });

  it("rejects a bad check digit", () => {
    expect(isValidContainerNumber("MSKU1234560")).toBe(false);
  });
});
