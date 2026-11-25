# cutter-clone — Blueprint v1
Mode: IDEA + behavior reference (SignMaster V3.5)      Date: 2026-11-25      Readiness: ready-with-gaps
Language: technical EN / UI pt-BR (en as second locale)
Source: Ivan's brief (chat 2026-11-25) + photos of the equipment + public docs (sources in §12)
Owner: Ivan (open-source portfolio project). Supporting lab: software-lab [CONFIRM]. Related PRD: none
Spec basis: behavior-only (not a legal clean-room). SignMaster EULA: not yet read (U-06).
Review: independent pass by a different model (Sonnet 5.5) on 2026-11-25; its 28 findings are applied here.
Working name is a placeholder; naming is out of scope for this blueprint.

## 0. Context (why this exists)

- The equipment is at a partner workshop, whose owner authorized its use for the group's projects.
  The workshop's printer lead is the pilot operator (non-expert).
  - **Cutter:** Foison C48 Pro Cam, a 48" class roll cutter with a camera that reads registration
    marks. OBSERVED (photo 2026-11-25). The camera reads marks automatically. OBSERVED for the
    sibling C24 Pro Cam (Foison BR store); INFERRED for the C48.
  - **Printer:** Epson SureColor SC-T5170. OBSERVED (photo). 36" roll (329–914 mm), 2" core,
    roll media 0.05–0.21 mm. OBSERVED (Epson FAQ). Factory ink is pigment UltraChrome XD2
    (Epson specs). The pilot operator says the unit has an ink-tank conversion; the ink now in it is UNKNOWN (U-07).
  - **PC:** a Windows laptop with Chrome next to the machines, running SignMaster V3.5. OBSERVED (photo).
- The bundled software (SignMaster) is the only supported way to drive the cutter today, and it
  is hard for non-experts. Goal: a free, open-source, browser-based app that a non-expert can use,
  with more features than the bundled tool for the two jobs that matter: vinyl lettering and
  print-and-cut stickers. It is also a portfolio piece, so the bar is a demo without hardware,
  a tested core, a clean architecture and a video of a real cut.

## 1. Purpose and boundaries

- **Core job:** turn a design (text, vector file or photo) into a correct cut on a roll vinyl
  cutter, including print-and-cut stickers aligned by the cutter's camera, without the user
  knowing what HPGL, blade offset or registration marks are.
- **User roles** (single-user local app, no accounts):
  - **Operador:** loads media, follows the wizard, cuts. Non-expert. Pilot: the workshop's printer lead.
  - **Designer:** prepares or imports the design, picks the material, exports the print PDF. Can be
    the same person.
  - **Contribuidor:** open-source developer who adds a cutter driver or a feature. Uses the docs,
    the simulator and the driver test kit.
- **Platform:** installable PWA (Chrome/Edge desktop) talking to the cutter over the Web Serial
  API. A static hosted demo runs against a virtual plotter. The core library is a separate TS
  package (runs in browser and Node) so a CLI or desktop shell can reuse it later.
- **Non-goals (V1 will NOT include):**
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

## 1a. Surface map

| Surface | Roles | Platform | Modules | Offline | Distribution |
|---|---|---|---|---|---|
| App | Operador, Designer | PWA, Chrome/Edge on Windows/macOS/Linux | dev, geo, imp, arms, print, mat, ux | yes (after first load) | hosted static site + "Instalar app" |
| Demo | anyone (LinkedIn, GitHub visitors) | same build, simulator transport forced | all except real device | yes | same URL with `?demo=1` |
| Core package | Contribuidor | npm package (TS) | geo, imp (SVG), dev drivers, simulator | n/a | npm + GitHub |

One codebase, one ledger. A desktop shell (Tauri/Electron) exists only if U-02 shows the cutter
cannot be reached as a serial port from the browser. In that case BP-DEV-001 changes and the rest
stays. This is checked at gate G-1 (tasks Phase 1b), before most UI work.

## 2. Capability map

Evidence key: OBS = OBSERVED, INF = INFERRED, UNK = UNKNOWN; "docs" = third-party public docs,
not our own observation of SignMaster V3.5. Full records in §9.

**Blocking rule.** An obligation is `blocked` when it has a direct blocker. It is also blocked
when its verifier needs the real machine and a dependency is blocked by a hardware unknown.
Tasks that build such an obligation against the simulator close only its "sim part". The
obligation moves on only at its hardware task (Phase 7).

### Device and connection (dev)
| ID | Capability | P | Evidence | Status |
|---|---|---|---|---|
| BP-DEV-001 | Connect to the cutter from the browser (Web Serial), remember the port and settings | P0 | INF (a C48 shows as CH340 USB-serial in a hackspace wiki; Foison BR links an FTDI VCP driver) | blocked (U-02) |
| BP-DEV-002 | Stream a job with bounded in-flight data, "sent" progress, pause and cancel | P0 | INF | blocked (U-02) |
| BP-DEV-003 | Driver interface; built-in generic HPGL driver | P0 | INF (a hackspace C48 executes HPGL; not yet seen on our Pro Cam) | specified |
| BP-DEV-004 | Virtual plotter (simulator) that renders exactly the bytes a driver emits | P0 | NEW | specified |
| BP-DEV-005 | Export the job as a .plt file | P0 | NEW (pendrive use on the C48 is U-05) | specified |
| BP-DEV-006 | Guided test cut and X/Y scale calibration | P0 | docs (SignMaster manual has a cutter-scale routine) | blocked (U-02, transitive) |
| BP-DEV-007 | Machine profiles (widths, axes, origin, port, force/speed delivery, marks) | P0 | INF | specified |

### Geometry and toolpath (geo)
| ID | Capability | P | Evidence | Status |
|---|---|---|---|---|
| BP-GEO-001 | Path model in mm with move/scale/rotate/mirror and media-bounds check | P0 | NEW | specified |
| BP-GEO-002 | Drag-knife blade offset compensation (off when firmware does it) | P0 | INF (standard drag-knife geometry) | specified |
| BP-GEO-003 | Overcut on closed paths | P1 | INF | specified |
| BP-GEO-004 | Cut order: inner shapes first, minimal travel | P0 | NEW | specified |
| BP-GEO-005 | Automatic sticker contour (offset, merge, rounded convex corners) | P0 | docs (SignMaster "create cut contour") + CHANGE (one slider) | specified |
| BP-GEO-006 | Weeding box and weeding lines | P1 | ADD | specified |
| BP-GEO-007 | Clean-up: drop tiny fragments, simplify noisy paths | P1 | ADD | specified |
| BP-GEO-008 | Step-and-repeat / nesting to fill the sheet or roll with N copies | P1 | ADD | specified |
| BP-GEO-009 | Tiling of designs wider than the cutter | P2 | ADD | open |

### Import and create (imp)
| ID | Capability | P | Evidence | Status |
|---|---|---|---|---|
| BP-IMP-001 | Import SVG at true size | P0 | NEW | specified |
| BP-IMP-002 | Import vector PDF (and Illustrator files saved PDF-compatible) | P1 | NEW | specified |
| BP-IMP-003 | Import PNG/JPG and vectorize with a live preview | P0 | ADD | specified |
| BP-IMP-004 | Import DXF | P2 | ADD | open |
| BP-IMP-005 | Text tool with bundled open fonts + local fonts, converted to paths | P0 | docs (SignMaster lettering) + CHANGE | specified |
| BP-IMP-006 | Remove photo background locally before contour | P2 | ADD | open |
| BP-IMP-007 | Import PLT/HPGL from other software | P2 | ADD | open |

### Print-and-cut with camera (arms)
| ID | Capability | P | Evidence | Status |
|---|---|---|---|---|
| BP-ARMS-001 | Registration-mark layout the cutter's camera can read | P0 | OBS (machine has a mark camera) / UNK (mark geometry) | blocked (U-03) |
| BP-ARMS-002 | Send a contour job in camera mode; cutter reads marks and cuts aligned | P0 | docs (SignMaster CUT+ARMS) / UNK (protocol) | blocked (U-01) |
| BP-ARMS-003 | Plain-language recovery when marks are not found | P1 | INF | blocked (U-01) |
| BP-ARMS-004 | Manual (laser pointer) registration fallback, or documented waiver | P1 | docs (laser-aimed marks on other SignMaster cutters) / UNK for C48 | blocked (U-01) |

### Print side (print)
| ID | Capability | P | Evidence | Status |
|---|---|---|---|---|
| BP-PRINT-001 | Export a 1:1 print PDF: artwork + marks + scale ruler, no cut lines | P0 | NEW | blocked (U-03) |
| BP-PRINT-002 | Sheet and roll presets with printable margins, incl. Epson SC-T5170 roll | P0 | OBS (Epson FAQ) / UNK (margins, U-08) | specified |
| BP-PRINT-003 | Bleed: extend artwork past the contour so edges never show white | P1 | ADD | specified |
| BP-PRINT-004 | Print guide for the Epson (100 % / actual size first, media, drying) | P1 | ADD | specified |

### Materials (mat)
| ID | Capability | P | Evidence | Status |
|---|---|---|---|---|
| BP-MAT-001 | Material presets: kiss-cut and through-cut force, speed, passes, blade, mirror | P0 | CHANGE (SignMaster exposes raw numbers) | specified |
| BP-MAT-002 | Material and cost estimate per job (m², R$/m²) | P1 | ADD | specified |

### Experience (ux)
| ID | Capability | P | Evidence | Status |
|---|---|---|---|---|
| BP-UX-001 | Home with three jobs: Letreiro, Adesivo impresso, Repetir | P0 | CHANGE | specified |
| BP-UX-002 | Guided steps with checklists and plain language; jargon only under "Avançado" | P0 | CHANGE | specified |
| BP-UX-003 | Animated cut preview with a time estimate | P0 | ADD | specified |
| BP-UX-004 | Save/open project file and autosave | P0 | NEW | specified |
| BP-UX-005 | Job history and "repeat this job" | P1 | ADD | specified |
| BP-UX-006 | Undo/redo | P1 | NEW | specified |
| BP-UX-007 | i18n: pt-BR default, en second locale | P1 | ADD | specified |
| BP-UX-008 | First-run setup: browser check, connect, material, test cut | P0 | ADD | blocked (U-02, via BP-DEV-001) |
| BP-UX-009 | Installable offline PWA | P1 | ADD | specified |
| BP-UX-010 | Time estimate calibrated to the real machine (± 20 %) | P1 | ADD | blocked (U-02, transitive) |

### Open-source project (oss)
| ID | Capability | P | Evidence | Status |
|---|---|---|---|---|
| BP-OSS-001 | MIT license with a license gate covering npm deps, WASM sources and fonts | P0 | NEW | specified |
| BP-OSS-002 | Public demo mode with sample files, no hardware needed | P0 | ADD | specified |
| BP-OSS-003 | Driver contribution guide + golden-file test kit | P1 | ADD | specified |
| BP-OSS-004 | README with real-cut video, architecture diagram, docs site | P0 | ADD | blocked (U-02, transitive: needs a real cut) |
| BP-OSS-005 | CI: typecheck, lint, unit, e2e, build, license gate, deploy | P0 | NEW | specified |
| BP-OSS-006 | Core published as its own npm package | P1 | ADD | specified |

### Non-functional (nfr)
| ID | Capability | P | Evidence | Status |
|---|---|---|---|---|
| BP-NFR-001 | Performance budgets (§7) | P0 | NEW | specified |
| BP-NFR-002 | Accessibility WCAG 2.2 AA | P0 | NEW | specified |
| BP-NFR-003 | Privacy: files never leave the machine; no telemetry | P0 | NEW | specified |
| BP-NFR-004 | Browser support matrix and graceful degradation | P0 | INF (Web Serial is Chromium-desktop only; MDN marks it limited availability) | specified |
| BP-NFR-005 | Machine safety: never command beyond media limits; long jobs confirmed | P0 | NEW | specified |

### Legal hygiene (legal)
| ID | Capability | P | Evidence | Status |
|---|---|---|---|---|
| BP-LEGAL-001 | Behavior-only evidence; vendor names only as nominative compatibility | P1 | rule | blocked (U-06) |

## 3. Flows

```
F-01 First run (Operador)
1. Opens the app → browser check; Firefox/Safari → banner "use Chrome ou Edge para cortar", demo + .plt export stay available → BP-NFR-004, BP-UX-008
2. "Conectar plotter" → browser port picker → profile "Foison C48 Pro Cam" pre-selected → BP-DEV-001, BP-DEV-007
   unhappy: no port listed → driver checklist (USB cable, Device Manager, driver link) → BP-UX-002
3. Picks the material loaded in the machine (default: "vinil de recorte") → BP-MAT-001
4. Load any scrap of that material → "Teste de corte" cuts a 100 mm L (X and Y arms) plus a 20 mm square with 30/60/90/150° corners → BP-DEV-006
5. User measures both arms, types e.g. 100.4 and 99.8 → scale factors saved to the profile; corners judged "ok / arredondado" → BP-DEV-006, BP-GEO-002
6. Ready

F-02 Vinyl lettering (Letreiro)
1. Home → "Letreiro em vinil" → BP-UX-001
2. Types text, picks font, sets width in cm (or imports SVG/PDF) → BP-IMP-005, BP-IMP-001, BP-IMP-002
3. Picks material; HTV material auto-mirrors with a visible "espelhado" badge → BP-MAT-001, BP-GEO-001
4. Optional weeding box/lines, copies along the roll → BP-GEO-006, BP-GEO-008
5. Design wider than usable width → blocking message with "girar 90°" / "reduzir" buttons → BP-GEO-001, BP-NFR-005
6. Preview animates the cut, shows estimated time and vinyl used → BP-UX-003, BP-MAT-002
7. Checklist (lâmina, vinil carregado, roletes, origem) → "Cortar" → "enviado X%" → done → BP-UX-002, BP-DEV-002
   unhappy: USB unplugged mid-job → "A conexão caiu. O app não consegue levantar a faca: aperte Pausa no painel da plotter." Offer "cortar de novo do início" → BP-DEV-002

F-03 Printed sticker (Adesivo impresso e recortado)
1. Home → "Adesivo impresso" → imports PNG/JPG/SVG/PDF; PNG with transparency uses alpha as the shape → BP-IMP-003, BP-IMP-001
2. Contour slider (margem em mm), bleed toggle, cut mode (meio-corte para cartela / corte total para unidade) → BP-GEO-005, BP-PRINT-003, BP-MAT-001
3. Choose sheet (A4/A3/A2/roll Epson) and copies → layout fills the area inside the marks and printable margins → BP-PRINT-002, BP-GEO-008, BP-ARMS-001
4. "Baixar PDF para imprimir" → 1:1 PDF + print guide (first line: imprimir em tamanho real / 100 %) → BP-PRINT-001, BP-PRINT-004
5. Prints on the Epson; lets it dry; loads the sheet on the cutter; checklist with a picture of where the first mark goes → BP-UX-002
6. "Cortar" → cutter camera reads the marks and cuts → BP-ARMS-002
   unhappy: mark not found → guidance (sheet straight, light, marks not covered) and retry → BP-ARMS-003
   unhappy: camera mode unavailable → manual laser registration if the machine supports it → BP-ARMS-004

F-04 Repeat a job
1. Home → "Repetir" → history list with thumbnails → BP-UX-005
2. Pick → the stored snapshot (design, material, layout) → preview → cut → BP-UX-003, BP-DEV-002

F-05 Demo without hardware (visitor)
1. Opens `?demo=1` or clicks "Experimentar sem plotter" → simulator transport → BP-OSS-002, BP-DEV-004
2. Loads a sample sticker → contour → "Cortar" → the virtual plotter draws the knife path in real time → BP-DEV-004, BP-UX-003

F-06 Export for pendrive / other software
1. Any flow, step "Cortar" → "Salvar arquivo .plt" → BP-DEV-005
```

## 4. Screens

| Screen | Purpose | Obligations | States |
|---|---|---|---|
| S-01 Início | Three jobs, recent projects, connection status | BP-UX-001, BP-UX-004, BP-UX-005, BP-OSS-002 | empty (no projects), loading, error (storage blocked) |
| S-02 Configurar plotter | Port, profile, port settings, first-run checklist | BP-DEV-001, BP-DEV-007, BP-UX-008, BP-NFR-004 | empty (no port), connecting, connected, error (busy/unsupported) |
| S-03 Teste e calibração | Material pick, test cut, measure, scale factors | BP-DEV-006, BP-MAT-001, BP-GEO-002 | idle, cutting, saved, error |
| S-04 Montagem | Canvas with media and design; side panel with size, material, contour, weeding, mirror, copies; Salvar projeto | BP-GEO-001, BP-GEO-003, BP-GEO-005, BP-GEO-006, BP-GEO-007, BP-GEO-008, BP-GEO-009 (P2), BP-IMP-001, BP-IMP-002, BP-IMP-004 (P2), BP-IMP-005, BP-IMP-007 (P2), BP-MAT-001, BP-MAT-002, BP-UX-004, BP-UX-006 | empty (drop zone), loading (import), ready, error (bad file / too wide) |
| S-05 Vetorizar imagem | Threshold/colour trace with before/after | BP-IMP-003, BP-IMP-006 (P2) | loading (worker), preview, error (too large / no shapes) |
| S-06 Imprimir | Sheet preset, copies, bleed, marks, PDF export, print guide | BP-PRINT-001, BP-PRINT-002, BP-PRINT-003, BP-PRINT-004, BP-ARMS-001, BP-GEO-005, BP-GEO-008 | ready, generating, done, error (layout does not fit) |
| S-07 Cortar | Preview animation, checklist, send, progress, long-job confirmation, .plt export | BP-UX-002, BP-UX-003, BP-UX-010, BP-GEO-002, BP-GEO-004, BP-DEV-002, BP-DEV-005, BP-ARMS-002, BP-ARMS-003, BP-ARMS-004, BP-NFR-005 | ready, sending (%), paused, cancelled, done, error (disconnected / mark not found) |
| S-08 Materiais | Presets list and editor | BP-MAT-001, BP-MAT-002 | empty (defaults restorable), editing, error (invalid value) |
| S-09 Histórico | Past jobs, repeat | BP-UX-005 | empty, list, error |
| S-10 Sobre | Version, licenses (npm, WASM, OFL fonts), demo toggle, language, privacy note | BP-OSS-001, BP-OSS-002, BP-UX-007, BP-UX-009, BP-NFR-003 | ready |

Global: BP-NFR-001, BP-NFR-002, BP-NFR-003 and BP-LEGAL-001 apply to every screen. BP-DEV-003,
BP-DEV-004 and BP-OSS-003..006 have no screen (library, repo and CI obligations).

## 5. Data model (local only, IndexedDB)

```
Entity MachineProfile
  id: text PK                          ("foison-c48-procam", "generic-hpgl")
  name: text(80)
  driverId: text                       ("hpgl", "foison-cam" after U-01)
  usableWidthPlainMm: number           [CONFIRMAR on the machine, U-04]
  usableWidthContourMm: number         (camera mode, usually smaller) [CONFIRMAR, U-04]
  mediaLength: "continuous" | number   (roll vs sheet; NFR-005 uses it)
  unitsPerMm: number = 40              (HPGL plotter unit 0.025 mm) [VERIFY, U-04]
  maxCoordUnits: number | null         (if the firmware caps coordinates; driver segments with relative moves, U-04)
  feedAxis: "x" | "y"                  (which HPGL axis runs along the roll)
  originMode: "head-position" | "front-right" | "front-left"
  endOfJobAdvanceMm: number            (feed-out after a job so the next starts clean)
  scaleX, scaleY: number = 1.0         (from calibration)
  firmwareBladeOffset: boolean         (true → software compensation off; U-04)
  sendsForce, sendsSpeed: boolean      (does the machine honour FS/VS or a vendor equivalent? U-04;
                                        false → the app shows "ajuste a força X no painel")
  serial: { baudRate, dataBits: 7|8, parity, stopBits: 1|2,
            flowControl: "none" | "hardware",              (the only values Web Serial accepts)
            softwareXonXoff: boolean,                      (app watches 0x13/0x11 on port.readable)
            paceBytesPerSec: number, maxInFlightBytes: number }   (U-02)
  marks: MarkSpec | null               (U-03)
  Retention: until the user deletes it

Entity MarkSpec
  shape: enum(square, l-corner, circle)  sizeMm  marginMm  minGapMm  extraMarksEveryMm?
  Retention: part of MachineProfile

Entity MediaPreset
  id  name  kind: sheet|roll  widthMm  lengthMm|null  printableMarginsMm: {top,right,bottom,left}  (U-08 for Epson values)

Entity Material
  id: uuid PK   name: text(60)   kind: enum(vinyl-cut, vinyl-inkjet, paper-sticker, htv, stencil, other)
  kissForceG: int   throughForceG: int   speedMmS: int   passes: int = 1
  bladeDeg: enum(30,45,60)   bladeOffsetMm: number   overcutMm: number   mirror: bool
  pricePerM2Brl?: number
  Retention: until deleted; defaults restorable

Entity Project
  id: uuid PK   name: text(120)   createdAt, updatedAt: timestamp
  kind: enum(lettering, print-and-cut)
  design: SceneJson                    (paths in mm, transforms, text runs, source refs)
  sources: Blob[]                      (imported files, kept locally)
  layout: { media, copies, gapMm, bleedMm, contourMm, cutMode: kiss|through }
  materialId: uuid FK → Material   machineId: text FK → MachineProfile
  Retention: until deleted

Entity JobRun
  id: uuid PK   projectId: uuid FK (nullable after project deletion)
  snapshot: SceneJson + layout + material values at send time   thumbnail: Blob (PNG ≤ 50 KB)
  startedAt, endedAt   result: enum(done, cancelled, failed)
  sentPercent: number   bytesSent: int   lengthCutMm: number   areaM2: number
  Retention: last 200 runs, oldest dropped
```

No personal data is collected. Project files may contain client artwork; they stay on the
device (BP-NFR-003). Export format: `.cutproj` = zip of `project.json` + source files.

## 6. Integrations and EXTERNAL dependencies

| Dependency | Provides | Kind | Decision |
|---|---|---|---|
| Cutter firmware camera ARMS | mark reading and axis alignment inside the machine | EXTERNAL (hardware) | integrate once U-01 maps the commands. INF: vision runs on the cutter, not the PC (Foison lists "leitura por câmera automática" as a machine spec). If U-01 shows PC-side vision, re-plan §2 arms |
| Web Serial API | port access from the browser | platform API | integrate; flowControl only "none"/"hardware", so XON/XOFF is done in software |
| SignMaster libraries (clip-art, fonts) | content | EXTERNAL | cut (non-goal) |
| Fonts | lettering | EXTERNAL | build: bundle ~20 OFL fonts (subset, lazy) + Local Font Access where the browser grants it; OFL notices in Sobre |
| Vectorizer | bitmap → paths | library | integrate vtracer (MIT); the browser WASM build is proven in gate G-1 before UI work. potrace is GPL and excluded |
| Offsetting | contour/blade offset | library | integrate Clipper2 (BSL-1.0); the JS/WASM port and its own licence are chosen in gate G-1 |
| PDF | import (pdf.js, Apache-2.0) and export (pdf-lib, MIT) | library | integrate |
| Background removal model | photo cut-out | EXTERNAL (model weights) | P2; only a permissively licensed model running locally (ONNX Runtime Web), else cut |
| Hosting | static app + demo | infra | Cloudflare Pages, free tier: R$ 0/month |

## 7. Non-functional requirements

- Preview of a 5,000-segment design: path build < 1 s and playback frame time ≤ 20 ms. CI asserts deterministic proxies (segments/ms, frame-time budget in a fixed trace). One recorded measurement on the workshop laptop closes it.
- Vectorize: a downscaled threshold preview updates in < 500 ms while the slider moves; the full trace of a 4 MP image runs on release in < 5 s in a Web Worker; the UI thread never blocks > 100 ms.
- First load ≤ 400 KB gzipped JS before lazy chunks; WASM modules load on first use.
- Streaming never overruns the device: in-flight data is capped (maxInFlightBytes) and paced (paceBytesPerSec), with CTS or software XON/XOFF when the machine uses them (U-02). A 10 m job in the simulator arrives with bytes received == bytes generated; one long real cut (> 1 m) at the partner workshop completes.
- Cancel: the app stops feeding immediately and sends the driver stop sequence. Worst-case time to knife-up = in-flight bytes ÷ the machine's cutting rate. It is shown in Avançado and measured once on the C48 (target ≤ 3 s). If the port is lost, the app says it cannot lift the knife and points to the panel's pause button.
- WCAG 2.2 AA: keyboard reachable, visible focus, contrast ≥ 4.5:1, every control labelled; canvas has a text summary (size, copies, cut length).
- Privacy: zero network requests after load except the app's own static assets; fonts are bundled; no analytics. An e2e test fails on any unexpected request.
- Works offline after the first load (service worker), including cutting.
- Coordinates kept in mm as float64 internally; curves flattened with tolerance ≤ 0.02 mm; output rounded to device units only in the driver; cumulative error over 1 m of path < 0.1 mm before calibration factors.
- Security: no `eval`, strict CSP, no remote code; imported SVG sanitized (scripts, external refs, foreignObject dropped).

## 8. Agent access

Not in V1. The core package (BP-OSS-006) lets a later CLI or MCP tool (`cut file.svg --port COM5`)
reuse drivers and geometry without the UI.

## 9. Obligation ledger

```yaml
- id: BP-DEV-001
  title: Connect to the cutter through Web Serial and remember the port and settings
  area: dev  layer: protocol  surfaces: [app]  priority: P0  delta: NEW
  evidence: {tag: INFERRED, source: "Teesside Hackspace wiki: a C48 shows as USB-Serial CH341 (COMx); Foison BR downloads page links an FTDI VCP driver", rests_on: "both are virtual COM ports that Web Serial can open; our unit not yet checked"}
  required_cases: [happy, failure, negative, boundary]
  acceptance:
    - "Given a supported browser and the cutter plugged in, When the user clicks Conectar and picks the port, Then status reads Conectado and the port is reused on next launch without the picker"
    - "Given the port is held by SignMaster, When connecting, Then the app shows 'A porta está em uso por outro programa' and does not crash"
    - "Given Firefox, Then the connect button is replaced by the unsupported-browser banner and .plt export stays enabled"
    - "Given the cable is pulled while connected, Then status changes to Desconectado within 2 s"
  verifier: e2e  verifier_detail: "Playwright with a mocked navigator.serial (sim part); hardware-check: connect + 25 mm square cut on the real C48 at the partner workshop (T-070)"
  depends_on: [BP-DEV-007]  blocked_by: [U-02]  status: blocked

- id: BP-DEV-002
  title: Stream a job with bounded in-flight data, sent-progress, pause and cancel
  area: dev  layer: protocol  surfaces: [app]  priority: P0  delta: NEW
  evidence: {tag: INFERRED, source: "HPGL over serial has no execution read-back; Web Serial write() resolves when the OS accepts bytes (MDN)", rests_on: "plotters have small input buffers; flow control of our unit unknown"}
  required_cases: [happy, cancellation, failure, boundary]
  acceptance:
    - "Given a job, When sent, Then the label reads 'enviado X%' (bytes sent, not executed), goes 0→100 monotonically, and the run is logged done after the last byte plus the estimated drain time"
    - "Given a job in progress, When Cancelar, Then no further byte is written after the click, the driver stop sequence is sent, and the UI shows the computed worst-case time to knife-up"
    - "Given the port drops, Then the run is logged failed, the UI says the app cannot lift the knife and to press Pausa on the panel, and offers to cut again from the start"
    - "Given a 10 m job in the simulator with a 1 KB device buffer and software XON/XOFF, Then bytes received == bytes generated and the in-flight count never exceeds maxInFlightBytes"
  verifier: integration  verifier_detail: "Simulator transport with configurable buffer, CTS and XON/XOFF emulation (sim part); hardware-check: a > 1 m real cut completes and a cancel lifts the knife within the computed bound (T-070)"
  depends_on: [BP-DEV-001, BP-DEV-003]  blocked_by: [U-02]  status: blocked

- id: BP-DEV-003
  title: Driver interface and built-in generic HPGL driver
  area: dev  layer: protocol  surfaces: [app, core]  priority: P0  delta: NEW
  evidence: {tag: INFERRED, source: "Teesside Hackspace wiki: their Foison C48 executes HPGL sent from Inkscape", rests_on: "the Pro Cam keeps HPGL for plain cuts"}
  required_cases: [happy, boundary, invalid-input]
  acceptance:
    - "Given a square 10x10 mm at origin, 40 units/mm, feedAxis x, sendsForce/sendsSpeed false, Then the output equals the golden file 'IN;PU0,0;PD400,0,400,400,0,400,0,0;PU;'"
    - "Given sendsForce and sendsSpeed true, Then FS and VS commands with the material's values precede the first PD"
    - "Given feedAxis y, Then X and Y are swapped relative to the feedAxis x golden file"
    - "Given a coordinate above maxCoordUnits, Then the driver segments with relative moves and the simulator reconstructs the same path"
    - "Given an empty job, Then the driver emits init + knife-up only"
    - "Given a NaN coordinate, Then the driver throws a typed error and emits nothing"
  verifier: unit  verifier_detail: "Golden-file tests in core"
  depends_on: [BP-GEO-001, BP-DEV-007]  blocked_by: []  status: specified

- id: BP-DEV-004
  title: Virtual plotter that parses driver bytes and draws the knife path
  area: dev  layer: protocol  surfaces: [app, core]  priority: P0  delta: ADD
  evidence: {tag: OBSERVED, source: "brief: demo for the portfolio; visitors have no hardware"}
  required_cases: [happy, invalid-input, boundary]
  acceptance:
    - "Given any HPGL job, When played in the simulator, Then the rendered polyline equals the source paths within 0.05 mm"
    - "Given an unknown command, Then the simulator logs it as unsupported and continues"
    - "Given PU moves, Then they render as dashed travel, PD as cut lines"
  verifier: unit  verifier_detail: "Round-trip test geometry → driver → simulator parse → geometry"
  depends_on: [BP-DEV-003]  blocked_by: []  status: specified

- id: BP-DEV-005
  title: Export the job as a .plt file
  area: dev  layer: ui  surfaces: [app]  priority: P0  delta: ADD
  evidence: {tag: INFERRED, source: "Foison C24 Pro Cam page lists pendrive connectivity", rests_on: "the C48 Pro Cam may accept .plt from a pendrive (U-05); the file is useful for other software regardless"}
  required_cases: [happy, boundary]
  acceptance:
    - "Given a ready job, When Salvar .plt, Then a file named <project>-<material>.plt downloads with the same bytes the serial path would send"
    - "Given a job with 0 paths, Then the button is disabled with a tooltip"
  verifier: e2e  verifier_detail: "Playwright download + byte compare with the driver output"
  depends_on: [BP-DEV-003]  blocked_by: []  status: specified

- id: BP-DEV-006
  title: Guided test cut and X/Y scale calibration
  area: dev  layer: ui  surfaces: [app]  priority: P0  delta: CHANGE
  evidence: {tag: OBSERVED, source: "public docs: SignMaster manual (fcc.report 2AVGR-CH16), Vinyl Spooler > Calibration > Cutter Scale; not seen in our V3.5"}
  required_cases: [happy, invalid-input, boundary]
  acceptance:
    - "Given a material chosen, Then the test cut uses that material's kiss-cut force and cuts a 100 mm L (X and Y arms) and a 20 mm square with 30/60/90/150° corners"
    - "Given measured X = 100.4 mm, Then scaleX = 100/100.4 rounded to 4 decimals; given Y = 99.8, scaleY = 100/99.8; both saved to the profile"
    - "Given a measurement outside 90–110 mm, Then input is rejected with 'confira a medida'"
    - "Given no material chosen, Then the test cut button is disabled"
  verifier: unit  verifier_detail: "Unit for the factors (sim part); hardware-check: after calibration a 200 mm line measures 200 ± 0.5 mm with a ruler read to 0.5 mm, and corners are judged clean (T-070)"
  depends_on: [BP-DEV-002, BP-MAT-001]  blocked_by: []  status: blocked

- id: BP-DEV-007
  title: Machine profiles
  area: dev  layer: data  surfaces: [app, core]  priority: P0  delta: NEW
  evidence: {tag: INFERRED, source: "Foison C24 Pro Cam page: contour width 57.5 cm vs 61 cm plain", rests_on: "same pattern on the C48"}
  required_cases: [happy, invalid-input, migration]
  acceptance:
    - "Given first run, Then profiles 'Foison C48 Pro Cam' and 'Genérico HPGL' exist with every [CONFIRMAR] field visibly flagged until measured"
    - "Given unitsPerMm ≤ 0 or a contour width larger than the plain width, Then save is refused"
    - "Given a profile saved by schema v1, When v2 adds a field, Then it loads with the default"
  verifier: unit
  depends_on: []  blocked_by: []  status: specified

- id: BP-GEO-001
  title: Path model in mm with transforms and media-bounds check
  area: geo  layer: data  surfaces: [core]  priority: P0  delta: NEW
  evidence: {tag: OBSERVED, source: "brief"}
  required_cases: [happy, boundary, invalid-input]
  acceptance:
    - "Given a design 700 mm across the roll and a 600 mm usable width for the current mode, Then the job is blocked with options rotate/scale"
    - "Given mirror on, Then the design is flipped along the feed axis around its bounds and the badge 'Espelhado' shows"
    - "Given rotate 90° then -90°, Then coordinates return within 1e-9 mm"
  verifier: unit  verifier_detail: "Property-based tests (fast-check) on transforms"
  depends_on: []  blocked_by: []  status: specified

- id: BP-GEO-002
  title: Drag-knife blade offset compensation
  area: geo  layer: data  surfaces: [core]  priority: P0  delta: NEW
  evidence: {tag: INFERRED, source: "drag knives trail their axis; many cutters compensate in firmware", rests_on: "standard drag-knife geometry"}
  required_cases: [happy, boundary, negative]
  acceptance:
    - "Given offset 0.25 mm and a corner sharper than the threshold angle (default 150° interior), Then the path overshoots the corner by the offset and swivels on an arc of radius = offset; smoother joins get no swivel"
    - "Given a closed path, Then cutting starts mid-way along its longest straight segment with a lead-in of 2 × offset"
    - "Given firmwareBladeOffset true or offset 0, Then output equals input"
    - "Given a segment shorter than the offset, Then no self-loops are emitted"
  verifier: unit  verifier_detail: "Simulated blade tip from the knife-axis path within 0.05 mm (model self-consistency); hardware-check: corner test of BP-DEV-006 judged clean (T-070)"
  depends_on: [BP-GEO-001, BP-DEV-007]  blocked_by: []  status: specified

- id: BP-GEO-003
  title: Overcut on closed paths
  area: geo  layer: data  surfaces: [core]  priority: P1  delta: NEW
  evidence: {tag: INFERRED, source: "common cutter option"}
  required_cases: [happy, boundary]
  acceptance:
    - "Given overcut 1 mm on a closed path, Then the path continues 1 mm past the start along the first segment"
    - "Given an open path, Then no overcut is added"
  verifier: unit
  depends_on: [BP-GEO-001]  blocked_by: []  status: specified

- id: BP-GEO-004
  title: Cut order inside-first with minimal travel
  area: geo  layer: data  surfaces: [core]  priority: P0  delta: NEW
  evidence: {tag: INFERRED, source: "cutting an outer contour first frees the piece and spoils inner cuts"}
  required_cases: [happy, boundary]
  acceptance:
    - "Given the letter 'O', Then the inner path is cut before the outer"
    - "Given 50 stickers in a grid fed in a shuffled order (fixed seed 42), Then total PU travel ≤ 1.1 × the travel of a serpentine order over the same grid"
    - "Given nested shapes 3 deep, Then every child is cut before its parent"
  verifier: unit
  depends_on: [BP-GEO-001]  blocked_by: []  status: specified

- id: BP-GEO-005
  title: Automatic sticker contour
  area: geo  layer: data  surfaces: [core, app]  priority: P0  delta: CHANGE
  evidence: {tag: OBSERVED, source: "public docs: SignMaster 'Create cut contour' with an outline value (cncu.co.za manual contour guide)"}
  required_cases: [happy, boundary, invalid-input]
  acceptance:
    - "Given a design and margin 2 mm, Then one closed contour per separate island lies 2 ± 0.05 mm outside the artwork (Clipper2 round join, arc tolerance 0.01 mm)"
    - "Given two islands closer than 2 × margin, Then their contours merge into one"
    - "Given 'cantos arredondados', Then convex corners have radius = margin and concave corners are rounded by a closing (offset out by r, in by r) with r = margin / 2"
    - "Given margin < 0 or > 20 mm, Then the slider clamps and shows the limit"
  verifier: unit  verifier_detail: "Distance sampling against the artwork"
  depends_on: [BP-GEO-001]  blocked_by: []  status: specified

- id: BP-GEO-006
  title: Weeding box and weeding lines
  area: geo  layer: data  surfaces: [core, app]  priority: P1  delta: ADD
  evidence: {tag: INFERRED, source: "vinyl lettering practice"}
  required_cases: [happy, boundary]
  acceptance:
    - "Given weeding box 5 mm, Then a rectangle 5 mm outside the design bounds is cut last"
    - "Given weeding lines on, Then cuts between letters never cross a letter"
  verifier: unit
  depends_on: [BP-GEO-004]  blocked_by: []  status: specified

- id: BP-GEO-007
  title: Clean-up of tiny fragments and noisy paths
  area: geo  layer: data  surfaces: [core]  priority: P1  delta: ADD
  evidence: {tag: INFERRED, source: "traced bitmaps produce specks the knife tears"}
  required_cases: [happy, boundary]
  acceptance:
    - "Given paths with area < 1 mm², Then they are removed and the count shown ('3 pedacinhos removidos')"
    - "Given simplify tolerance 0.05 mm, Then max deviation from the source ≤ 0.05 mm"
  verifier: unit
  depends_on: [BP-GEO-001]  blocked_by: []  status: specified

- id: BP-GEO-008
  title: Step-and-repeat to fill the sheet or roll
  area: geo  layer: data  surfaces: [core, app]  priority: P1  delta: ADD
  evidence: {tag: INFERRED, source: "brief asks for extra features; Foison markets 'Corte Matriz' and 'Repeat'"}
  required_cases: [happy, boundary]
  acceptance:
    - "Given 'preencher a folha' on A3 with a 60 mm sticker, gap 3 mm and a given safe area, Then the grid count is the maximum that fits inside that safe area"
    - "Given copies = 1000 on a roll, Then layout length is shown in m and cost updates"
  verifier: unit  verifier_detail: "Takes the safe area as input; for print-and-cut the safe area comes from BP-ARMS-001 and printable margins"
  depends_on: [BP-GEO-001]  blocked_by: []  status: specified

- id: BP-GEO-009
  title: Tiling of oversize designs
  area: geo  layer: data  surfaces: [core]  priority: P2  delta: ADD
  evidence: {tag: INFERRED, source: "large signage"}
  required_cases: [happy]
  acceptance: ["(later)"]
  verifier: unit
  depends_on: []  blocked_by: []  status: open

- id: BP-IMP-001
  title: Import SVG at true size
  area: imp  layer: data  surfaces: [core, app]  priority: P0  delta: NEW
  evidence: {tag: OBSERVED, source: "brief"}
  required_cases: [happy, invalid-input, boundary]
  acceptance:
    - "Given an SVG with path, rect, circle, polygon, nested transforms and mm/in units, Then imported geometry matches a reference within 0.05 mm"
    - "Given px units or a viewBox without width/height, Then 96 px/in is used, the imported size is shown, and the user can switch to 72 px/in (Illustrator)"
    - "Given curves, Then they are flattened with tolerance ≤ 0.02 mm"
    - "Given fill-rule evenodd vs nonzero, Then holes match the rendering"
    - "Given stroke-only paths, Then the user chooses 'cortar a linha central' or 'cortar o contorno do traço'"
    - "Given an SVG with <script> or external href, Then they are dropped and import succeeds"
    - "Given a corrupt file, Then 'não consegui ler este arquivo' and nothing else changes"
    - "Given text not converted to paths, Then a warning lists it and suggests 'converter em curvas'"
  verifier: unit  verifier_detail: "Fixture corpus of 20 SVGs (Inkscape, Illustrator, Figma, Canva exports)"
  depends_on: [BP-GEO-001]  blocked_by: []  status: specified

- id: BP-IMP-002
  title: Import vector PDF
  area: imp  layer: data  surfaces: [app]  priority: P1  delta: NEW
  evidence: {tag: INFERRED, source: "designers deliver PDF; Illustrator saves PDF-compatible .ai"}
  required_cases: [happy, invalid-input]
  acceptance:
    - "Given a one-page vector PDF, Then its paths import at true size"
    - "Given a raster-only PDF, Then the user is sent to the vectorize screen"
  verifier: unit
  depends_on: [BP-IMP-001]  blocked_by: []  status: specified

- id: BP-IMP-003
  title: Vectorize PNG/JPG with live preview
  area: imp  layer: worker  surfaces: [app]  priority: P0  delta: ADD
  evidence: {tag: INFERRED, source: "brief: non-experts bring images, not vectors"}
  required_cases: [happy, boundary, invalid-input, cancellation]
  acceptance:
    - "Given a PNG with transparency, Then the alpha edge becomes the shape without threshold tuning"
    - "Given a JPG logo, When the threshold slider moves, Then a downscaled threshold preview updates in < 500 ms; on release the full trace finishes in < 5 s for 4 MP"
    - "Given a 30 MP image, Then it is downscaled to 4 MP with a notice"
    - "Given the user leaves the screen mid-trace, Then the worker is terminated"
  verifier: e2e  verifier_detail: "Playwright on fixture images; geometry snapshot tolerance; timings asserted as proxies in CI, measured once on the laptop"
  depends_on: [BP-GEO-001]  blocked_by: []  status: specified

- id: BP-IMP-004
  title: Import DXF
  area: imp  layer: data  surfaces: [core]  priority: P2  delta: ADD
  evidence: {tag: INFERRED, source: "CAD users"}
  required_cases: [happy]
  acceptance: ["(later)"]
  verifier: unit
  depends_on: [BP-GEO-001]  blocked_by: []  status: open

- id: BP-IMP-005
  title: Text tool with open fonts and local fonts
  area: imp  layer: ui  surfaces: [app]  priority: P0  delta: CHANGE
  evidence: {tag: OBSERVED, source: "public docs: lettering is SignMaster's core use (signmaster.software feature list)"}
  required_cases: [happy, boundary, permission]
  acceptance:
    - "Given text 'LETREIRO' in a bundled font at width 300 mm, Then the outline width is 300 ± 0.1 mm"
    - "Given letter spacing +10%, Then glyph advance grows accordingly"
    - "Given Local Font Access denied, Then only bundled fonts list, with no error"
    - "Given an empty text, Then 'Cortar' is disabled"
  verifier: unit  verifier_detail: "opentype.js metrics vs path bounds"
  depends_on: [BP-GEO-001]  blocked_by: []  status: specified

- id: BP-IMP-006
  title: Local photo background removal
  area: imp  layer: worker  surfaces: [app]  priority: P2  delta: ADD
  evidence: {tag: INFERRED, source: "sticker from a photo"}
  required_cases: [happy]
  acceptance: ["(later; permissive model only)"]
  verifier: e2e
  depends_on: [BP-IMP-003]  blocked_by: []  status: open

- id: BP-IMP-007
  title: Import PLT/HPGL
  area: imp  layer: data  surfaces: [core]  priority: P2  delta: ADD
  evidence: {tag: INFERRED, source: "jobs prepared in other tools"}
  required_cases: [happy]
  acceptance: ["(later; reuse the simulator parser)"]
  verifier: unit
  depends_on: [BP-DEV-004]  blocked_by: []  status: open

- id: BP-ARMS-001
  title: Registration-mark layout the cutter's camera reads
  area: arms  layer: data  surfaces: [core, app]  priority: P0  delta: KEEP
  evidence: {tag: UNKNOWN, source: "Foison: automatic camera reading of registration marks; geometry not published"}
  required_cases: [happy, boundary]
  acceptance:
    - "Given a sheet, its printable margins and the profile's MarkSpec, Then marks sit at the spec'd positions inside the printable area and artwork stays out of the mark keep-out zone"
    - "Given a layout longer than extraMarksEveryMm, Then intermediate marks are added"
    - "Given a sheet smaller than marks + one design, Then 'não cabe' with the minimum size"
  verifier: unit  verifier_detail: "Layout tests (sim part); hardware-check: printed on the Epson, the camera reads all marks 10/10 times (T-071)"
  depends_on: [BP-DEV-007, BP-PRINT-002]  blocked_by: [U-03]  status: blocked

- id: BP-ARMS-002
  title: Contour job in camera mode
  area: arms  layer: protocol  surfaces: [app]  priority: P0  delta: KEEP
  evidence: {tag: UNKNOWN, source: "public docs: SignMaster CUT+ARMS supports it (signmaster.software); command set not public"}
  required_cases: [happy, failure, boundary]
  acceptance:
    - "Given a printed A3 sheet loaded, When Cortar, Then the cutter scans the marks and cuts; the offset between printed contour line (test print) and cut is ≤ 0.5 mm at all four corners, print error included"
    - "Given a 2 m roll job with extra marks, Then the offset stays ≤ 0.5 mm at the first, middle and last mark pairs"
    - "Given the sheet loaded skewed, Then the cut lands ≤ 0.5 mm up to the machine's documented skew limit; beyond it the app reports the limit (not a defect of ours)"
  verifier: prod-smoke  verifier_detail: "Real cut at the partner workshop; photo with ruler at each corner (T-073)"
  depends_on: [BP-ARMS-001, BP-DEV-002]  blocked_by: [U-01]  status: blocked

- id: BP-ARMS-003
  title: Recovery when marks are not found
  area: arms  layer: ui  surfaces: [app]  priority: P1  delta: CHANGE
  evidence: {tag: INFERRED, source: "common failure (PrismCut manual troubleshooting)", rests_on: "the machine reports failure on the port, or no cut starts"}
  required_cases: [failure]
  acceptance: ["Given the cutter reports mark-not-found, or no cutting movement starts within 60 s of the scan command (timeout configurable), Then the app shows a 3-item checklist and Tentar de novo"]
  verifier: manual
  depends_on: [BP-ARMS-002]  blocked_by: [U-01]  status: blocked

- id: BP-ARMS-004
  title: Manual laser registration fallback, or documented waiver
  area: arms  layer: protocol  surfaces: [app]  priority: P1  delta: KEEP
  evidence: {tag: UNKNOWN, source: "public docs: laser-aimed contour on Foison E24L and other SignMaster cutters; not confirmed on the C48 Pro Cam"}
  required_cases: [happy]
  acceptance:
    - "Given the C48 supports laser mode, Then the wizard shows which mark to aim first and the cut lands ≤ 1 mm"
    - "Given the C48 does not support it (U-01), Then this obligation moves to out-of-scope with the evidence recorded"
  verifier: prod-smoke
  depends_on: [BP-ARMS-001]  blocked_by: [U-01]  status: blocked

- id: BP-PRINT-001
  title: 1:1 print PDF with marks and scale ruler
  area: print  layer: data  surfaces: [app]  priority: P0  delta: NEW
  evidence: {tag: INFERRED, source: "standard print-and-cut workflow: print artwork + marks, cut separately"}
  required_cases: [happy, boundary]
  acceptance:
    - "Given a layout, Then the PDF page equals the sheet size and contains artwork + marks + a 100 mm ruler, with no cut lines"
    - "Given the PDF parsed back, Then page size and mark positions match the layout within 0.01 mm"
    - "Given the PDF printed at 100 %, Then the ruler measures 100 ± 0.3 mm"
  verifier: unit  verifier_detail: "PDF parse-back (sim part); hardware-check: ruler measured on an Epson print (manual, T-071)"
  depends_on: [BP-ARMS-001]  blocked_by: [U-03]  status: blocked

- id: BP-PRINT-002
  title: Sheet and roll presets with printable margins
  area: print  layer: data  surfaces: [app]  priority: P0  delta: NEW
  evidence: {tag: OBSERVED, source: "Epson FAQ: SC-T5170 roll width 329–914 mm, 2 in core; single cut sheets 210–914 mm wide, 279–1189 mm long; auto sheet feeder for A4/A3/Letter/Legal"}
  required_cases: [happy, invalid-input]
  acceptance:
    - "Given presets, Then A4, A3, A2 (single-sheet feed) and 'Rolo Epson T5170' (width editable 329–914 mm, length free) exist, each with printable margins"
    - "Given a roll width outside 329–914, Then it is rejected with the range"
    - "Given margins still [CONFIRMAR] (U-08), Then a conservative 5 mm per side is used and flagged"
  verifier: unit
  depends_on: []  blocked_by: []  status: specified

- id: BP-PRINT-003
  title: Bleed
  area: print  layer: data  surfaces: [core]  priority: P1  delta: ADD
  evidence: {tag: INFERRED, source: "prints shift slightly; white edges appear without bleed"}
  required_cases: [happy, boundary]
  acceptance: ["Given bleed 1 mm, Then artwork is extended (edge-pixel extrusion for bitmaps, stroke for vectors) 1 mm beyond the contour"]
  verifier: unit
  depends_on: [BP-GEO-005]  blocked_by: []  status: specified

- id: BP-PRINT-004
  title: Print guide for the Epson
  area: print  layer: ui  surfaces: [app]  priority: P1  delta: ADD
  evidence: {tag: INFERRED, source: "Epson media limits; water-based ink needs inkjet-receptive vinyl (Ferax guides)"}
  required_cases: [happy]
  acceptance: ["Given PDF export, Then the guide's first line is 'Imprima em tamanho real / 100 %, sem ajustar à página', followed by media type, media checklist (vinil para jato de tinta, ≤ 0,21 mm no rolo, tubete de 2 pol.), and 'deixe secar antes de recortar'"]
  verifier: manual
  depends_on: [BP-PRINT-001]  blocked_by: []  status: specified

- id: BP-MAT-001
  title: Material presets
  area: mat  layer: data  surfaces: [app]  priority: P0  delta: CHANGE
  evidence: {tag: OBSERVED, source: "public docs: SignMaster exposes raw force/speed; brief asks for non-expert use"}
  required_cases: [happy, invalid-input, migration]
  acceptance:
    - "Given defaults, Then presets exist for vinil de recorte, vinil para jato de tinta, papel adesivo, termocolante (mirror on), máscara, each with kiss-cut force, through-cut force, speed, passes; values marked 'ajuste com o teste de corte'"
    - "Given a job, Then cut mode 'meio-corte' (kiss) or 'corte total' (through) picks the force and passes"
    - "Given the profile has sendsForce false, Then the cut checklist shows 'ajuste a força para X g no painel' instead of sending it"
    - "Given force outside the profile's range, Then save is refused with the range"
    - "Given 'restaurar padrões', Then user edits are replaced after confirmation"
  verifier: unit
  depends_on: [BP-DEV-007]  blocked_by: []  status: specified

- id: BP-MAT-002
  title: Material and cost estimate
  area: mat  layer: ui  surfaces: [app]  priority: P1  delta: ADD
  evidence: {tag: OBSERVED, source: "brief: extra features"}
  required_cases: [happy, boundary]
  acceptance: ["Given layout and price R$/m², Then area (m², 2 decimals) and cost (R$) show; price empty → only area"]
  verifier: unit
  depends_on: [BP-GEO-008]  blocked_by: []  status: specified

- id: BP-UX-001
  title: Home with three jobs
  area: ux  layer: ui  surfaces: [app]  priority: P0  delta: CHANGE
  evidence: {tag: OBSERVED, source: "brief"}
  required_cases: [happy, boundary]
  acceptance:
    - "Given first open, Then three cards: Letreiro em vinil, Adesivo impresso e recortado, Repetir um trabalho (disabled with hint when history is empty)"
    - "Given keyboard only, Then all three are reachable and activatable"
  verifier: e2e
  depends_on: []  blocked_by: []  status: specified

- id: BP-UX-002
  title: Guided steps, plain language, jargon under Avançado
  area: ux  layer: ui  surfaces: [app]  priority: P0  delta: CHANGE
  evidence: {tag: OBSERVED, source: "brief: 'pessoas leigas'"}
  required_cases: [happy, negative]
  acceptance:
    - "Given any default screen, Then the words HPGL, offset, baud, DPI do not appear outside the Avançado panel (string test)"
    - "Given the pre-cut checklist unchecked, Then Cortar stays disabled"
    - "Given the pilot operator with no help, Then they cut a printed sticker sheet in ≤ 10 min from opening the app (usability session)"
  verifier: e2e  verifier_detail: "Playwright text scan (AC1–2); hardware-check: usability session at the partner workshop for AC3 (T-076)"
  depends_on: []  blocked_by: []  status: specified

- id: BP-UX-003
  title: Animated cut preview with time estimate
  area: ux  layer: ui  surfaces: [app]  priority: P0  delta: ADD
  evidence: {tag: OBSERVED, source: "brief"}
  required_cases: [happy, boundary]
  acceptance:
    - "Given a job, Then the preview animates PD cuts and PU travel in the driver's order and shows an estimated time from path length, speed and a per-profile acceleration constant"
    - "Given 5,000 segments, Then the frame-time proxy stays within the §7 budget"
  verifier: e2e
  depends_on: [BP-DEV-004, BP-GEO-004]  blocked_by: []  status: specified

- id: BP-UX-004
  title: Save/open project and autosave
  area: ux  layer: data  surfaces: [app]  priority: P0  delta: NEW
  evidence: {tag: OBSERVED, source: "brief"}
  required_cases: [happy, failure, migration]
  acceptance:
    - "Given edits, Then autosave within 2 s and a reload restores the same scene"
    - "Given Salvar projeto, Then a .cutproj downloads; opening it restores project.json byte-for-byte"
    - "Given IndexedDB quota exceeded, Then a visible warning and the export still works"
  verifier: e2e
  depends_on: [BP-GEO-001]  blocked_by: []  status: specified

- id: BP-UX-005
  title: Job history and repeat
  area: ux  layer: data  surfaces: [app]  priority: P1  delta: ADD
  evidence: {tag: INFERRED, source: "Foison markets a 'Função Repeat'; brief"}
  required_cases: [happy, boundary]
  acceptance:
    - "Given a finished job, Then it lists with thumbnail, material and date; Repetir opens the cut screen with the stored snapshot even if the project was edited or deleted"
    - "Given 201 runs, Then the oldest is dropped"
  verifier: e2e
  depends_on: [BP-UX-004]  blocked_by: []  status: specified

- id: BP-UX-006
  title: Undo/redo
  area: ux  layer: ui  surfaces: [app]  priority: P1  delta: NEW
  evidence: {tag: INFERRED, source: "baseline expectation"}
  required_cases: [happy, boundary]
  acceptance: ["Given 50 edits, Then Ctrl+Z steps back 50 and Ctrl+Shift+Z forward"]
  verifier: unit
  depends_on: []  blocked_by: []  status: specified

- id: BP-UX-007
  title: i18n pt-BR default, en second locale
  area: ux  layer: ui  surfaces: [app]  priority: P1  delta: ADD
  evidence: {tag: INFERRED, source: "LinkedIn/portfolio audience is partly international"}
  required_cases: [happy]
  acceptance: ["Given locale en, Then no pt-BR string remains (missing-key test fails CI)"]
  verifier: unit
  depends_on: []  blocked_by: []  status: specified

- id: BP-UX-008
  title: First-run setup
  area: ux  layer: ui  surfaces: [app]  priority: P0  delta: ADD
  evidence: {tag: OBSERVED, source: "brief"}
  required_cases: [happy, negative, failure]
  acceptance:
    - "Given first open on Chrome, Then the wizard runs conectar → material → teste de corte, and can be skipped to demo"
    - "Given an unsupported browser, Then the wizard explains and offers demo"
  verifier: e2e  verifier_detail: "Mocked serial (sim part); hardware-check with the real C48 (T-070)"
  depends_on: [BP-DEV-001, BP-DEV-006, BP-MAT-001]  blocked_by: [U-02]  status: blocked

- id: BP-UX-009
  title: Installable offline PWA
  area: ux  layer: ui  surfaces: [app]  priority: P1  delta: ADD
  evidence: {tag: INFERRED, source: "shop laptop may be offline"}
  required_cases: [happy, offline]
  acceptance: ["Given installed and offline, Then the app opens, imports SVG and cuts via the simulator"]
  verifier: e2e
  depends_on: []  blocked_by: []  status: specified

- id: BP-UX-010
  title: Time estimate calibrated to the real machine
  area: ux  layer: data  surfaces: [app]  priority: P1  delta: ADD
  evidence: {tag: INFERRED, source: "estimate needs the machine's real speed and acceleration"}
  required_cases: [happy]
  acceptance: ["Given the acceleration constant fitted from two real cuts, Then the estimate is within ± 20 % of the measured time of a third cut"]
  verifier: prod-smoke  verifier_detail: "Three timed cuts on the C48 (T-070)"
  depends_on: [BP-UX-003, BP-DEV-002]  blocked_by: []  status: blocked

- id: BP-OSS-001
  title: MIT license and license gate
  area: oss  layer: data  surfaces: [core, app]  priority: P0  delta: NEW
  evidence: {tag: OBSERVED, source: "brief: open source"}
  required_cases: [happy, negative]
  acceptance:
    - "Given CI, Then a license check fails the build on any GPL/AGPL/LGPL dependency in the shipped bundle"
    - "Given WASM modules and fonts, Then each has a provenance entry (source repo, version, licence file) checked by the same gate"
    - "Given the Sobre screen, Then the third-party list covers npm deps, WASM sources and OFL font notices"
  verifier: integration
  depends_on: []  blocked_by: []  status: specified

- id: BP-OSS-002
  title: Public demo mode
  area: oss  layer: ui  surfaces: [app]  priority: P0  delta: ADD
  evidence: {tag: OBSERVED, source: "brief: portfolio/LinkedIn"}
  required_cases: [happy]
  acceptance: ["Given ?demo=1, Then the simulator transport is active, 3 sample projects load, and the full sticker flow completes with no device"]
  verifier: e2e
  depends_on: [BP-DEV-004]  blocked_by: []  status: specified

- id: BP-OSS-003
  title: Driver contribution guide and golden-file kit
  area: oss  layer: data  surfaces: [core]  priority: P1  delta: ADD
  evidence: {tag: OBSERVED, source: "brief"}
  required_cases: [happy]
  acceptance: ["Given a new driver folder with fixtures, Then `pnpm test:driver <id>` runs the shared conformance suite"]
  verifier: integration
  depends_on: [BP-DEV-003]  blocked_by: []  status: specified

- id: BP-OSS-004
  title: README, video, architecture, docs
  area: oss  layer: data  surfaces: [core, app]  priority: P0  delta: ADD
  evidence: {tag: OBSERVED, source: "brief: 'precisa ser MUITO BOM'"}
  required_cases: [happy]
  acceptance: ["Given the repo, Then README has a GIF/video of a real C48 cut, a demo link, an architecture diagram, quick start, a supported hardware table and a privacy note"]
  verifier: manual
  depends_on: [BP-OSS-002, BP-DEV-002]  blocked_by: []  status: blocked

- id: BP-OSS-005
  title: CI pipeline
  area: oss  layer: data  surfaces: [core, app]  priority: P0  delta: NEW
  evidence: {tag: OBSERVED, source: "house standard"}
  required_cases: [happy, negative]
  acceptance: ["Given a PR, Then typecheck, lint, unit, e2e, build and license gate run and block merge on failure; main deploys to Pages"]
  verifier: integration
  depends_on: []  blocked_by: []  status: specified

- id: BP-OSS-006
  title: Core as its own npm package
  area: oss  layer: data  surfaces: [core]  priority: P1  delta: ADD
  evidence: {tag: INFERRED, source: "enables CLI/desktop/other apps"}
  required_cases: [happy]
  acceptance: ["Given `npm i <core>`, Then Node can import SVG, build a job and emit HPGL without DOM"]
  verifier: integration
  depends_on: [BP-DEV-003, BP-IMP-001]  blocked_by: []  status: specified

- id: BP-NFR-001
  title: Performance budgets
  area: nfr  layer: ui  surfaces: [app]  priority: P0  delta: NEW
  evidence: {tag: INFERRED, source: "target laptop class (i5, 8 GB) [VERIFY]"}
  required_cases: [boundary]
  acceptance:
    - "Given §7 budgets, Then CI asserts deterministic proxies (segments/ms, frame-time in a fixed trace, bundle size)"
    - "Given the workshop laptop, Then one recorded run meets the wall-clock budgets"
  verifier: e2e  verifier_detail: "CI proxies + one recorded manual measurement"
  depends_on: []  blocked_by: []  status: specified

- id: BP-NFR-002
  title: Accessibility WCAG 2.2 AA
  area: nfr  layer: ui  surfaces: [app]  priority: P0  delta: NEW
  evidence: {tag: OBSERVED, source: "house standard"}
  required_cases: [happy]
  acceptance: ["Given each screen, Then axe-core reports 0 serious/critical violations"]
  verifier: e2e
  depends_on: []  blocked_by: []  status: specified

- id: BP-NFR-003
  title: Privacy: local only, no telemetry
  area: nfr  layer: ui  surfaces: [app]  priority: P0  delta: NEW
  evidence: {tag: OBSERVED, source: "brief + LGPD minimization"}
  required_cases: [negative]
  acceptance: ["Given any flow, Then the e2e network guard sees no request outside the app origin"]
  verifier: e2e
  depends_on: []  blocked_by: []  status: specified

- id: BP-NFR-004
  title: Browser support and degradation
  area: nfr  layer: ui  surfaces: [app]  priority: P0  delta: NEW
  evidence: {tag: INFERRED, source: "MDN: Web Serial is limited availability, secure contexts only", rests_on: "Chromium desktop ships it; Firefox and Safari do not [VERIFY at build time]"}
  required_cases: [happy, negative]
  acceptance:
    - "Given Chrome/Edge ≥ last 2 versions, Then everything works"
    - "Given Firefox/Safari, Then design, PDF and .plt export work and Conectar is replaced by the banner"
  verifier: e2e
  depends_on: []  blocked_by: []  status: specified

- id: BP-NFR-005
  title: Machine safety
  area: nfr  layer: protocol  surfaces: [core, app]  priority: P0  delta: NEW
  evidence: {tag: INFERRED, source: "commands beyond the media width drive the carriage into the frame or cut the platen"}
  required_cases: [negative, boundary]
  acceptance:
    - "Given any coordinate outside [0, usable width of the current mode] across the roll, Then the driver refuses to emit the job"
    - "Given a sheet profile with mediaLength N and a job longer than N, Then the job is refused; given a roll, a job longer than 2 m needs an explicit confirmation showing its length"
  verifier: unit  verifier_detail: "Driver unit tests + e2e for the confirmation dialog"
  depends_on: [BP-DEV-007]  blocked_by: []  status: specified

- id: BP-LEGAL-001
  title: Behavior-only evidence and nominative use of vendor names
  area: legal  layer: data  surfaces: [core, app]  priority: P1  delta: NEW
  evidence: {tag: OBSERVED, source: "skill rules 8 and 10"}
  required_cases: [negative]
  acceptance:
    - "Given the repo, Then no SignMaster or Foison code, icon, text or asset is present; vendor names appear only in compatibility tables ('funciona com …')"
    - "Given U-01 work, Then evidence comes from vendor docs/support, files SignMaster saves, or bytes on our own port when U-06 allows, recorded in docs/protocol/foison-cam.md with method and date; nothing from decompiling"
  verifier: manual
  depends_on: []  blocked_by: [U-06]  status: blocked
```

## 10. Unknowns and coverage

| ID | Question | What settles it | Blocks |
|---|---|---|---|
| U-01 | How does the software ask the C48 Pro Cam to scan marks and cut in camera mode? (commands, mark-position header, replies on the port, units) | In this order: (1) ask Foison support for the command reference (WhatsApp (21) 99751-5409 / contato@foison.com.br); (2) have SignMaster send a camera job to a file or a virtual COM port and keep that file (exported artifact); (3) only if U-06 allows, log the bytes SignMaster sends on our own port with a serial monitor. Record in docs/protocol/foison-cam.md. Timebox: 2 sessions; then laser fallback or scope cut | BP-ARMS-002, -003, -004 |
| U-02 | How does this unit appear on Windows (COM port via CH340/FTDI, or a vendor USB class)? Serial settings, CTS wiring, XON/XOFF, device buffer size, any status/position query (e.g. HPGL OA/ESC.B) | Device Manager screenshot + SignMaster port settings + the panel's comms menu + the /smoke page sending a 25 mm square; gate G-1 | BP-DEV-001, BP-DEV-002, BP-UX-008 (and transitively BP-DEV-006, BP-UX-010, BP-OSS-004) |
| U-03 | Mark geometry the camera reads: shape, size, distance from edges, minimum gaps, extra marks for long jobs | The SignMaster job from U-01 printed to PDF + photo of the printed sheet with a ruler; Foison manual | BP-ARMS-001, BP-PRINT-001 |
| U-04 | Usable widths (plain and contour), HPGL units/mm, coordinate cap, feed axis and origin, firmware blade offset, does it honour FS/VS (or a vendor equivalent), and does IN; reset panel settings | Panel + manual + cutting a 1000-unit line + a > 1 m job + an FS/VS test | none (profile fields ship editable and flagged [CONFIRMAR]) |
| U-05 | Does the pendrive path accept a .plt or a camera-mode job? | Try a SignMaster-exported job from a USB stick | none (P1 idea) |
| U-06 | Does the SignMaster EULA forbid observing its output or port traffic? | Read the EULA shown at install / in the program folder | BP-LEGAL-001; gates U-01 step 3 |
| U-07 | Which ink is in the Epson's tank conversion (pigment or dye)? | pilot operator | print guide wording only |
| U-08 | Epson SC-T5170 printable margins for roll and cut sheets | Epson user guide / driver | none (5 mm conservative default, flagged) |

**Coverage map.** Inspected: Foison BR store pages (home, C24 Pro Cam, downloads), Teesside
Hackspace wiki (C48 + HPGL + CH340), SignMaster public site and third-party manuals (cutter
scale, contour, ARMS editions), Epson SC-T5170 specs and FAQs, MDN SerialPort.open, three photos
from Ivan. Not inspected: SignMaster V3.5 itself, its EULA, the C48 Pro Cam manual, the
machine's panel menus, the actual bytes on the wire, and a Foison C48 Pro Cam product page (none
found on the BR store on 2026-11-25). Anything SignMaster does that is not listed here is "not
observed", not "absent".

## 11. Readiness verdict

```
Readiness: ready-with-gaps
Obligations: 55 (P0 33, P1 18, P2 4)
P0 obligations: 33 (25 specified, 8 blocked)
  blocked directly: BP-DEV-001, BP-DEV-002, BP-UX-008 (U-02); BP-ARMS-001, BP-PRINT-001 (U-03); BP-ARMS-002 (U-01)
  blocked transitively (hardware verifier): BP-DEV-006, BP-OSS-004
Next evidence needed: gate G-1, a ~1 h session at the machines (U-02, U-03, U-04 together), plus a Foison support reply or a SignMaster output file (U-01)
Build can start now on everything else: core geometry, drivers, simulator, import, UI, demo, CI.
```

## 12. Sources

- Teesside Hackspace wiki, Foison C48 Vinyl Cutter: https://wiki.teessidehackspace.org.uk/Equipment/Foison_C48_Vinyl_Cutter
- Foison BR store: https://loja.foison.com.br/ ; C24 Pro Cam: https://loja.foison.com.br/plotter-de-recorte-profissional-foison-c24-pro-cam-multimark ; downloads: https://loja.foison.com.br/pages/downloads-importantes
- SignMaster editions: https://www.signmaster.software/
- SignMaster manual (cutter scale, contour): https://fcc.report/FCC-ID/2AVGR-CH16/5348643.pdf
- Manual contour cutting with SignMaster: https://cncu.co.za/V-Smart-Vinyl-Cutting-Plotter/
- Epson SC-T5170 media FAQs: https://epson.com/faq/SPT_SCT2170SR~faq-0000a42-sct2170 , https://epson.com/faq/SPT_SCT3170SR~faq-0000a42-sct3170_5170 ; product: https://epson.com/p/SCT5170SR
- Web Serial SerialPort.open options: https://developer.mozilla.org/en-US/docs/Web/API/SerialPort/open
- Clipper2 (BSL-1.0): https://github.com/AngusJohnson/Clipper2 ; vtracer (MIT): https://github.com/visioncortex/vtracer
- Inkcut (GPL, read for ideas only, not reused): https://github.com/inkcut/inkcut
