// T-009: minimal HPGL for the gate G-1 smoke test (a 25 mm square). No geometry layer on
// purpose: this exists only to prove the machine can be reached (U-02). The real driver is
// T-031 (BP-DEV-003).
import { HPGL_UNITS_PER_MM, mmToUnits } from "../../units";

export const SMOKE_SQUARE_SIZE_MM = 25;

export interface SmokeSquareOptions {
  /** Lower-left corner of the square, in mm from the cutter origin. Default 0,0. */
  originMm?: { x: number; y: number };
  /** Square side in mm. Default 25. Must be in (0, 100]. */
  sizeMm?: number;
}

/** Returns the HPGL text for a closed square cut: IN; PU to the corner; PD around; PU. */
export function smokeSquareHpgl(options: SmokeSquareOptions = {}): string {
  const size = options.sizeMm ?? SMOKE_SQUARE_SIZE_MM;
  const ox = options.originMm?.x ?? 0;
  const oy = options.originMm?.y ?? 0;
  if (!Number.isFinite(size) || size <= 0 || size > 100) {
    throw new RangeError(`sizeMm must be in (0, 100], got ${String(size)}`);
  }
  // Machine safety (BP-NFR-005): never emit negative coordinates; keep the test small.
  if (!Number.isFinite(ox) || !Number.isFinite(oy) || ox < 0 || oy < 0 || ox > 500 || oy > 500) {
    throw new RangeError("originMm must be within [0, 500] mm on both axes");
  }
  const x0 = mmToUnits(ox, HPGL_UNITS_PER_MM);
  const y0 = mmToUnits(oy, HPGL_UNITS_PER_MM);
  const x1 = mmToUnits(ox + size, HPGL_UNITS_PER_MM);
  const y1 = mmToUnits(oy + size, HPGL_UNITS_PER_MM);
  return `IN;PU${x0},${y0};PD${x1},${y0},${x1},${y1},${x0},${y1},${x0},${y0};PU;`;
}

/** Same as {@link smokeSquareHpgl}, as ASCII bytes ready for a transport. */
export function smokeSquareBytes(options: SmokeSquareOptions = {}): Uint8Array {
  return asciiBytes(smokeSquareHpgl(options));
}

/** HPGL is 7-bit ASCII. Core has no DOM/Node globals, so encode by hand. */
function asciiBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) throw new RangeError(`non-ASCII character at ${i}`);
    out[i] = code;
  }
  return out;
}
