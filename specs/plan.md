# Plan — cutter-clone

Source: docs/blueprint/BLUEPRINT.md v1. This file says how; scope lives in the blueprint.

## Architecture

```
apps/web (Vite + React, PWA)                      packages/core (pure TS, no DOM)
┌───────────────────────────────┐                 ┌──────────────────────────────────────┐
│ Screens S-01..S-10            │                 │ model/   Scene, Path (mm), transforms │
│ Zustand store ── Dexie (IDB)  │── uses ────────▶│ geo/     offset, blade, order, weed,  │
│ Workers: trace, pdf-import    │                 │          nest, clean (Clipper2)       │
│ Transports:                   │                 │ import/  svg, pdf-adapter, text       │
│  WebSerialTransport ──────────┼── bytes ──▶ C48 │ drivers/ Driver API, hpgl, foison-cam │
│  SimulatorTransport ──┐       │                 │ job/     CutJob builder, streamer     │
│ Print PDF (pdf-lib)   │       │                 │ sim/     HPGL parser → polylines      │
└───────────────────────┼───────┘                 │ marks/   MarkSpec layout              │
                        └── bytes ──▶ sim/ ◀──────└──────────────────────────────────────┘
```

Pipeline: `Scene (mm) → prepare (contour, weed, clean, nest) → toolpath (order, overcut, blade offset)
→ CutJob → Driver.encode(job, profile) → Uint8Array chunks → Transport.write with flow control`.
The same bytes go to Web Serial, the simulator or a .plt download (BP-DEV-005 asserts equality).

## Key interfaces (core)

```ts
interface Driver {
  id: string;                                  // "hpgl" | "foison-cam"
  capabilities: { registration: "none" | "camera" | "laser" };
  encode(job: CutJob, profile: MachineProfile): Iterable<Uint8Array>; // chunked, never > 256 B
  stopSequence(profile: MachineProfile): Uint8Array;                  // knife up + stop (BP-DEV-002)
}
interface Transport {
  open(settings: SerialSettings): Promise<void>;
  write(chunk: Uint8Array, signal: AbortSignal): Promise<void>;       // resolves when accepted (CTS via flowControl:"hardware";
                                                                      // XON/XOFF in software: Web Serial has no xonxoff option)
  readable?: ReadableStream<Uint8Array>;                              // XON/XOFF bytes and replies, if any (U-01/U-02)
  close(): Promise<void>;
}
type CutJob = { paths: ToolPath[]; registration?: { marks: Mark[] }; material: MaterialSettings };
```

Errors: typed (`DeviceBusyError`, `DeviceLostError`, `OutOfBoundsError`, `ImportError`), mapped
to pt-BR messages in one table in apps/web.

## Data model
As blueprint §5. Dexie schema v1: `profiles`, `materials`, `projects`, `runs`. Migrations are
additive; every table row carries `schemaVersion`.

## Decisions on EXTERNAL items
- Camera ARMS: integrate through `drivers/foison-cam` once U-01 is settled; until then the
  driver interface exists, the camera capability is off, and BP-ARMS-* stay blocked.
- Fonts: bundle about 20 OFL fonts as lazy-loaded subsets; Local Font Access when granted.
- SignMaster libraries: cut.
- Background removal: P2, only a permissively licensed model running locally.

## Libraries (one-line reason each)
- clipper2 port (Boost): robust polygon offset/union for contours, weeding, nesting gaps.
- vtracer → WASM (MIT): good bitmap tracing with a permissive licence (potrace is GPL) [VERIFY build].
- opentype.js (MIT): glyph outlines and metrics in the browser.
- pdfjs-dist (Apache-2.0): read vector operators from PDF pages.
- pdf-lib (MIT): write exact-size PDFs with vector marks.
- Dexie (Apache-2.0): ergonomic IndexedDB with versioned schema.
- Zustand (MIT): small store, easy undo stack (BP-UX-006).
- i18next (MIT): locales with a missing-key check in CI.
- vite-plugin-pwa (MIT): service worker and install prompt.
- fast-check (MIT): property tests for geometry invariants.
- Playwright + @axe-core/playwright: e2e, mocked `navigator.serial`, a11y, network guard.
- license-checker (BSD) or equivalent: CI licence gate.

## NFR budgets
As blueprint §7. Perf tests live in `apps/web/e2e/perf.spec.ts`; geometry precision in
`packages/core/test/precision.test.ts`.

## Hardware evidence plan (Phase 0 + gate G-1, at the partner workshop, ~1 h, the pilot operator + Ivan or a remote session)
1. Read the SignMaster EULA first (U-06).
2. Device Manager screenshot with the cutter plugged in (U-02).
3. SignMaster: screenshots of port/cutter settings; export a plain cut and a camera cut to a file if the option exists (U-01, U-02).
4. Print SignMaster's mark sheet at 100 % on the Epson, photo with a ruler (U-03).
5. Panel: usable widths, units, feed axis, origin, blade-offset setting; a 1000-unit line and a > 1 m line; whether FS/VS take effect (U-04).
6. Gate G-1: the /smoke page (T-010/T-011) cuts a 25 mm square over Web Serial. If the cutter is not a serial port, stop and re-plan BP-DEV-001 before Phase 2.
7. In parallel: message Foison support asking for the camera-contour command reference (U-01), and ask the pilot operator which ink is in the tank (U-07).

## Streaming model
- Web Serial `write()` resolves when the OS accepts the bytes, not when the cutter's buffer has room.
- Every transport caps in-flight bytes (`maxInFlightBytes`) and paces writes (`paceBytesPerSec`).
- Flow control:
  - `flowControl: "hardware"` when the adapter wires CTS.
  - Software XON/XOFF otherwise: the app reads `port.readable` and stops writing on 0x13 until 0x11.
- Cancel: stop writing at once, then send `stopSequence`. The worst-case time to knife-up is the bytes in flight divided by the cutting rate; it is shown in Avançado.
- Progress is "enviado" (bytes sent). Plain HPGL has no read-back. If U-02 finds a working status query, the progress can use it later.

## Risks
| Risk | Effect | Mitigation |
|---|---|---|
| Camera protocol is undocumented and needs a SignMaster-only handshake | P0 print-and-cut blocked | Ask Foison first; laser fallback (BP-ARMS-004); ship lettering + .plt meanwhile |
| Cutter is not a serial port (vendor USB driver) | Web Serial cannot reach it | WebUSB probe; else thin Tauri shell reusing core (surface change only) |
| Traced bitmaps produce messy paths | bad cuts for non-experts | clean-up defaults (BP-GEO-007), preview before cut |
| Ink-tank conversion with dye ink | prints smear/fade | print guide recommends inkjet vinyl + lamination (BP-PRINT-004) |
| Publishing with vendor names | trademark complaints | nominative use only (BP-LEGAL-001) |
| Firmware ignores FS/VS or resets panel settings on IN; | wrong force, torn vinyl | sendsForce/sendsSpeed flags, panel instruction, U-04 test |
| Firmware caps coordinates (16-bit) | long roll jobs wrap or fail | maxCoordUnits + relative-move segmenting, > 1 m test in H-06 |
| Firmware already compensates blade offset | double compensation, ugly corners | firmwareBladeOffset flag + corner test |
| Clipper2 JS port or vtracer WASM unusable or wrong licence | contour/trace blocked | decided in gate G-1 spikes (T-012/T-013) before Phase 2 |

Deeper architecture beyond this goes to `system-design`.
