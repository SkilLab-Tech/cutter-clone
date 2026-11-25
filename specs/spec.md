# Spec — cutter-clone

Generated from docs/blueprint/BLUEPRINT.md §9 (v1, 2026-11-25). The blueprint wins on any conflict.

## Problem and users
A non-expert operator must turn text, vector files or photos into correct cuts on a Foison C48 Pro
Cam roll cutter, including print-and-cut stickers printed on an Epson SC-T5170 and aligned by the
cutter's camera. The bundled tool is hard to use. Roles: Operador (non-expert, pilot: the workshop's printer lead),
Designer (prepares files, may be the same person), Contribuidor (open-source developer).
Platform: installable PWA in Chrome/Edge over Web Serial, a demo with a virtual plotter, and a
reusable core package.

## Non-goals
- A full vector illustration editor (layers, node editing, booleans UI). Inkscape/Illustrator do that; we import.
  - Driving the Epson printer directly, RIP, ICC color management or color correction. We export a 1:1 PDF; the Epson driver prints it.
  - Multi-color vinyl layering with registration between colors (planned V2).
  - Network/Wi-Fi or pendrive transfer automation (we only export a .plt file the user copies).
  - Accounts, cloud sync, sharing, telemetry or any server-side processing.
  - Clip-art / font marketplaces like SignMaster's bundled libraries.
  - Tabs, perforation and pen/plot mode (V2).
  - Resuming an interrupted job from the middle (plain HPGL gives no read-back of what was executed).
  - Cutter models we cannot test. The driver API is open; only the Foison C48 Pro Cam and the generic HPGL profile are supported in V1.
  - Firefox and Safari (no Web Serial). They get demo mode and .plt export only.
  - Decompiling, disassembling or copying anything from SignMaster.

## Stories
### BP-DEV-001 Connect to the cutter through Web Serial and remember the port and settings (P0)
As the Operador, I want to connect the app to the cutter once and have it remembered, so that I can cut without technical setup every time.
Acceptance:
- Given a supported browser and the cutter plugged in, When the user clicks Conectar and picks the port, Then status reads Conectado and the port is reused on next launch without the picker
- Given the port is held by SignMaster, When connecting, Then the app shows 'A porta está em uso por outro programa' and does not crash
- Given Firefox, Then the connect button is replaced by the unsupported-browser banner and .plt export stays enabled
- Given the cable is pulled while connected, Then status changes to Desconectado within 2 s
Cases: happy, failure, negative, boundary        Verifier: e2e        Blocked by: U-02        Status: blocked
Verifier detail: Playwright with a mocked navigator.serial (sim part); hardware-check: connect + 25 mm square cut on the real C48 at the partner workshop (T-070)
HARDWARE-CHECK: do not mark verified until the real-machine check in Phase 7 passes; tasks before it close the sim part only.

### BP-DEV-002 Stream a job with bounded in-flight data, sent-progress, pause and cancel (P0)
As the Operador, I want to see progress and stop a cut safely, so that a mistake never ruins the machine or the roll.
Acceptance:
- Given a job, When sent, Then the label reads 'enviado X%' (bytes sent, not executed), goes 0→100 monotonically, and the run is logged done after the last byte plus the estimated drain time
- Given a job in progress, When Cancelar, Then no further byte is written after the click, the driver stop sequence is sent, and the UI shows the computed worst-case time to knife-up
- Given the port drops, Then the run is logged failed, the UI says the app cannot lift the knife and to press Pausa on the panel, and offers to cut again from the start
- Given a 10 m job in the simulator with a 1 KB device buffer and software XON/XOFF, Then bytes received == bytes generated and the in-flight count never exceeds maxInFlightBytes
Cases: happy, cancellation, failure, boundary        Verifier: integration        Blocked by: U-02        Status: blocked
Verifier detail: Simulator transport with configurable buffer, CTS and XON/XOFF emulation (sim part); hardware-check: a > 1 m real cut completes and a cancel lifts the knife within the computed bound (T-070)
HARDWARE-CHECK: do not mark verified until the real-machine check in Phase 7 passes; tasks before it close the sim part only.

### BP-DEV-003 Driver interface and built-in generic HPGL driver (P0)
As the Contribuidor, I want a clean driver interface with a generic HPGL driver, so that new cutters can be added without touching the UI.
Acceptance:
- Given a square 10x10 mm at origin, 40 units/mm, feedAxis x, sendsForce/sendsSpeed false, Then the output equals the golden file 'IN;PU0,0;PD400,0,400,400,0,400,0,0;PU;'
- Given sendsForce and sendsSpeed true, Then FS and VS commands with the material's values precede the first PD
- Given feedAxis y, Then X and Y are swapped relative to the feedAxis x golden file
- Given a coordinate above maxCoordUnits, Then the driver segments with relative moves and the simulator reconstructs the same path
- Given an empty job, Then the driver emits init + knife-up only
- Given a NaN coordinate, Then the driver throws a typed error and emits nothing
Cases: happy, boundary, invalid-input        Verifier: unit
Verifier detail: Golden-file tests in core

### BP-DEV-004 Virtual plotter that parses driver bytes and draws the knife path (P0)
As the Contribuidor / visitor, I want a virtual plotter that draws what the cutter would do, so that I can test and demo without hardware.
Acceptance:
- Given any HPGL job, When played in the simulator, Then the rendered polyline equals the source paths within 0.05 mm
- Given an unknown command, Then the simulator logs it as unsupported and continues
- Given PU moves, Then they render as dashed travel, PD as cut lines
Cases: happy, invalid-input, boundary        Verifier: unit
Verifier detail: Round-trip test geometry → driver → simulator parse → geometry

### BP-DEV-005 Export the job as a .plt file (P0)
As the Operador, I want to save the job as a .plt file, so that I can cut from a pendrive or another program.
Acceptance:
- Given a ready job, When Salvar .plt, Then a file named <project>-<material>.plt downloads with the same bytes the serial path would send
- Given a job with 0 paths, Then the button is disabled with a tooltip
Cases: happy, boundary        Verifier: e2e
Verifier detail: Playwright download + byte compare with the driver output

### BP-DEV-006 Guided test cut and X/Y scale calibration (P0)
As the Operador, I want a guided test cut and size calibration, so that cuts come out at the exact size.
Acceptance:
- Given a material chosen, Then the test cut uses that material's kiss-cut force and cuts a 100 mm L (X and Y arms) and a 20 mm square with 30/60/90/150° corners
- Given measured X = 100.4 mm, Then scaleX = 100/100.4 rounded to 4 decimals; given Y = 99.8, scaleY = 100/99.8; both saved to the profile
- Given a measurement outside 90–110 mm, Then input is rejected with 'confira a medida'
- Given no material chosen, Then the test cut button is disabled
Cases: happy, invalid-input, boundary        Verifier: unit        Status: blocked
Verifier detail: Unit for the factors (sim part); hardware-check: after calibration a 200 mm line measures 200 ± 0.5 mm with a ruler read to 0.5 mm, and corners are judged clean (T-070)
HARDWARE-CHECK: do not mark verified until the real-machine check in Phase 7 passes; tasks before it close the sim part only.

### BP-DEV-007 Machine profiles (P0)
As the Operador, I want a ready profile for my machine, so that I do not have to know its limits and settings.
Acceptance:
- Given first run, Then profiles 'Foison C48 Pro Cam' and 'Genérico HPGL' exist with every [CONFIRMAR] field visibly flagged until measured
- Given unitsPerMm ≤ 0 or a contour width larger than the plain width, Then save is refused
- Given a profile saved by schema v1, When v2 adds a field, Then it loads with the default
Cases: happy, invalid-input, migration        Verifier: unit

### BP-GEO-001 Path model in mm with transforms and media-bounds check (P0)
As the Designer, I want to move, resize, rotate and mirror the design on the media, so that it fits the vinyl I have.
Acceptance:
- Given a design 700 mm across the roll and a 600 mm usable width for the current mode, Then the job is blocked with options rotate/scale
- Given mirror on, Then the design is flipped along the feed axis around its bounds and the badge 'Espelhado' shows
- Given rotate 90° then -90°, Then coordinates return within 1e-9 mm
Cases: happy, boundary, invalid-input        Verifier: unit
Verifier detail: Property-based tests (fast-check) on transforms

### BP-GEO-002 Drag-knife blade offset compensation (P0)
As the Operador, I want sharp corners without thinking about the blade, so that letters look professional.
Acceptance:
- Given offset 0.25 mm and a corner sharper than the threshold angle (default 150° interior), Then the path overshoots the corner by the offset and swivels on an arc of radius = offset; smoother joins get no swivel
- Given a closed path, Then cutting starts mid-way along its longest straight segment with a lead-in of 2 × offset
- Given firmwareBladeOffset true or offset 0, Then output equals input
- Given a segment shorter than the offset, Then no self-loops are emitted
Cases: happy, boundary, negative        Verifier: unit
Verifier detail: Simulated blade tip from the knife-axis path within 0.05 mm (model self-consistency); hardware-check: corner test of BP-DEV-006 judged clean (T-070)
HARDWARE-CHECK: do not mark verified until the real-machine check in Phase 7 passes; tasks before it close the sim part only.

### BP-GEO-003 Overcut on closed paths (P1)
As the Operador, I want closed shapes fully cut through, so that weeding does not tear the vinyl.
Acceptance:
- Given overcut 1 mm on a closed path, Then the path continues 1 mm past the start along the first segment
- Given an open path, Then no overcut is added
Cases: happy, boundary        Verifier: unit

### BP-GEO-004 Cut order inside-first with minimal travel (P0)
As the Operador, I want the cut done in the right order, so that small inner pieces do not shift and the job is faster.
Acceptance:
- Given the letter 'O', Then the inner path is cut before the outer
- Given 50 stickers in a grid fed in a shuffled order (fixed seed 42), Then total PU travel ≤ 1.1 × the travel of a serpentine order over the same grid
- Given nested shapes 3 deep, Then every child is cut before its parent
Cases: happy, boundary        Verifier: unit

### BP-GEO-005 Automatic sticker contour (P0)
As the Designer, I want an automatic outline around my sticker, so that I do not have to draw cut lines.
Acceptance:
- Given a design and margin 2 mm, Then one closed contour per separate island lies 2 ± 0.05 mm outside the artwork (Clipper2 round join, arc tolerance 0.01 mm)
- Given two islands closer than 2 × margin, Then their contours merge into one
- Given 'cantos arredondados', Then convex corners have radius = margin and concave corners are rounded by a closing (offset out by r, in by r) with r = margin / 2
- Given margin < 0 or > 20 mm, Then the slider clamps and shows the limit
Cases: happy, boundary, invalid-input        Verifier: unit
Verifier detail: Distance sampling against the artwork

### BP-GEO-006 Weeding box and weeding lines (P1)
As the Operador, I want a weeding box and lines, so that removing excess vinyl is quick.
Acceptance:
- Given weeding box 5 mm, Then a rectangle 5 mm outside the design bounds is cut last
- Given weeding lines on, Then cuts between letters never cross a letter
Cases: happy, boundary        Verifier: unit

### BP-GEO-007 Clean-up of tiny fragments and noisy paths (P1)
As the Designer, I want tiny specks removed automatically, so that the knife does not tear the material.
Acceptance:
- Given paths with area < 1 mm², Then they are removed and the count shown ('3 pedacinhos removidos')
- Given simplify tolerance 0.05 mm, Then max deviation from the source ≤ 0.05 mm
Cases: happy, boundary        Verifier: unit

### BP-GEO-008 Step-and-repeat to fill the sheet or roll (P1)
As the Designer, I want to fill the sheet or roll with copies, so that I waste less material.
Acceptance:
- Given 'preencher a folha' on A3 with a 60 mm sticker, gap 3 mm and a given safe area, Then the grid count is the maximum that fits inside that safe area
- Given copies = 1000 on a roll, Then layout length is shown in m and cost updates
Cases: happy, boundary        Verifier: unit
Verifier detail: Takes the safe area as input; for print-and-cut the safe area comes from BP-ARMS-001 and printable margins

### BP-IMP-001 Import SVG at true size (P0)
As the Designer, I want to import an SVG at the right size, so that I can use files from any design tool.
Acceptance:
- Given an SVG with path, rect, circle, polygon, nested transforms and mm/in units, Then imported geometry matches a reference within 0.05 mm
- Given px units or a viewBox without width/height, Then 96 px/in is used, the imported size is shown, and the user can switch to 72 px/in (Illustrator)
- Given curves, Then they are flattened with tolerance ≤ 0.02 mm
- Given fill-rule evenodd vs nonzero, Then holes match the rendering
- Given stroke-only paths, Then the user chooses 'cortar a linha central' or 'cortar o contorno do traço'
- Given an SVG with <script> or external href, Then they are dropped and import succeeds
- Given a corrupt file, Then 'não consegui ler este arquivo' and nothing else changes
- Given text not converted to paths, Then a warning lists it and suggests 'converter em curvas'
Cases: happy, invalid-input, boundary        Verifier: unit
Verifier detail: Fixture corpus of 20 SVGs (Inkscape, Illustrator, Figma, Canva exports)

### BP-IMP-002 Import vector PDF (P1)
As the Designer, I want to import a vector PDF, so that files from clients and Illustrator just work.
Acceptance:
- Given a one-page vector PDF, Then its paths import at true size
- Given a raster-only PDF, Then the user is sent to the vectorize screen
Cases: happy, invalid-input        Verifier: unit

### BP-IMP-003 Vectorize PNG/JPG with live preview (P0)
As the Designer, I want to turn a PNG/JPG into a cuttable shape, so that I can cut from an image I already have.
Acceptance:
- Given a PNG with transparency, Then the alpha edge becomes the shape without threshold tuning
- Given a JPG logo, When the threshold slider moves, Then a downscaled threshold preview updates in < 500 ms; on release the full trace finishes in < 5 s for 4 MP
- Given a 30 MP image, Then it is downscaled to 4 MP with a notice
- Given the user leaves the screen mid-trace, Then the worker is terminated
Cases: happy, boundary, invalid-input, cancellation        Verifier: e2e
Verifier detail: Playwright on fixture images; geometry snapshot tolerance; timings asserted as proxies in CI, measured once on the laptop

### BP-IMP-005 Text tool with open fonts and local fonts (P0)
As the Designer, I want to type text in a nice font at an exact width, so that I can make lettering without another program.
Acceptance:
- Given text 'LETREIRO' in a bundled font at width 300 mm, Then the outline width is 300 ± 0.1 mm
- Given letter spacing +10%, Then glyph advance grows accordingly
- Given Local Font Access denied, Then only bundled fonts list, with no error
- Given an empty text, Then 'Cortar' is disabled
Cases: happy, boundary, permission        Verifier: unit
Verifier detail: opentype.js metrics vs path bounds

### BP-ARMS-001 Registration-mark layout the cutter's camera reads (P0)
As the Designer, I want registration marks the cutter camera can read, so that print and cut line up.
Acceptance:
- Given a sheet, its printable margins and the profile's MarkSpec, Then marks sit at the spec'd positions inside the printable area and artwork stays out of the mark keep-out zone
- Given a layout longer than extraMarksEveryMm, Then intermediate marks are added
- Given a sheet smaller than marks + one design, Then 'não cabe' with the minimum size
Cases: happy, boundary        Verifier: unit        Blocked by: U-03        Status: blocked
Verifier detail: Layout tests (sim part); hardware-check: printed on the Epson, the camera reads all marks 10/10 times (T-071)
HARDWARE-CHECK: do not mark verified until the real-machine check in Phase 7 passes; tasks before it close the sim part only.

### BP-ARMS-002 Contour job in camera mode (P0)
As the Operador, I want to press Cortar on a printed sheet and get an aligned cut, so that stickers come out right.
Acceptance:
- Given a printed A3 sheet loaded, When Cortar, Then the cutter scans the marks and cuts; the offset between printed contour line (test print) and cut is ≤ 0.5 mm at all four corners, print error included
- Given a 2 m roll job with extra marks, Then the offset stays ≤ 0.5 mm at the first, middle and last mark pairs
- Given the sheet loaded skewed, Then the cut lands ≤ 0.5 mm up to the machine's documented skew limit; beyond it the app reports the limit (not a defect of ours)
Cases: happy, failure, boundary        Verifier: prod-smoke        Blocked by: U-01        Status: blocked
Verifier detail: Real cut at the partner workshop; photo with ruler at each corner (T-073)
HARDWARE-CHECK: do not mark verified until the real-machine check in Phase 7 passes; tasks before it close the sim part only.

### BP-ARMS-003 Recovery when marks are not found (P1)
As the Operador, I want clear guidance when the camera cannot find the marks, so that I can fix it myself.
Acceptance:
- Given the cutter reports mark-not-found, or no cutting movement starts within 60 s of the scan command (timeout configurable), Then the app shows a 3-item checklist and Tentar de novo
Cases: failure        Verifier: manual        Blocked by: U-01        Status: blocked

### BP-ARMS-004 Manual laser registration fallback, or documented waiver (P1)
As the Operador, I want a manual alignment fallback, so that I can still cut if the camera mode fails.
Acceptance:
- Given the C48 supports laser mode, Then the wizard shows which mark to aim first and the cut lands ≤ 1 mm
- Given the C48 does not support it (U-01), Then this obligation moves to out-of-scope with the evidence recorded
Cases: happy        Verifier: prod-smoke        Blocked by: U-01        Status: blocked
HARDWARE-CHECK: do not mark verified until the real-machine check in Phase 7 passes; tasks before it close the sim part only.

### BP-PRINT-001 1:1 print PDF with marks and scale ruler (P0)
As the Designer, I want a PDF ready to print at 100%, so that the Epson prints exactly what the cutter expects.
Acceptance:
- Given a layout, Then the PDF page equals the sheet size and contains artwork + marks + a 100 mm ruler, with no cut lines
- Given the PDF parsed back, Then page size and mark positions match the layout within 0.01 mm
- Given the PDF printed at 100 %, Then the ruler measures 100 ± 0.3 mm
Cases: happy, boundary        Verifier: unit        Blocked by: U-03        Status: blocked
Verifier detail: PDF parse-back (sim part); hardware-check: ruler measured on an Epson print (manual, T-071)
HARDWARE-CHECK: do not mark verified until the real-machine check in Phase 7 passes; tasks before it close the sim part only.

### BP-PRINT-002 Sheet and roll presets with printable margins (P0)
As the Designer, I want sheet and roll presets including the Epson roll, so that I do not type sizes.
Acceptance:
- Given presets, Then A4, A3, A2 (single-sheet feed) and 'Rolo Epson T5170' (width editable 329–914 mm, length free) exist, each with printable margins
- Given a roll width outside 329–914, Then it is rejected with the range
- Given margins still [CONFIRMAR] (U-08), Then a conservative 5 mm per side is used and flagged
Cases: happy, invalid-input        Verifier: unit

### BP-PRINT-003 Bleed (P1)
As the Designer, I want artwork extended slightly past the cut, so that edges never show white.
Acceptance:
- Given bleed 1 mm, Then artwork is extended (edge-pixel extrusion for bitmaps, stroke for vectors) 1 mm beyond the contour
Cases: happy, boundary        Verifier: unit

### BP-PRINT-004 Print guide for the Epson (P1)
As the Operador, I want a short printing guide, so that I choose the right media and settings.
Acceptance:
- Given PDF export, Then the guide's first line is 'Imprima em tamanho real / 100 %, sem ajustar à página', followed by media type, media checklist (vinil para jato de tinta, ≤ 0,21 mm no rolo, tubete de 2 pol.), and 'deixe secar antes de recortar'
Cases: happy        Verifier: manual

### BP-MAT-001 Material presets (P0)
As the Operador, I want to pick the material instead of numbers, so that force and speed are right.
Acceptance:
- Given defaults, Then presets exist for vinil de recorte, vinil para jato de tinta, papel adesivo, termocolante (mirror on), máscara, each with kiss-cut force, through-cut force, speed, passes; values marked 'ajuste com o teste de corte'
- Given a job, Then cut mode 'meio-corte' (kiss) or 'corte total' (through) picks the force and passes
- Given the profile has sendsForce false, Then the cut checklist shows 'ajuste a força para X g no painel' instead of sending it
- Given force outside the profile's range, Then save is refused with the range
- Given 'restaurar padrões', Then user edits are replaced after confirmation
Cases: happy, invalid-input, migration        Verifier: unit

### BP-MAT-002 Material and cost estimate (P1)
As the Designer, I want to see how much material and money a job uses, so that I can price it.
Acceptance:
- Given layout and price R$/m², Then area (m², 2 decimals) and cost (R$) show; price empty → only area
Cases: happy, boundary        Verifier: unit

### BP-UX-001 Home with three jobs (P0)
As the Operador, I want to start from what I want to make, so that I know where to go.
Acceptance:
- Given first open, Then three cards: Letreiro em vinil, Adesivo impresso e recortado, Repetir um trabalho (disabled with hint when history is empty)
- Given keyboard only, Then all three are reachable and activatable
Cases: happy, boundary        Verifier: e2e

### BP-UX-002 Guided steps, plain language, jargon under Avançado (P0)
As the Operador, I want simple steps and checklists, so that I never need the manual.
Acceptance:
- Given any default screen, Then the words HPGL, offset, baud, DPI do not appear outside the Avançado panel (string test)
- Given the pre-cut checklist unchecked, Then Cortar stays disabled
- Given the pilot operator with no help, Then they cut a printed sticker sheet in ≤ 10 min from opening the app (usability session)
Cases: happy, negative        Verifier: e2e
Verifier detail: Playwright text scan (AC1–2); hardware-check: usability session at the partner workshop for AC3 (T-076)
HARDWARE-CHECK: do not mark verified until the real-machine check in Phase 7 passes; tasks before it close the sim part only.

### BP-UX-003 Animated cut preview with time estimate (P0)
As the Operador, I want to watch the cut before it happens and know how long it takes, so that I trust it before using material.
Acceptance:
- Given a job, Then the preview animates PD cuts and PU travel in the driver's order and shows an estimated time from path length, speed and a per-profile acceleration constant
- Given 5,000 segments, Then the frame-time proxy stays within the §7 budget
Cases: happy, boundary        Verifier: e2e

### BP-UX-004 Save/open project and autosave (P0)
As the Designer, I want my work saved automatically and as a file, so that I never lose it.
Acceptance:
- Given edits, Then autosave within 2 s and a reload restores the same scene
- Given Salvar projeto, Then a .cutproj downloads; opening it restores project.json byte-for-byte
- Given IndexedDB quota exceeded, Then a visible warning and the export still works
Cases: happy, failure, migration        Verifier: e2e

### BP-UX-005 Job history and repeat (P1)
As the Operador, I want to repeat a past job, so that reorders take one click.
Acceptance:
- Given a finished job, Then it lists with thumbnail, material and date; Repetir opens the cut screen with the stored snapshot even if the project was edited or deleted
- Given 201 runs, Then the oldest is dropped
Cases: happy, boundary        Verifier: e2e

### BP-UX-006 Undo/redo (P1)
As the Designer, I want undo and redo, so that experimenting is safe.
Acceptance:
- Given 50 edits, Then Ctrl+Z steps back 50 and Ctrl+Shift+Z forward
Cases: happy, boundary        Verifier: unit

### BP-UX-007 i18n pt-BR default, en second locale (P1)
As the Visitor, I want the app in English too, so that it works for the international audience.
Acceptance:
- Given locale en, Then no pt-BR string remains (missing-key test fails CI)
Cases: happy        Verifier: unit

### BP-UX-008 First-run setup (P0)
As the Operador, I want a first-run setup, so that the machine is ready in minutes.
Acceptance:
- Given first open on Chrome, Then the wizard runs conectar → material → teste de corte, and can be skipped to demo
- Given an unsupported browser, Then the wizard explains and offers demo
Cases: happy, negative, failure        Verifier: e2e        Blocked by: U-02        Status: blocked
Verifier detail: Mocked serial (sim part); hardware-check with the real C48 (T-070)
HARDWARE-CHECK: do not mark verified until the real-machine check in Phase 7 passes; tasks before it close the sim part only.

### BP-UX-009 Installable offline PWA (P1)
As the Operador, I want to install the app and use it offline, so that a shop without internet still works.
Acceptance:
- Given installed and offline, Then the app opens, imports SVG and cuts via the simulator
Cases: happy, offline        Verifier: e2e

### BP-UX-010 Time estimate calibrated to the real machine (P1)
As the Operador, I want a time estimate that matches the real machine, so that I can plan the work.
Acceptance:
- Given the acceleration constant fitted from two real cuts, Then the estimate is within ± 20 % of the measured time of a third cut
Cases: happy        Verifier: prod-smoke        Status: blocked
Verifier detail: Three timed cuts on the C48 (T-070)
HARDWARE-CHECK: do not mark verified until the real-machine check in Phase 7 passes; tasks before it close the sim part only.

### BP-OSS-001 MIT license and license gate (P0)
As the Contribuidor, I want a permissive licence that stays clean, so that anyone can reuse it.
Acceptance:
- Given CI, Then a license check fails the build on any GPL/AGPL/LGPL dependency in the shipped bundle
- Given WASM modules and fonts, Then each has a provenance entry (source repo, version, licence file) checked by the same gate
- Given the Sobre screen, Then the third-party list covers npm deps, WASM sources and OFL font notices
Cases: happy, negative        Verifier: integration

### BP-OSS-002 Public demo mode (P0)
As the Visitor, I want to try the whole flow without a plotter, so that I see what it does.
Acceptance:
- Given ?demo=1, Then the simulator transport is active, 3 sample projects load, and the full sticker flow completes with no device
Cases: happy        Verifier: e2e

### BP-OSS-003 Driver contribution guide and golden-file kit (P1)
As the Contribuidor, I want a guide and a test kit for drivers, so that I can add my cutter.
Acceptance:
- Given a new driver folder with fixtures, Then `pnpm test:driver <id>` runs the shared conformance suite
Cases: happy        Verifier: integration

### BP-OSS-004 README, video, architecture, docs (P0)
As the Visitor, I want a README that shows a real cut, so that I understand and trust the project.
Acceptance:
- Given the repo, Then README has a GIF/video of a real C48 cut, a demo link, an architecture diagram, quick start, a supported hardware table and a privacy note
Cases: happy        Verifier: manual        Status: blocked

### BP-OSS-005 CI pipeline (P0)
As the Contribuidor, I want CI that blocks broken changes, so that main always works.
Acceptance:
- Given a PR, Then typecheck, lint, unit, e2e, build and license gate run and block merge on failure; main deploys to Pages
Cases: happy, negative        Verifier: integration

### BP-OSS-006 Core as its own npm package (P1)
As the Contribuidor, I want the core as a package, so that I can build a CLI or another app.
Acceptance:
- Given `npm i <core>`, Then Node can import SVG, build a job and emit HPGL without DOM
Cases: happy        Verifier: integration

### BP-NFR-001 Performance budgets (P0)
As the Operador, I want a fast app on a modest laptop, so that it never feels stuck.
Acceptance:
- Given §7 budgets, Then CI asserts deterministic proxies (segments/ms, frame-time in a fixed trace, bundle size)
- Given the workshop laptop, Then one recorded run meets the wall-clock budgets
Cases: boundary        Verifier: e2e
Verifier detail: CI proxies + one recorded manual measurement

### BP-NFR-002 Accessibility WCAG 2.2 AA (P0)
As the user, I want an accessible interface, so that everyone can operate it.
Acceptance:
- Given each screen, Then axe-core reports 0 serious/critical violations
Cases: happy        Verifier: e2e

### BP-NFR-003 Privacy: local only, no telemetry (P0)
As the Designer, I want my files never uploaded, so that client artwork stays private.
Acceptance:
- Given any flow, Then the e2e network guard sees no request outside the app origin
Cases: negative        Verifier: e2e

### BP-NFR-004 Browser support and degradation (P0)
As the user, I want to know if my browser can cut, so that I am not stuck.
Acceptance:
- Given Chrome/Edge ≥ last 2 versions, Then everything works
- Given Firefox/Safari, Then design, PDF and .plt export work and Conectar is replaced by the banner
Cases: happy, negative        Verifier: e2e

### BP-NFR-005 Machine safety (P0)
As the Operador, I want the app to refuse unsafe moves, so that the machine is never damaged.
Acceptance:
- Given any coordinate outside [0, usable width of the current mode] across the roll, Then the driver refuses to emit the job
- Given a sheet profile with mediaLength N and a job longer than N, Then the job is refused; given a roll, a job longer than 2 m needs an explicit confirmation showing its length
Cases: negative, boundary        Verifier: unit
Verifier detail: Driver unit tests + e2e for the confirmation dialog

### BP-LEGAL-001 Behavior-only evidence and nominative use of vendor names (P1)
As the maintainer, I want the project free of vendor code and assets, so that it can be published safely.
Acceptance:
- Given the repo, Then no SignMaster or Foison code, icon, text or asset is present; vendor names appear only in compatibility tables ('funciona com …')
- Given U-01 work, Then evidence comes from vendor docs/support, files SignMaster saves, or bytes on our own port when U-06 allows, recorded in docs/protocol/foison-cam.md with method and date; nothing from decompiling
Cases: negative        Verifier: manual        Blocked by: U-06        Status: blocked

## Later (P2)
- BP-GEO-009 Tiling of oversize designs
- BP-IMP-004 Import DXF
- BP-IMP-006 Local photo background removal
- BP-IMP-007 Import PLT/HPGL
