import { describe, expect, it } from "vitest";
import { parseBulkQueries } from "./bulk";

describe("parseBulkQueries", () => {
  it("extracts containers, MMSI and one-per-line bills", () => {
    const found = parseBulkQueries("MSKU3900520, 353136000\nMAEU918273645\nEver Given");
    expect(found).toContain("MSKU3900520");
    expect(found).toContain("353136000");
    expect(found).toContain("MAEU918273645");
    expect(found).toContain("EVER GIVEN");
  });

  it("dedupes and caps the list", () => {
    const found = parseBulkQueries("MSKU3900520\nMSKU3900520\nmsku3900520", 2);
    expect(found).toEqual(["MSKU3900520"]);
  });
});
