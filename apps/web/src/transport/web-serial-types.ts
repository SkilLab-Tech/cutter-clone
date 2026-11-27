// Minimal Web Serial typings (the API is not in TypeScript's lib.dom). Only what we use.
// https://wicg.github.io/serial/

export interface SerialOpenOptions {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: "none" | "even" | "odd";
  bufferSize?: number;
  flowControl?: "none" | "hardware";
}

export interface SerialPortInfoLike {
  usbVendorId?: number;
  usbProductId?: number;
}

export interface SerialPortLike extends EventTarget {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: SerialOpenOptions): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfoLike;
}

export interface SerialLike extends EventTarget {
  requestPort(options?: { filters?: SerialPortInfoLike[] }): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

/** Returns navigator.serial when the browser has it, else undefined. */
export function getNavigatorSerial(): SerialLike | undefined {
  const nav = navigator as Navigator & { serial?: SerialLike };
  return nav.serial;
}
