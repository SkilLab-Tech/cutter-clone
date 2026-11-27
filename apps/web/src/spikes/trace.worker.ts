// T-013 spike: vtracer (WASM, --target web build from scripts/build-vtracer-wasm.sh) running
// in a module worker. Input is an encoded PNG; output is the SVG text plus timings.
import init, { vectorize_bytes } from "../vendor/vtracer/vtracer_wasm.js";
import wasmUrl from "../vendor/vtracer/vtracer_wasm_bg.wasm?url";

export type TraceWorkerRequest = { png: Uint8Array };
export type TraceWorkerResponse =
  | { ok: true; svgBytes: number; paths: number; initMs: number; traceMs: number; head: string }
  | { ok: false; error: string };

let ready: Promise<unknown> | null = null;

self.onmessage = async (event: MessageEvent<TraceWorkerRequest>) => {
  let response: TraceWorkerResponse;
  try {
    const t0 = performance.now();
    ready ??= init({ module_or_path: wasmUrl });
    await ready;
    const t1 = performance.now();
    const svg = vectorize_bytes(event.data.png, {
      preset: "bw",
      mode: "spline",
      filterSpeckle: 4,
    });
    const t2 = performance.now();
    response = {
      ok: true,
      svgBytes: svg.length,
      paths: (svg.match(/<path\b/g) ?? []).length,
      initMs: t1 - t0,
      traceMs: t2 - t1,
      head: svg.slice(0, 120),
    };
  } catch (err) {
    response = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  self.postMessage(response);
};
