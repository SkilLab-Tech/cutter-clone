// T-012 spike (gate G-1): proves the chosen Clipper2 port (clipper2-ts, BSL-1.0, pure
// TypeScript) offsets in mm with float input. The real adapter with mm<->integer scaling is
// T-018; delete this file when T-018 lands.
import {
  EndType,
  JoinType,
  areaPathsD,
  getBoundsPathsD,
  inflatePathsD,
  type PathsD,
} from "clipper2-ts";

export interface OffsetSpikeResult {
  join: "miter" | "round";
  widthMm: number;
  heightMm: number;
  minXMm: number;
  minYMm: number;
  areaMm2: number;
  /** Expected area for this join (exact for miter, analytic for round). */
  expectedAreaMm2: number;
}

/** Decimal places kept by Clipper2's float API: 1e-4 mm, well below the 0.01 mm check. */
const PRECISION_DECIMALS = 4;
/** Max deviation of round joins from a true arc, in mm (BLUEPRINT §7: flattening ≤ 0.02 mm). */
const ARC_TOLERANCE_MM = 0.005;

export function offsetSquareSpike(
  sizeMm: number,
  deltaMm: number,
  join: "miter" | "round",
): OffsetSpikeResult {
  const square: PathsD = [
    [
      { x: 0, y: 0 },
      { x: sizeMm, y: 0 },
      { x: sizeMm, y: sizeMm },
      { x: 0, y: sizeMm },
    ],
  ];
  const out = inflatePathsD(
    square,
    deltaMm,
    join === "miter" ? JoinType.Miter : JoinType.Round,
    EndType.Polygon,
    2,
    PRECISION_DECIMALS,
    ARC_TOLERANCE_MM,
  );
  const b = getBoundsPathsD(out);
  const side = sizeMm + 2 * deltaMm;
  return {
    join,
    widthMm: b.right - b.left,
    heightMm: b.bottom - b.top,
    minXMm: b.left,
    minYMm: b.top,
    areaMm2: Math.abs(areaPathsD(out)),
    expectedAreaMm2:
      join === "miter"
        ? side * side
        : sizeMm * sizeMm + 4 * sizeMm * deltaMm + Math.PI * deltaMm ** 2,
  };
}
