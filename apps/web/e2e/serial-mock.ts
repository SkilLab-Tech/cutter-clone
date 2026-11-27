// Mocked navigator.serial for e2e (BP-DEV-001 sim part). Installed with addInitScript, so it
// exists before any page script runs. Control it from tests through window.__serialMock.
import type { Page } from "@playwright/test";

export interface SerialMockConfig {
  /** No navigator.serial at all (unsupported browser). */
  unsupported?: boolean;
  /** requestPort rejects as if the user closed the picker. */
  cancelPicker?: boolean;
  /** open() rejects with NetworkError, as Chrome does when another program holds the port. */
  busy?: boolean;
  /** Device sends XOFF (0x13) right after open. */
  xoffOnOpen?: boolean;
}

export interface SerialMockState {
  openOptions: Record<string, unknown> | null;
  /** Every chunk written, as plain byte arrays. */
  writes: number[][];
  closed: boolean;
}

export async function installSerialMock(page: Page, config: SerialMockConfig = {}): Promise<void> {
  await page.addInitScript((cfg: SerialMockConfig) => {
    if (cfg.unsupported) {
      Object.defineProperty(Navigator.prototype, "serial", {
        get: () => undefined,
        configurable: true,
      });
      return;
    }
    type Listener = (event: { type: string; target: unknown }) => void;
    const state = {
      openOptions: null as Record<string, unknown> | null,
      writes: [] as number[][],
      closed: false,
    };
    let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
    const serialListeners = new Set<Listener>();

    class MockPort extends EventTarget {
      readable: ReadableStream<Uint8Array> | null = null;
      writable: WritableStream<Uint8Array> | null = null;
      #opened = false;
      async open(options: Record<string, unknown>) {
        if (cfg.busy) throw new DOMException("Failed to open serial port.", "NetworkError");
        if (this.#opened) throw new DOMException("The port is already open.", "InvalidStateError");
        this.#opened = true;
        state.openOptions = options;
        state.closed = false;
        this.readable = new ReadableStream<Uint8Array>({
          start(c) {
            controller = c;
          },
        });
        this.writable = new WritableStream<Uint8Array>({
          write(chunk) {
            state.writes.push(Array.from(chunk));
          },
        });
        if (cfg.xoffOnOpen) setTimeout(() => controller?.enqueue(new Uint8Array([0x13])), 0);
      }
      async close() {
        this.#opened = false;
        state.closed = true;
        this.readable = null;
        this.writable = null;
      }
      getInfo() {
        return { usbVendorId: 0x0403, usbProductId: 0x6001 };
      }
    }
    const port = new MockPort();

    const serial = {
      async requestPort() {
        if (cfg.cancelPicker)
          throw new DOMException("No port selected by the user.", "NotFoundError");
        return port;
      },
      async getPorts() {
        return [port];
      },
      addEventListener(type: string, l: Listener) {
        if (type === "disconnect") serialListeners.add(l);
      },
      removeEventListener(type: string, l: Listener) {
        if (type === "disconnect") serialListeners.delete(l);
      },
      dispatchEvent() {
        return true;
      },
    };
    Object.defineProperty(Navigator.prototype, "serial", { get: () => serial, configurable: true });

    (window as unknown as { __serialMock: unknown }).__serialMock = {
      state,
      /** Bytes arriving from the device. */
      push(bytes: number[]) {
        controller?.enqueue(new Uint8Array(bytes));
      },
      /** Cable pulled: the stream errors, streams go null, disconnect fires on port and serial. */
      unplug() {
        controller?.error(new DOMException("The device has been lost.", "NetworkError"));
        port.readable = null;
        port.writable = null;
        port.dispatchEvent(new Event("disconnect"));
        for (const l of serialListeners) l({ type: "disconnect", target: port });
      },
    };
  }, config);
}

/** Reads the mock state from the page. */
export function mockState(page: Page): Promise<SerialMockState> {
  return page.evaluate(
    () => (window as unknown as { __serialMock: { state: SerialMockState } }).__serialMock.state,
  );
}

export function mockPush(page: Page, bytes: number[]): Promise<void> {
  return page.evaluate(
    (b) =>
      (window as unknown as { __serialMock: { push(b: number[]): void } }).__serialMock.push(b),
    bytes,
  );
}

export function mockUnplug(page: Page): Promise<void> {
  return page.evaluate(() =>
    (window as unknown as { __serialMock: { unplug(): void } }).__serialMock.unplug(),
  );
}
