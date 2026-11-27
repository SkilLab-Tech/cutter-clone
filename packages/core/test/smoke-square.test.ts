// T-009 check: bytes match hand-written fixtures.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { smokeSquareBytes, smokeSquareHpgl } from "../src/drivers/hpgl/smoke-square";

const fixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(new URL(`./fixtures/hpgl/${name}`, import.meta.url)));

describe("smoke square HPGL (T-009)", () => {
  it("25 mm square at the origin equals the hand-written fixture byte for byte", () => {
    expect(smokeSquareBytes()).toEqual(fixture("square-25mm.plt"));
  });

  it("25 mm square at (10 mm, 10 mm) equals its fixture", () => {
    expect(smokeSquareBytes({ originMm: { x: 10, y: 10 } })).toEqual(
      fixture("square-25mm-at-10mm.plt"),
    );
  });

  it("is plain ASCII with 40 units per mm", () => {
    const text = smokeSquareHpgl();
    expect(text).toMatch(/^[\x20-\x7e]+$/);
    expect(text).toContain("PD1000,0,");
  });

  it("refuses unsafe input (BP-NFR-005)", () => {
    expect(() => smokeSquareHpgl({ originMm: { x: -1, y: 0 } })).toThrow(RangeError);
    expect(() => smokeSquareHpgl({ sizeMm: 0 })).toThrow(RangeError);
    expect(() => smokeSquareHpgl({ sizeMm: 101 })).toThrow(RangeError);
    expect(() => smokeSquareHpgl({ originMm: { x: Number.NaN, y: 0 } })).toThrow(RangeError);
  });
});
