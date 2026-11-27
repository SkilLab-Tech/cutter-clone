# OSS and public-doc research: registration-mark / contour-cut protocols for cutters

Researched 2026-11-26 by Sonnet 5.5 (claude-sonnet-5-5), read-only web research. Confidence tags: VERIFIED (read in the page/doc via fetch), INFERRED (my reasoning or a fetch summary's inference), NOT FOUND.
Caveat: WebFetch returns model-written summaries of pages, not raw text. Treat "exact syntax" lines as strong leads to re-check against the primary source before coding.

## Headline result

No open-source project and no public document was found that shows how HPGL/DMPL-based Chinese cutters (Foison, Teneth, Jinka, Redsail, Vevor, Skycut, Liyu, Secabo, USCutter) are told to scan registration marks with a camera or optical eye. That part is NOT FOUND. The only open, command-level mark protocol found is the Graphtec/Silhouette `TB` family (reverse-engineered from USB captures, in a GPL-2.0 project). For the Foison C48 Pro Cam, the mark/camera step needs Phase 0 evidence from the real machine (serial capture of the vendor software's traffic, taken as black-box observation, plus the vendor's manual).

---

## 1. Open-source projects

### 1.1 inkscape-silhouette (fablabnbg, fork FlyingSamson) - best open protocol reference for marks
- What: Inkscape extension plus Python driver for Graphtec/Silhouette cutters. It supports registration-mark search.
- LICENCE: GPL-2.0 (fork page). READ FOR BEHAVIOR NOTES ONLY, do not copy code.
- Mark protocol (from `Commands.md`, community reverse engineering, VERIFIED as read, though syntax came via a page summary):
  - `TB50,n` orientation (0 portrait, 1 landscape). `TB23,h,w` sets the mark area (distance between marks). `TB51,l` mark arm length. `TB52,n` mark type (0 original/SD, 2 Cameo/Portrait). `TB53,w` stroke width. `TB55,n` meaning unclear. `TB99` use marks. `TB123,h,w,u,l` automatic mark search.
  - Calibration: `TB70` (calibration cross), `TB71` (query, reply seen as `0,4`), `TB72,rv,rh` (offset, permanent). `FB70`, `FBrc,rr`, `FA` for motion scaling.
  - Typical sequence: `TB50,381`, `TB99`, `TB55,1`, then `TB123` (search) or `TB23` with width and height times 20, then query `FQ5`. Three replies means the marks were found.
  - Commands end with `\x03` (Ctrl-C), which the reference omits. The page's format string looks like it is missing a comma (probable typo).
  - Units for `TB23/51/53`: not stated. The x20 multiplier suggests 1/20 mm (INFERRED).
- UI model: user gives X and Y mark distance and offset from document edge; the plotter searches at those positions and uses found marks as origin. X/Y offset fields compensate for the offset between optic and knife (README, VERIFIED).
- Speed/force: `!l` speed (1-10 relative, or 101-160), `FXn` force (1 to roughly 30s, model dependent), `TJa` acceleration, older `*a,f`. No physical units given (VERIFIED as written, gaps stated by the doc).
- Transport: USB (not serial).
- URLs: https://github.com/FlyingSamson/inkscape-silhouette ; https://github.com/fablabnbg/inkscape-silhouette/blob/master/Commands.md
- Relevance to us: shows the shape of a mark workflow (declare geometry, trigger search, query for result count, apply offset). It is Graphtec-specific, not HPGL, so it will not transfer to the Foison.

### 1.2 robocut
- What: C++ Qt app for Silhouette/Craft Robo. Registration mark support in changelog (1.0.3). Uses libusb.
- LICENCE: GPL-3 ("All code is GPL3 licensed"). READ ONLY for behavior.
- Commands: not documented on the page; would need `Plotter.cpp`/`Plotter.h`. Changelog notes int (not float) output to the plotter.
- URL: https://github.com/alpharesearch/robocut
- Confidence: VERIFIED that marks are supported; command detail NOT FOUND (source not read).

### 1.3 Inkcut (codelv/inkcut; older fork ammanvm/inkcut)
- What: Python/Qt app for plotters, cutters, engravers, CNC.
- LICENCE: GPL-3.0. READ ONLY for behavior.
- HPGL protocol file (`inkcut/device/protocols/hpgl.py`, VERIFIED by fetch summary): sends `IN;` at init and finish, `PA x,y;`, `PU;`/`PD;` (or `PU x,y;`/`PD x,y;`), `PR x,y;`, `VS v;` velocity, `FS f;` force, `SP p;` pen. Option `pad` appends `\n` to every command. Option `separate_z_moves` splits pen state from move.
- Units: coordinates times `scale` (default `1021/INKCUT_DPI`), truncated with `int()` (not rounded). Effective unit not confirmed (the 1021 vs 1016 difference is unexplained; INFERRED to be a plotter-unit approximation).
- Force/speed: values pass through with no range check or conversion; caller must match device.
- Registration marks: NOT supported (no mark logic in the protocol file; README feature list does not mention marks).
- Serial flow control / baud: not on the pages read. Docs live at codelv.com (device setup), NOT READ.
- URLs: https://github.com/codelv/inkcut ; https://github.com/codelv/inkcut/blob/master/inkcut/device/protocols/hpgl.py
- Note from a user wiki: a LIYU SC-631AM (DMPL/HPGL, serial or USB) needed newlines added to HPGL saved from Inkscape before sending. Source: https://wiki.london.hackspace.org.uk/view/Vinylcutter (VERIFIED).

### 1.4 Others looked at
- its-mimaki (IT-Syndikat): PHP scripts that push HPGL to a Mimaki cutter; GPL-3.0; no marks, no command docs. https://github.com/IT-Syndikat/its-mimaki (VERIFIED)
- plottool (comawill fork of DooMMasteR/plottool): Python (pyserial, wxPython) HPGL sender tested on Cogi CT-630; splits files into blocks of 10 kB or less so the plotter's buffer is not overrun; licence not stated. https://github.com/comawill/plottool (VERIFIED, licence NOT FOUND)
- plottr.js (mgs): Meteor/JS HPGL/vinyl cutter library with `bufferedSerialWrite`; server-side serial, not Web Serial; licence not stated. https://github.com/mgs/plottr.js
- djipco/hpgl (Node.js HPGL library), hpplot, hpglope, samverstraete/plotr appeared in search; not read.
- gerber2graphtec: not located in searches (NOT READ).
- Searches for GitHub code implementing "ARMS", "AAS", "optical eye" or "camera contour" for Teneth/Jinka/Redsail/Liyu/Skycut/Foison/Secabo/USCutter/Bascocut/LaserPoint: NOT FOUND.

---

## 2. Public documentation: HPGL/DMPL and vendor extensions

- Base HPGL units: 1 plotter unit = 0.025 mm; 40 units = 1 mm; 1016 units = 1 inch (HP-GL reference, VERIFIED). Source: https://ftp.icm.edu.pl/packages/lprng/RESOURCES/HP/HPLanguages.pdf
- Output instructions that exist in standard HP-GL: `OE;` (error), `OH;` (hard-clip limits), `OI;` (identification), `OP;` (P1/P2), `OS;` (status). Output instructions must end with a semicolon (VERIFIED). OA, OC, OW and the `ESC.B/.E/.O/.@/.M/.N` device-control sequences did not appear in the portion read: NOT FOUND in that excerpt. From general HP-GL knowledge, `ESC.B` is output buffer space and `ESC.E` extended error, but this is INFERRED, not confirmed here.
- Probing example: a user script sends `OH;` and treats no reply as "plotter not ready"; the cutter returned limits in 0.025 mm units (`0,0,20000,20000` = 500 x 500 mm). Cutter replied inconsistently to other probes. https://discourse.mcneel.com/t/hpgl-vinyl-cutter-plotter-control-via-serial-port/126918 (anecdotal, VERIFIED as written)
- Graphtec CE7000 user manual (public PDF): ARMS is chapter 5 (mark shape and origin point, scan range, MARK SCAN mode, mark sensor test, scan position adjustment, automatic detection, scan speed), manual adjust with 2, 3, or 4 points in chapter 6. Command mode selectable GP-GL, HP-GL, or auto. `OI` returns 7550 or 7586 depending on emulation. GP-GL step size selectable 0.100/0.050/0.025/0.010 mm. The wire-level ARMS commands are not in the text I could read (document truncated in fetch at about 300k of 356k characters). https://cdn.shopify.com/s/files/1/0224/5205/files/Graphtec_CE7000_User_Manual.pdf (VERIFIED for the items listed; wire commands NOT FOUND)
- GCC AAS Users Guide: user-level only. Notes an HPGL "command mode" setting, 3 mm solid square/circle marks, four marks for graphics under 10 cm in Y and five for larger, manual offset in 0.0125 mm steps. No command syntax. https://www.gccworld.com/data/download/file/232001980G(03)_AAS Users Guide.pdf (VERIFIED)
- Caldera "Generic HPGL custom options": a RIP can emit marks as ordinary HPGL drawing: `PU; PA @(X),@(Y); CI120;` (circle marks), default resolution 1016 dpi, 0.025 mm per unit, tool select `SPn`. This is print-side mark drawing, not a cutter scan command. https://helpdesk.caldera.com/hc/en-us/articles/360007054358-Generic-HPGL-Custom-options-tab (VERIFIED)
- Summa OPOS: the public OPOS PDF and manual page read contain no wire-level commands (summa.com opos20_en.pdf; manualslib S Class page 91). Summa says it supports marks "used by other cutting solution providers". Wire protocol NOT FOUND. A Summa Cutter Tools PDF (https://www.summa.com/media/adbnhtki/sct_en.pdf) and the S Class "Communication/Emulation Language" pages 92-93 were not read; worth a look.
- Roland CAMM-GL III manuals (downloadcenter.rolanddg.com, e.g. CAMM-GL2_PRO_EN_R1.pdf) and Mimaki manuals surfaced in search but were not read for mark commands. Coordinate limit / 16-bit overflow documentation: NOT FOUND. Graphtec docs show step-size choices only. INFERRED risk: a 16-bit signed controller at 40 units/mm would top out near 819 mm, so long jobs may need relative moves or segmenting; must be tested on the C48.

---

## 3. Web Serial and plotters

- No browser app that drives an HPGL cutter via Web Serial was found. NOT FOUND. Searches returned Web Serial data plotters (graphs), not machine plotters.
- saxi (AxiDraw): serial is made by a Node server, browser talks HTTP, so it is not Web Serial proof. https://github.com/lpkr-c/saxi (VERIFIED, licence not shown on the fork page)
- Plotser (Vaadin): Web Serial demo for live data graphs, Chrome 80+. Notes: junk bytes appear right after opening, baud must be selected, PWA install crashed on opening a port (cause unknown), port picker lists cu and tty variants on macOS. https://labs-blog.vaadin.com/serial-api (VERIFIED)
- Chrome Web Serial doc (VERIFIED): `flowControl` is `"none"` or `"hardware"`; `bufferSize` must be under 16 MB; filters need `usbVendorId` (productId optional); `setSignals()` can toggle DTR/RTS/break (DTR can reset Arduino-type boards); must `releaseLock()` writers before close; some USB serial emulators ignore baud. CH340/FTDI are not mentioned. https://developer.chrome.com/docs/capabilities/serial.md.txt
- Firefox 151 desktop added Web Serial (May 2026), per-site per-port permission; disabled by default under Enterprise Policy. CH340/FTDI not mentioned. https://hacks.mozilla.org/2026/05/web-serial-support-in-firefox/ (VERIFIED)
- CH340/FTDI-specific Web Serial gotchas: NOT FOUND in sources read. INFERRED: both appear as OS serial ports and work from Chrome when the OS driver is present (Windows may need the CH340 driver); must be tested on the target machine.
- Practical gotchas collected for cutters: use small blocks (plottool uses 10 kB or less) or flow control; add `\n` after commands for some units (Liyu wiki); a USB-serial adapter may need a null-modem on RS-232 cutters (Rhino thread: FTDI plus null modem, 9600 8N1, RTS/CTS unverified); a cutter may show "Cutting" for any received characters.

---

## 4. Licences: vtracer and Clipper2 ports

| Item | Licence | Browser status | Confidence | URL |
|---|---|---|---|---|
| visioncortex/vtracer (repo) | MIT | `@visioncortex/vtracer` npm is a WASM build in the `nodejs` folder (1.0.0-alpha.4, no native dependency, decodes PNG/JPEG/GIF/BMP/WebP); a `webapp` folder exists but its contents were not described. Explicit browser-targeted npm build: not confirmed | VERIFIED (licence), INFERRED (browser use: WASM should run in browsers, bundler needed) | https://github.com/visioncortex/vtracer |
| visioncortex/visioncortex (core Rust lib) | Apache-2.0 or MIT (dual) | WASM target not stated on page | VERIFIED | https://github.com/visioncortex/visioncortex |
| vtracer-webapp (crate listing) | "MIT/Apache" per lib.rs | Browser app built with wasm-pack, runs on localhost:8080 | VERIFIED (listing), relation not explained | https://lib.rs/crates/vtracer-webapp |
| vectortracer (alanscodelog, 3rd party WASM wrapper) | not stated in README | Takes canvas `ImageData`, worker-compatible; binary images only (colour converter not done) | NOT FOUND (licence) | https://cdn.jsdelivr.net/npm/vectortracer@0.1.2/README.md |
| clipper2-js (npm, IRobot1 port) | Boost Software License (npm page) | Pure TS/JS; integer coordinates, scale up before clipping; some polygon tests fail per README | VERIFIED (npm page says BSL; README itself silent) | https://npmjs.com/package/clipper2-js ; https://cdn.jsdelivr.net/npm/clipper2-js@1.2.4/README.md |
| clipper2-ts (Jeremy Tribby; GitHub countertype/clipper2-ts) | Boost Software License 1.0 | Pure TS; uses Number (coordinates under 2^53), BigInt for some math; 258 tests vs Clipper2 reference; slower than WASM, faster than Clipper1 ports; npm names seen: `clipper2-ts` and `@countertype/clipper2-ts` | VERIFIED | https://github.com/countertype/clipper2-ts |
| Clipper2-WASM (ErikSom) | BSL-1.0 | WASM, ES6 and UMD builds, v0.4.0 on jsDelivr; upstream submodule pinned at commit 642390d (version not stated) | VERIFIED | https://github.com/eriksom/Clipper2-WASM |

Licence-gate notes: all of the above are permissive (MIT, Apache-2.0, BSL-1.0), so none conflicts with the "no GPL/AGPL/LGPL in the bundle" rule. Confirm each LICENSE file and transitive Rust crates (via `cargo deny` or equivalent) at the gate; vectortracer needs a licence check before use. BSL-1.0 requires keeping the notice only for source distribution, not for binary.

---

## Gaps and suggested next steps
1. Capture-based evidence on the Foison C48 Pro Cam (Phase 0): log serial traffic from the machine during mark scan using a black-box serial monitor on the user's own hardware and software; do not decompile.
2. Read Graphtec CE7000 manual chapter 11 and appendix (beyond char 300000) and the Graphtec "Command Reference" if a public copy exists; read Summa S Class manual pages 92-93; read Roland CAMM-GL III manual for any mark-related instructions.
3. Read the inkscape-silhouette `silhouette/Graphtec.py` for flow (GPL: behavior notes only).
4. Read codelv.com Inkcut "Device setup" for serial/flow control defaults.
5. Test CH340 and FTDI from Chrome on the target OS; record baud, flow control, and chunk size in `docs/protocol/` with method and date.

## Blocked or unread URLs
- raw.githubusercontent.com Commands.md (permission request unanswered); same content read via the github.com blob page instead.
- manualzilla CE5000 page 59 (failed at the site).
- Not fetched at all: djipco/hpgl, hpplot, hpglope, samverstraete/plotr, Roland and Mimaki manuals, Summa Cutter Tools PDF, codelv.com docs, scribd documents.
