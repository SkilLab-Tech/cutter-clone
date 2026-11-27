// T-010: Web Serial transport (BP-DEV-001 sim part). open / write / close, disconnect events,
// typed busy/lost errors, optional software XON/XOFF. Pacing and the in-flight cap are T-035.
import {
  DeviceBusyError,
  DeviceLostError,
  PortSelectionCancelledError,
  SerialUnsupportedError,
  TransportError,
  TransportNotOpenError,
  XOFF,
  XON,
  type SerialSettings,
  type Transport,
  type TransportState,
} from "@cutter-clone/core";
import { getNavigatorSerial, type SerialLike, type SerialPortLike } from "./web-serial-types";

/** Write in small blocks so a software XOFF can stop us between blocks. */
const WRITE_BLOCK_BYTES = 64;

/** Asks the user to pick a port. Must run inside a click handler (user gesture). */
export async function requestSerialPort(serial = getNavigatorSerial()): Promise<SerialPortLike> {
  if (serial === undefined) throw new SerialUnsupportedError();
  try {
    return await serial.requestPort();
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotFoundError") {
      throw new PortSelectionCancelledError(err);
    }
    throw new TransportError("io", "Could not request a serial port", { cause: err });
  }
}

export class WebSerialTransport implements Transport {
  #state: TransportState = "closed";
  #reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  #readLoop: Promise<void> | null = null;
  #receiveListeners = new Set<(bytes: Uint8Array) => void>();
  #disconnectListeners = new Set<() => void>();
  #xonxoff = false;
  #paused = false;
  #resumeWaiters: (() => void)[] = [];
  readonly #serial: SerialLike | undefined;

  constructor(
    readonly port: SerialPortLike,
    serial: SerialLike | undefined = getNavigatorSerial(),
  ) {
    this.#serial = serial;
  }

  get state(): TransportState {
    return this.#state;
  }

  /** True while a software XOFF holds writes. */
  get paused(): boolean {
    return this.#paused;
  }

  async open(settings: SerialSettings): Promise<void> {
    if (this.#state === "open" || this.#state === "opening") return;
    this.#state = "opening";
    try {
      await this.port.open({
        baudRate: settings.baudRate,
        dataBits: settings.dataBits,
        stopBits: settings.stopBits,
        parity: settings.parity,
        flowControl: settings.flowControl,
      });
    } catch (err) {
      this.#state = "closed";
      // Chrome rejects with NetworkError ("Failed to open serial port") when another program
      // holds the port; InvalidStateError means it is already open in this page.
      if (
        err instanceof DOMException &&
        (err.name === "NetworkError" || err.name === "InvalidStateError")
      ) {
        throw new DeviceBusyError(err);
      }
      throw new TransportError("io", "Could not open the serial port", { cause: err });
    }
    this.#xonxoff = settings.softwareXonXoff;
    this.#paused = false;
    this.#state = "open";
    this.port.addEventListener("disconnect", this.#onPortDisconnect);
    this.#serial?.addEventListener("disconnect", this.#onSerialDisconnect);
    this.#readLoop = this.#runReadLoop();
  }

  async write(chunk: Uint8Array): Promise<void> {
    if (this.#state !== "open") throw new TransportNotOpenError();
    for (let i = 0; i < chunk.length; i += WRITE_BLOCK_BYTES) {
      await this.#waitWhilePaused();
      if (this.#state !== "open") throw new DeviceLostError();
      const writable = this.port.writable;
      if (writable === null) throw new DeviceLostError();
      const writer = writable.getWriter();
      try {
        await writer.write(chunk.subarray(i, i + WRITE_BLOCK_BYTES));
      } catch (err) {
        this.#markLost();
        throw new DeviceLostError(err);
      } finally {
        writer.releaseLock();
      }
    }
  }

  async close(): Promise<void> {
    this.#detach();
    const wasOpen = this.#state === "open";
    this.#state = "closed";
    this.#releaseWaiters();
    try {
      await this.#reader?.cancel();
    } catch {
      // already errored or released
    }
    await this.#readLoop?.catch(() => undefined);
    this.#reader = null;
    this.#readLoop = null;
    if (wasOpen) {
      try {
        await this.port.close();
      } catch {
        // The port may already be gone (unplugged); nothing else to release.
      }
    }
  }

  onReceive(listener: (bytes: Uint8Array) => void): () => void {
    this.#receiveListeners.add(listener);
    return () => this.#receiveListeners.delete(listener);
  }

  onDisconnect(listener: () => void): () => void {
    this.#disconnectListeners.add(listener);
    return () => this.#disconnectListeners.delete(listener);
  }

  async #runReadLoop(): Promise<void> {
    while (this.#state === "open") {
      const readable = this.port.readable;
      if (readable === null) break;
      const reader = readable.getReader();
      this.#reader = reader;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value !== undefined && value.length > 0) this.#handleIncoming(value);
        }
      } catch {
        // A fatal read error (device lost) ends the loop; a non-fatal one (framing, parity,
        // break) leaves port.readable non-null and the loop takes a new reader.
        if (this.port.readable === null) this.#markLost();
      } finally {
        reader.releaseLock();
      }
      if (this.port.readable === null) break;
    }
  }

  #handleIncoming(bytes: Uint8Array): void {
    if (this.#xonxoff) {
      for (const b of bytes) {
        if (b === XOFF) this.#paused = true;
        else if (b === XON) {
          this.#paused = false;
          this.#releaseWaiters();
        }
      }
    }
    for (const l of this.#receiveListeners) l(bytes);
  }

  #waitWhilePaused(): Promise<void> {
    if (!this.#paused) return Promise.resolve();
    return new Promise((resolve) => this.#resumeWaiters.push(resolve));
  }

  #releaseWaiters(): void {
    const waiters = this.#resumeWaiters;
    this.#resumeWaiters = [];
    for (const w of waiters) w();
  }

  #onPortDisconnect = (): void => {
    this.#markLost();
  };

  #onSerialDisconnect = (event: Event): void => {
    if (event.target === this.port) this.#markLost();
  };

  #markLost(): void {
    if (this.#state !== "open") return;
    this.#state = "lost";
    this.#detach();
    this.#releaseWaiters();
    for (const l of this.#disconnectListeners) l();
  }

  #detach(): void {
    this.port.removeEventListener("disconnect", this.#onPortDisconnect);
    this.#serial?.removeEventListener("disconnect", this.#onSerialDisconnect);
  }
}
