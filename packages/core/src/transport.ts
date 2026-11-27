// Transport contract (plan.md "Key interfaces"). DOM-free: browser transports (Web Serial)
// and the simulator implement it in their own packages.

export type Parity = "none" | "even" | "odd";
export type FlowControl = "none" | "hardware";

export const BAUD_RATES = [9600, 19200, 38400, 57600, 115200] as const;
export type BaudRate = (typeof BAUD_RATES)[number];

export interface SerialSettings {
  baudRate: BaudRate;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: Parity;
  /** Web Serial supports only "none" and "hardware" (RTS/CTS). */
  flowControl: FlowControl;
  /** XON/XOFF in software: pause writes on 0x13 (DC3), resume on 0x11 (DC1). */
  softwareXonXoff: boolean;
}

/**
 * Smoke-test default. 38400 8N1 is the C-series manual default (docs/protocol/research);
 * a non-camera C48 was reported at 19200 with XON/XOFF. U-02 settles the real values.
 */
export const DEFAULT_SERIAL_SETTINGS: SerialSettings = {
  baudRate: 38400,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  flowControl: "none",
  softwareXonXoff: false,
};

export const XON = 0x11;
export const XOFF = 0x13;

export type TransportState = "closed" | "opening" | "open" | "lost";

export interface Transport {
  readonly state: TransportState;
  open(settings: SerialSettings): Promise<void>;
  /** Resolves when the OS accepted the bytes, not when the cutter executed them. */
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
  /** Bytes read from the device (replies, XON/XOFF). Returns an unsubscribe function. */
  onReceive(listener: (bytes: Uint8Array) => void): () => void;
  /** Fired once when the device goes away while open. */
  onDisconnect(listener: () => void): () => void;
}

/** Base for typed transport errors; `code` is what the UI maps to a pt-BR message. */
export class TransportError extends Error {
  constructor(
    readonly code: "unsupported" | "busy" | "lost" | "not-open" | "cancelled" | "io",
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class SerialUnsupportedError extends TransportError {
  constructor() {
    super("unsupported", "Web Serial is not available in this browser");
  }
}

/** The port exists but could not be opened, usually because another program holds it. */
export class DeviceBusyError extends TransportError {
  constructor(cause?: unknown) {
    super("busy", "The port could not be opened; another program may be using it", { cause });
  }
}

export class DeviceLostError extends TransportError {
  constructor(cause?: unknown) {
    super("lost", "The device was disconnected", { cause });
  }
}

export class TransportNotOpenError extends TransportError {
  constructor() {
    super("not-open", "The transport is not open");
  }
}

export class PortSelectionCancelledError extends TransportError {
  constructor(cause?: unknown) {
    super("cancelled", "No port was selected", { cause });
  }
}
