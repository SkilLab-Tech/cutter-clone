// @cutter-clone/core — pure TypeScript, no DOM (constitution: packages/core).
export const CORE_VERSION = "0.0.0";
export { HPGL_UNITS_PER_MM, mmToUnits, unitsToMm } from "./units";
export {
  SMOKE_SQUARE_SIZE_MM,
  smokeSquareBytes,
  smokeSquareHpgl,
  type SmokeSquareOptions,
} from "./drivers/hpgl/smoke-square";
export {
  BAUD_RATES,
  DEFAULT_SERIAL_SETTINGS,
  DeviceBusyError,
  DeviceLostError,
  PortSelectionCancelledError,
  SerialUnsupportedError,
  TransportError,
  TransportNotOpenError,
  XOFF,
  XON,
  type BaudRate,
  type FlowControl,
  type Parity,
  type SerialSettings,
  type Transport,
  type TransportState,
} from "./transport";
