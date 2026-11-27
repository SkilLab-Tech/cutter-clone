// T-012 spike page (hidden, lazy-loaded): offsets a 25 mm square by 2 mm in a worker and shows
// the measured result. Gate G-1 evidence only; removed when T-018 lands.
import { useEffect, useState } from "react";
import type { OffsetWorkerRequest, OffsetWorkerResponse } from "./offset.worker";

type Row = { join: "miter" | "round"; response: OffsetWorkerResponse | null };

function runInWorker(req: OffsetWorkerRequest): Promise<OffsetWorkerResponse> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL("./offset.worker.ts", import.meta.url), { type: "module" });
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ ok: false, error: "worker timed out after 10 s" });
    }, 10_000);
    worker.onmessage = (e: MessageEvent<OffsetWorkerResponse>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, error: e.message || "worker error" });
    };
    worker.postMessage(req);
  });
}

const fmt = (n: number) => n.toFixed(4);

export default function GeometrySpike() {
  const [rows, setRows] = useState<Row[]>([
    { join: "miter", response: null },
    { join: "round", response: null },
  ]);

  useEffect(() => {
    let alive = true;
    for (const join of ["miter", "round"] as const) {
      void runInWorker({ sizeMm: 25, deltaMm: 2, join }).then((response) => {
        if (alive) setRows((rs) => rs.map((r) => (r.join === join ? { join, response } : r)));
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section aria-labelledby="screen-title" data-screen="spike-geometry">
      <h1 id="screen-title">Spike: Clipper2 em worker</h1>
      <p>Quadrado de 25 mm com contorno de 2 mm para fora. Esperado: 29,0000 × 29,0000 mm.</p>
      <table>
        <thead>
          <tr>
            <th scope="col">canto</th>
            <th scope="col">largura (mm)</th>
            <th scope="col">altura (mm)</th>
            <th scope="col">área (mm²)</th>
            <th scope="col">área esperada (mm²)</th>
            <th scope="col">tempo (ms)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ join, response }) => (
            <tr key={join} data-testid={`offset-${join}`}>
              <th scope="row">{join}</th>
              {response === null ? (
                <td colSpan={5} role="status">
                  calculando…
                </td>
              ) : response.ok ? (
                <>
                  <td data-testid={`offset-${join}-width`}>{fmt(response.result.widthMm)}</td>
                  <td data-testid={`offset-${join}-height`}>{fmt(response.result.heightMm)}</td>
                  <td>{fmt(response.result.areaMm2)}</td>
                  <td>{fmt(response.result.expectedAreaMm2)}</td>
                  <td>{response.ms.toFixed(2)}</td>
                </>
              ) : (
                <td colSpan={5} role="alert">
                  {response.error}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
