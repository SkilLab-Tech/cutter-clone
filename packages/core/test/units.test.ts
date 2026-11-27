import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { HPGL_UNITS_PER_MM, mmToUnits, unitsToMm } from "../src/units";

describe("mm ↔ device units", () => {
  it("rounds to the nearest unit: round-trip error ≤ half a unit (0.0125 mm)", () => {
    fc.assert(
      fc.property(fc.double({ min: -2000, max: 2000, noNaN: true }), (mm) => {
        const back = unitsToMm(mmToUnits(mm));
        expect(Math.abs(back - mm)).toBeLessThanOrEqual(0.5 / HPGL_UNITS_PER_MM + 1e-12);
      }),
    );
  });

  it("is exact for whole units", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100_000, max: 100_000 }), (u) => {
        expect(mmToUnits(unitsToMm(u))).toBe(u);
      }),
    );
  });

  it("never yields -0", () => {
    expect(Object.is(mmToUnits(-0.001), 0)).toBe(true);
  });

  it("rejects non-finite input", () => {
    expect(() => mmToUnits(Number.NaN)).toThrow(RangeError);
    expect(() => mmToUnits(1, 0)).toThrow(RangeError);
  });
});
