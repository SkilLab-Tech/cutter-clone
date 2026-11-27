# Tasks — cutter-clone
> Start with tasks T-001..T-005, review, then scale. Do not batch the whole file.
> Each task names the obligation IDs it closes (BLUEPRINT §9). "—" = scaffolding.
> "(sim part)" = closes only the simulator/mocked part; the obligation stays `blocked` until its
> Phase 7 hardware task passes. Gate G-1 runs early so the riskiest unknown (U-02) is settled
> before most UI work.

## Phase 0 — Hardware evidence (human, at the partner workshop; depends on: none)
- [ ] H-01 Read the SignMaster EULA and note any reverse-engineering clause in docs/protocol/README.md. Settles: U-06. (10 min)
- [ ] H-02 Device Manager screenshot with the C48 plugged in; note COM name and driver (CH340/FTDI/other). Settles: U-02 (part). (5 min)
- [ ] H-03 Screenshot the SignMaster cutter/port settings; note baud, parity, flow control. Settles: U-02 (part). (10 min)
- [ ] H-04 Export a plain cut and a camera-contour job from SignMaster to a file if possible; save them as fixtures. Settles: U-01 (only as allowed by H-01). (15 min)
- [ ] H-05 Print SignMaster's mark sheet at 100 % on the Epson and photograph it with a ruler. Settles: U-03. (15 min)
- [ ] H-06 Panel: note plain and contour widths, units, feed axis, origin, blade-offset setting; cut a 1000-unit line and a > 1 m line, measure both; test whether FS/VS change force/speed. Settles: U-04. (15 min)
- [ ] H-07 Ask Foison support for the camera-contour command reference. Settles: U-01. (5 min)
- [ ] H-08 Ask the pilot operator which ink is in the tank (pigment or dye). Settles: U-07. (2 min)

## Phase 1 — Skeleton (depends on: none)
- [x] T-001 pnpm workspace with packages/core and apps/web, TS strict, ESLint, Prettier. Closes: —. Check: `pnpm typecheck` passes on empty packages. (10 min)
- [x] T-002 Vitest in core with fast-check; one sample property test. Closes: —. Check: `pnpm -F core test` green. (10 min)
- [x] T-003 Vite + React app shell with router and the 10 empty screens (S-01..S-10), each with empty/loading/error placeholders. Closes: —. Check: each route renders. (15 min)
- [x] T-004 Playwright with one smoke test and an @axe-core check on S-01. Closes: —. Check: local e2e green. (10 min)
- [~] T-005 (partial 2026-11-27: workflow done and proven locally; blocked on GitHub billing + no ruleset on main) GitHub Actions: typecheck, lint, unit, e2e, build; Cloudflare Pages deploy on main. Closes: BP-OSS-005. Check: a PR with a failing test is blocked. (15 min)
- [x] T-006 License gate on production deps + provenance file for WASM and fonts; MIT LICENSE. Closes: BP-OSS-001 (part). Check: adding a GPL dep fails CI; a WASM entry without a licence fails CI. (15 min)
- [x] T-007 Network guard fixture in Playwright that fails on any request outside the app origin. Closes: BP-NFR-003 (infra). Check: a test fetch to example.com fails. (10 min)
- [x] T-008 i18next with pt-BR default, an en file and a missing-key check. Closes: BP-UX-007 (infra). Check: a missing key fails CI. (15 min)

## Phase 1b — Gate G-1: can we reach the machine, and do the libraries build? (depends on: Phase 1; needs H-02/H-03 at the machine)
- [x] T-009 Minimal HPGL encoder for a fixed 25 mm square, no geometry layer. Closes: —. Check: bytes match a hand-written fixture. (10 min)
- [x] T-010 WebSerialTransport (open/write/close, disconnect events, busy error) + hidden /smoke page with baud/flow selectors that cuts the 25 mm square. Closes: BP-DEV-001 (sim part). Check: mocked-serial e2e. (15 min)
- [ ] T-011 Run /smoke at the partner workshop on the C48 with H-02/H-03 settings; record result in docs/protocol/README.md. Closes: — (settles U-02). Check: square cut and measured. If no serial port: stop and re-plan BP-DEV-001 (WebUSB probe, else Tauri shell). (15 min)
- [x] T-012 Spike: Clipper2 JS/WASM port chosen; its own LICENSE recorded in provenance; offset a square by 2 mm in a Vite worker. Closes: — . Check: ±0.01 mm; licence entry passes the gate. (15 min)
- [x] T-013 Spike: vtracer WASM built for the browser and run in a worker on one PNG; licence recorded. Closes: —. Check: SVG output in < 5 s for 4 MP; fallback decision recorded if it fails. (15 min)

## Phase 2 — Core geometry (depends on: Phase 1b)
- [ ] T-015 Scene/Path model in mm; bounds; serialization; curve flattening ≤ 0.02 mm. Closes: BP-GEO-001 (part). Check: JSON round-trip property test; flatten error test. (15 min)
- [ ] T-016 Transforms move/scale/rotate/mirror along the feed axis, with property tests. Closes: BP-GEO-001. Check: rotate ±90 identity ≤ 1e-9. (15 min)
- [ ] T-017 Media-bounds check per mode (plain/contour width) returning a typed OutOfBounds with suggestions. Closes: BP-GEO-001, BP-NFR-005 (part). Check: 700 mm design on 600 mm media blocked. (10 min)
- [ ] T-018 Clipper2 adapter (offset, union, closing) with mm↔integer scaling. Closes: —. Check: offset of a square by 2 mm ±0.01. (15 min)
- [ ] T-019 Sticker contour: per-island offset, merge, convex round corners, concave closing, clamp 0–20 mm. Closes: BP-GEO-005. Check: ledger acceptance tests. (15 min)
- [ ] T-020 Cut ordering: containment tree, inside-first, nearest-neighbour travel. Closes: BP-GEO-004. Check: 'O' inner first; seed-42 shuffled grid ≤ 1.1 × serpentine. (15 min)
- [ ] T-021 Blade offset: corner threshold, overshoot + swivel arc, lead-in on the longest straight, off when firmwareBladeOffset. Closes: BP-GEO-002 (sim part). Check: simulated tip within 0.05 mm. (15 min)
- [ ] T-022 Overcut on closed paths. Closes: BP-GEO-003. Check: ledger tests. (10 min)
- [ ] T-023 Clean-up: drop < 1 mm² islands, simplify with tolerance. Closes: BP-GEO-007. Check: deviation ≤ 0.05 mm. (15 min)
- [ ] T-024 Weeding box and weeding lines. Closes: BP-GEO-006. Check: lines never intersect letters. (15 min)
- [ ] T-025 Step-and-repeat grid inside a given safe area with a gap. Closes: BP-GEO-008. Check: A3 grid count test. (15 min)
- [ ] T-026 Precision suite: 1 m cumulative error < 0.1 mm through the full pipeline. Closes: BP-NFR-001 (precision part). Check: test green. (10 min)

## Phase 3 — Drivers, simulator, streaming (depends on: Phase 2)
- [ ] T-030 MachineProfile types (two widths, feedAxis, originMode, endOfJobAdvanceMm, maxCoordUnits, firmwareBladeOffset, sendsForce/sendsSpeed, serial incl. softwareXonXoff/pacing); profiles C48 (fields flagged [CONFIRMAR]) and Genérico HPGL. Closes: BP-DEV-007. Check: invalid values refused; v1→v2 load test. (15 min)
- [ ] T-031 HPGL driver: encode + stopSequence, chunks ≤ 256 B, FS/VS when flagged, axis swap, segmenting above maxCoordUnits, end-of-job advance; golden fixtures. Closes: BP-DEV-003. Check: all ledger acceptance cases. (15 min)
- [ ] T-032 Driver refuses coordinates outside limits; sheet-length refusal. Closes: BP-NFR-005 (driver part). Check: ledger tests. (10 min)
- [ ] T-033 HPGL parser → polylines (PU travel, PD cut), unknown commands logged. Closes: BP-DEV-004. Check: round-trip within 0.05 mm. (15 min)
- [ ] T-034 SimulatorTransport with configurable buffer, CTS and XON/XOFF emulation. Closes: —. Check: the emulator pauses on 0x13 and resumes on 0x11. (15 min)
- [ ] T-035 Software XON/XOFF gate on port.readable + pacing + maxInFlightBytes in WebSerialTransport. Closes: BP-DEV-002 (sim part). Check: 10 m job, bytes in == bytes out, in-flight never above the cap. (15 min)
- [ ] T-036 Job streamer: "enviado X%", pause (stop feeding), cancel (abort + stopSequence + worst-case knife-up time), disconnect message. Closes: BP-DEV-002 (sim part). Check: ledger tests on the simulator. (15 min)
- [ ] T-037 Driver conformance suite + docs/drivers/CONTRIBUTING.md. Closes: BP-OSS-003. Check: `pnpm test:driver hpgl` green. (15 min)

## Phase 4 — Import and create (depends on: Phase 2)
- [ ] T-040 SVG import: shapes, paths, nested transforms, units incl. 96/72 px/in switch, viewBox-only files, fill rules, strokes (centerline/outline choice); sanitizer. Closes: BP-IMP-001 (part). Check: script/external refs dropped; evenodd hole test. (15 min)
- [ ] T-041 SVG fixture corpus (Inkscape, Illustrator, Figma, Canva) with size assertions. Closes: BP-IMP-001. Check: 20 fixtures within 0.05 mm. (15 min)
- [ ] T-042 Text: opentype.js outlines, width-in-mm sizing, letter spacing; ~20 bundled OFL fonts, lazy-loaded, with provenance entries. Closes: BP-IMP-005 (part). Check: 300 ± 0.1 mm test. (15 min)
- [ ] T-043 Local Font Access integration with graceful denial. Closes: BP-IMP-005. Check: denied → bundled list only. (10 min)
- [ ] T-044 PDF import worker via pdf.js; raster-only detection → vectorize route. Closes: BP-IMP-002. Check: fixture PDFs at true size. (15 min)
- [ ] T-045 Vectorize worker (from T-013): alpha-edge mode, downscaled live threshold preview, full trace on release, > 4 MP downscale, terminate on leave. Closes: BP-IMP-003. Check: e2e on fixtures; timing proxies. (15 min)

## Phase 5 — Screens and flows (depends on: Phases 3–4)
- [ ] T-050 S-01 Início: three job cards, recent projects, connection pill. Closes: BP-UX-001. Check: keyboard e2e. (15 min)
- [ ] T-051 Dexie schema v1 + autosave + .cutproj export/import + Salvar projeto in S-04. Closes: BP-UX-004. Check: reload restores scene; quota warning. (15 min)
- [ ] T-052 S-04 Montagem: canvas, media, transform handles, side panel (size cm, material, mirror, contour, weeding, copies). Closes: BP-GEO-001 (UI), BP-GEO-005 (UI). Check: e2e flow F-02 steps 2–5. (15 min)
- [ ] T-053 Undo/redo stack in the store. Closes: BP-UX-006. Check: 50-step test. (10 min)
- [ ] T-054 S-05 Vetorizar UI with before/after and threshold slider. Closes: BP-IMP-003 (UI). Check: e2e. (15 min)
- [ ] T-055 S-08 Materiais: presets with kiss/through force, speed, passes, blade, mirror; edit; restore; "ajuste no painel" when sendsForce is false. Closes: BP-MAT-001. Check: ledger tests. (15 min)
- [ ] T-056 Cut mode (meio-corte / corte total) and passes wired into the job. Closes: BP-MAT-001 (job part). Check: through mode uses throughForceG and N passes in the golden output. (10 min)
- [ ] T-057 Cost/area estimate in S-04 and S-07. Closes: BP-MAT-002. Check: unit + e2e. (10 min)
- [ ] T-058 S-07 Cortar: animated preview (PD/PU), estimate from length/speed/acceleration constant, checklist gate, Cortar/Pausar/Cancelar, "enviado X%". Closes: BP-UX-003, BP-UX-002 (part). Check: frame-time proxy; Cortar disabled until checklist. (15 min)
- [ ] T-059 Long-job confirmation dialog (> 2 m on a roll) showing the length. Closes: BP-NFR-005. Check: e2e. (10 min)
- [ ] T-060 .plt download from S-07 with byte equality to the serial path. Closes: BP-DEV-005. Check: Playwright download compare. (10 min)
- [ ] T-061 S-02 Configurar plotter: connect, remember port, settings under Avançado, unsupported-browser banner. Closes: BP-DEV-001 (sim part), BP-NFR-004. Check: mocked serial e2e; Firefox project. (15 min)
- [ ] T-062 S-03 Teste e calibração: material first, test cut (100 mm L + corner square), X/Y measure inputs, factors saved, corners ok/arredondado. Closes: BP-DEV-006 (sim part). Check: ledger unit tests. (15 min)
- [ ] T-063 First-run wizard S-02 → material → S-03, skippable to demo. Closes: BP-UX-008 (sim part). Check: e2e. (15 min)
- [ ] T-064 Jargon scan test: HPGL/offset/baud/DPI absent outside Avançado. Closes: BP-UX-002 (AC1–2). Check: e2e text scan. (10 min)
- [ ] T-065 S-09 Histórico with snapshot + thumbnail per run; repeat from snapshot; keep last 200. Closes: BP-UX-005. Check: e2e incl. deleted project. (15 min)
- [ ] T-066 S-10 Sobre: version, generated licence list (npm, WASM, OFL), language, demo toggle, privacy note. Closes: BP-OSS-001, BP-UX-007. Check: en locale has no pt-BR strings. (15 min)

## Phase 6 — Print side and demo (depends on: Phase 5)
- [ ] T-070 Media presets with printable margins (5 mm flagged until U-08), A4/A3/A2 sheets and the Epson roll 329–914 mm. Closes: BP-PRINT-002. Check: range validation. (10 min)
- [ ] T-071 MarkSpec layout engine with keep-out zone, printable margins and extra marks; placeholder spec flagged [CONFIRMAR]. Closes: BP-ARMS-001 (sim part). Check: unit tests. (15 min)
- [ ] T-072 Print PDF via pdf-lib: page = sheet, artwork + marks + 100 mm ruler, no cut lines. Closes: BP-PRINT-001 (sim part). Check: PDF parse-back ±0.01 mm. (15 min)
- [ ] T-073 Bleed for vectors and bitmaps. Closes: BP-PRINT-003. Check: unit. (15 min)
- [ ] T-074 S-06 Imprimir screen + print guide ("tamanho real / 100 %" first). Closes: BP-PRINT-004. Check: manual review. (15 min)
- [ ] T-075 Demo mode: ?demo=1 forces the simulator; 3 sample projects (lettering, sticker sheet, photo sticker). Closes: BP-OSS-002. Check: full F-05 e2e with no device. (15 min)
- [ ] T-076 PWA: manifest, service worker, offline cut via simulator. Closes: BP-UX-009. Check: offline e2e. (10 min)
- [ ] T-077 Perf proxy suite for §7 and axe on all screens. Closes: BP-NFR-001 (CI part), BP-NFR-002. Check: CI green. (15 min)

## Phase 7 — Hardware closure (depends on: Phase 0 + Phase 6)
- [ ] T-080 Apply H-03/H-06 values to the C48 profile; connect, cut the square, a > 1 m job, and a cancel mid-job (time to knife-up within the computed bound). Closes: BP-DEV-001, BP-DEV-002. Check: photos + times logged. (15 min)
- [ ] T-081 Calibration on the machine: 100 mm L, factors saved, 200 mm line = 200 ± 0.5 mm, corner test judged clean. Closes: BP-DEV-006, BP-GEO-002 (hardware check). Check: photo with ruler. (15 min)
- [ ] T-082 First-run wizard end-to-end on the workshop laptop; one recorded run of the §7 wall-clock budgets. Closes: BP-UX-008, BP-NFR-001. Check: notes in docs/usability/. (15 min)
- [ ] T-083 Three timed cuts; fit the acceleration constant; third cut within ± 20 %. Closes: BP-UX-010. Check: table in docs/protocol/. (15 min)
- [ ] T-084 Apply H-05 to MarkSpec; Epson print read 10/10 by the camera; ruler 100 ± 0.3 mm. Closes: BP-ARMS-001, BP-PRINT-001. Check: photos. (15 min)
- [ ] T-085 docs/protocol/foison-cam.md from H-04/H-07 evidence (method + date). Closes: BP-LEGAL-001 (part). Check: review. (15 min)
- [ ] T-086 SPIKE, timebox 2 sessions: foison-cam driver (camera-mode encode + reply handling). Closes: BP-ARMS-002. Check: A3 ≤ 0.5 mm at four corners; 2 m roll at three mark pairs. On timeout: escalate to T-088 or move BP-ARMS-002 to a decision for Ivan. (spike)
- [ ] T-087 Mark-not-found recovery UI (report or 60 s timeout). Closes: BP-ARMS-003. Check: manual at the partner workshop. (10 min)
- [ ] T-088 Laser fallback wizard if the C48 supports it; otherwise record the waiver and move BP-ARMS-004 out of scope. Closes: BP-ARMS-004. Check: ≤ 1 mm or waiver recorded. (15 min)
- [ ] T-089 Usability session: the pilot operator cuts a printed sticker sheet unaided in ≤ 10 min; findings logged. Closes: BP-UX-002 (AC3). Check: notes in docs/usability/. (15 min)

## Phase 8 — Publish polish (depends on: Phase 7; going public needs Ivan's go)
- [ ] T-090 README: real-cut video/GIF, demo link, architecture diagram, quick start, hardware table, privacy. Closes: BP-OSS-004. Check: manual review. (15 min)
- [ ] T-091 Publish core as an npm package (Node import test). Closes: BP-OSS-006. Check: `node -e` import emits HPGL. (15 min)
- [ ] T-092 Vendor-name audit: no vendor code/assets; names only in compatibility tables. Closes: BP-LEGAL-001. Check: grep + manual. (10 min)

## KNOWN_FAILURE_MODES
- (stub) append {date, task, failure, fix} as they happen
- 2026-11-27, T-005: GitHub Actions jobs fail at 0 s ("recent account payments have failed or your spending limit needs to be increased"). Fix: Ivan fixes billing; meanwhile run the ci.yml steps locally in the Playwright Docker image from a fresh clone.
- 2026-11-27, T-004: Playwright Chromium on labs-srv1 lacks system libs (libatk, libXdamage, libasound). Fix: run the runner in mcr.microsoft.com/playwright:v1.65.1-noble with --network host; preview server on the host.
- 2026-11-27, T-003: pnpm 12 refused vite 8.4.0 (younger than its minimum release age) and added an exclude on its own. Fix: drop the exclude, pin vite 8.3.8.
- 2026-11-27, T-007: the app CSP blocks stray fetches before Playwright routing sees them. Fix: the guard also counts securitypolicyviolation events.
- 2026-11-27, T-013: @visioncortex/vtracer on npm ships Node-only glue. Fix: scripts/build-vtracer-wasm.sh builds --target web from source.
