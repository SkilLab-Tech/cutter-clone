// T-012 spike: Clipper2 running inside a Vite module worker.
import { offsetSquareSpike, type OffsetSpikeResult } from "@cutter-clone/core";

export type OffsetWorkerRequest = { sizeMm: number; deltaMm: number; join: "miter" | "round" };
export type OffsetWorkerResponse =
  { ok: true; result: OffsetSpikeResult; ms: number } | { ok: false; error: string };

self.onmessage = (event: MessageEvent<OffsetWorkerRequest>) => {
  const { sizeMm, deltaMm, join } = event.data;
  const t0 = performance.now();
  let response: OffsetWorkerResponse;
  try {
    response = {
      ok: true,
      result: offsetSquareSpike(sizeMm, deltaMm, join),
      ms: performance.now() - t0,
    };
  } catch (err) {
    response = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  self.postMessage(response);
};
