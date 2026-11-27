// T-012 check (core part): a 25 mm square offset by 2 mm is 29 mm wide, ±0.01 mm.
import { describe, expect, it } from "vitest";
import { offsetSquareSpike } from "../src/spikes/clipper-offset";

const TOL = 0.01;

describe("Clipper2 offset spike (T-012)", () => {
  for (const join of ["miter", "round"] as const) {
    it(`${join}: 25 mm square + 2 mm → 29 × 29 mm starting at (-2, -2), ±0.01 mm`, () => {
      const r = offsetSquareSpike(25, 2, join);
      expect(Math.abs(r.widthMm - 29)).toBeLessThanOrEqual(TOL);
      expect(Math.abs(r.heightMm - 29)).toBeLessThanOrEqual(TOL);
      expect(Math.abs(r.minXMm + 2)).toBeLessThanOrEqual(TOL);
      expect(Math.abs(r.minYMm + 2)).toBeLessThanOrEqual(TOL);
    });
  }

  it("miter area is exactly 29² (±0.01 mm²)", () => {
    const r = offsetSquareSpike(25, 2, "miter");
    expect(Math.abs(r.areaMm2 - 841)).toBeLessThanOrEqual(0.01);
  });

  it("round area matches 25² + 4·25·2 + π·2² within the arc tolerance", () => {
    const r = offsetSquareSpike(25, 2, "round");
    // Polygonal arcs sit inside the true arc; 0.005 mm tolerance over a 2 mm radius × 4 corners.
    expect(Math.abs(r.areaMm2 - r.expectedAreaMm2)).toBeLessThan(0.1);
  });

  it("negative offset shrinks: 25 mm square − 2 mm → 21 mm", () => {
    const r = offsetSquareSpike(25, -2, "miter");
    expect(Math.abs(r.widthMm - 21)).toBeLessThanOrEqual(TOL);
  });
});
