// T-013 spike page (hidden, lazy-loaded): draws a deterministic 2000×2000 (4 MP) image,
// encodes it as PNG and traces it with vtracer in a worker. Gate G-1 evidence only;
// replaced by the vectorize worker in T-045.
import { useEffect, useState } from "react";
import type { TraceWorkerResponse } from "./trace.worker";

const SIDE = 2000; // 4,000,000 px

async function makePng(): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(SIDE, SIDE);
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("2D canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIDE, SIDE);
  ctx.fillStyle = "#000000";
  // A sticker-like test card: rings, a star and a grid of dots.
  for (let r = 900; r > 100; r -= 160) {
    ctx.beginPath();
    ctx.arc(SIDE / 2, SIDE / 2, r, 0, Math.PI * 2);
    ctx.arc(SIDE / 2, SIDE / 2, r - 60, 0, Math.PI * 2, true);
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? 90 : 36;
    ctx.lineTo(SIDE / 2 + rad * Math.cos(a), SIDE / 2 + rad * Math.sin(a));
  }
  ctx.fill();
  for (let y = 60; y < SIDE; y += 160) {
    for (let x = 60; x < SIDE; x += 160) {
      if (Math.hypot(x - SIDE / 2, y - SIDE / 2) < 960) continue;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return new Uint8Array(await blob.arrayBuffer());
}

function trace(png: Uint8Array): Promise<TraceWorkerResponse> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL("./trace.worker.ts", import.meta.url), { type: "module" });
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ ok: false, error: "worker timed out after 30 s" });
    }, 30_000);
    worker.onmessage = (e: MessageEvent<TraceWorkerResponse>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, error: e.message || "worker error" });
    };
    worker.postMessage({ png }, [png.buffer]);
  });
}

type View =
  | { phase: "running" }
  | { phase: "done"; pngBytes: number; result: TraceWorkerResponse; totalMs: number };

export default function TraceSpike() {
  const [view, setView] = useState<View>({ phase: "running" });

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const png = await makePng();
        const pngBytes = png.byteLength;
        const t0 = performance.now();
        const result = await trace(png);
        if (alive) setView({ phase: "done", pngBytes, result, totalMs: performance.now() - t0 });
      } catch (err) {
        if (alive) {
          setView({
            phase: "done",
            pngBytes: 0,
            totalMs: 0,
            result: { ok: false, error: err instanceof Error ? err.message : String(err) },
          });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section aria-labelledby="screen-title" data-screen="spike-trace">
      <h1 id="screen-title">Spike: vtracer em worker</h1>
      <p>Imagem de teste de 2000 × 2000 px (4 MP) em PNG, vetorizada em preto e branco.</p>
      {view.phase === "running" ? (
        <p role="status">vetorizando…</p>
      ) : view.result.ok ? (
        <dl data-testid="trace-result">
          <dt>PNG de entrada</dt>
          <dd>{view.pngBytes} bytes</dd>
          <dt>Carregar o WASM (ms)</dt>
          <dd data-testid="trace-init-ms">{view.result.initMs.toFixed(0)}</dd>
          <dt>Vetorizar (ms)</dt>
          <dd data-testid="trace-ms">{view.result.traceMs.toFixed(0)}</dd>
          <dt>Total com o worker (ms)</dt>
          <dd data-testid="trace-total-ms">{view.totalMs.toFixed(0)}</dd>
          <dt>SVG</dt>
          <dd>
            <span data-testid="trace-paths">{view.result.paths}</span> paths, {view.result.svgBytes}{" "}
            bytes
          </dd>
          <dt>Início do SVG</dt>
          <dd>
            <code data-testid="trace-head">{view.result.head}</code>
          </dd>
        </dl>
      ) : (
        <p role="alert">{view.result.error}</p>
      )}
    </section>
  );
}
