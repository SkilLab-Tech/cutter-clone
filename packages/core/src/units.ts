// Geometry lives in millimetres (float64); only a driver converts to device units
// (constitution principle 5).

/** HPGL plotter units per millimetre (1 unit = 0.025 mm). */
export const HPGL_UNITS_PER_MM = 40;

/** Converts millimetres to integer device units, rounding half away from zero. */
export function mmToUnits(mm: number, unitsPerMm: number = HPGL_UNITS_PER_MM): number {
  if (!Number.isFinite(mm)) throw new RangeError(`mm must be finite, got ${String(mm)}`);
  if (!Number.isFinite(unitsPerMm) || unitsPerMm <= 0) {
    throw new RangeError(`unitsPerMm must be a positive finite number, got ${String(unitsPerMm)}`);
  }
  const scaled = mm * unitsPerMm;
  const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled));
  // Avoid emitting "-0" in text output.
  return rounded === 0 ? 0 : rounded;
}

/** Converts integer device units back to millimetres. */
export function unitsToMm(units: number, unitsPerMm: number = HPGL_UNITS_PER_MM): number {
  if (!Number.isFinite(unitsPerMm) || unitsPerMm <= 0) {
    throw new RangeError(`unitsPerMm must be a positive finite number, got ${String(unitsPerMm)}`);
  }
  return units / unitsPerMm;
}
