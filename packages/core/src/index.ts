// @cutter-clone/core — pure TypeScript, no DOM (constitution: packages/core).
export const CORE_VERSION = "0.0.0";
export { HPGL_UNITS_PER_MM, mmToUnits, unitsToMm } from "./units";
export {
  SMOKE_SQUARE_SIZE_MM,
  smokeSquareBytes,
  smokeSquareHpgl,
  type SmokeSquareOptions,
} from "./drivers/hpgl/smoke-square";
