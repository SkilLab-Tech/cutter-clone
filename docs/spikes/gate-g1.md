# Gate G-1 library spikes (T-012, T-013) — 2026-11-27

Method: built and run on labs-srv1 (x86-64 server, 80 cores), browser checks in Playwright
1.65.1 Chromium headless shell 159 against the production build (`vite build` + `vite preview`,
strict CSP). Hidden pages: `/smoke/geometria`, `/smoke/vetorizar` (lazy chunks, not in the
navigation; removed when T-018 / T-045 land).

## T-012 Clipper2 — chosen: `clipper2-ts` 2.0.1-19

| Candidate | Licence | Notes | Verdict |
|---|---|---|---|
| clipper2-ts (countertype) | BSL-1.0 (SPDX) | pure TypeScript, zero deps, ESM, updated 2026-11-07 | **chosen** |
| clipper2-js (IRobot1) | "Boost Software License" (not SPDX) | last release 2024-01 | rejected: stale, licence string fails the gate |
| clipper2-wasm (ErikSom) | BSL-1.0 | Emscripten build, extra loader and WASM asset | not needed: pure TS meets the check |

Result: a 25 mm square offset by +2 mm is 29.0000 × 29.0000 mm for miter and round joins
(check ±0.01 mm) in a core unit test and inside a Vite module worker. Clipper ends up only in the
worker chunk. Licence text in `third-party/licenses/clipper2-ts.txt`; provenance entry kind
`library`.

Note: `2.0.1-19` is a semver pre-release tag of upstream Clipper2 2.0.1 (build 19), and the
package's only dist-tag (`latest`). Re-check before T-018.

## T-013 vtracer — browser WASM build works

- The npm package `@visioncortex/vtracer` (1.0.0-alpha.4) ships wasm-bindgen `--target nodejs`
  glue (`require('fs')`), so it does not load in a browser as is.
- `scripts/build-vtracer-wasm.sh` builds the upstream crate `nodejs/` (vtracer-wasm) at commit
  `82fedd1` in `rust:1-bookworm` (rustc 1.100.0) and runs `wasm-bindgen 0.2.130 --target web`.
  Output committed in `apps/web/src/vendor/vtracer/` (865 KB `.wasm`, lazy: loaded only by the
  trace worker) with `BUILD-INFO.txt` and `CRATES.tsv`.
- Licences: vtracer MIT OR Apache-2.0; the 63 crates linked into the wasm are all permissive
  (MIT, Apache-2.0, BSD, Zlib, Unlicense, Unicode-3.0). The licence gate reads `CRATES.tsv`
  (`dependencyList`) and fails on any copyleft crate.
- CSP: the app now allows `'wasm-unsafe-eval'` in `script-src`, which permits WebAssembly
  compilation only; JS `eval` stays blocked.
- Result: a deterministic 2000 × 2000 px (4 MP) black-and-white PNG traced in the worker:
  WASM init 49 ms, trace 2698 ms, total 2786 ms, 62 paths (budget: < 5 s, BLUEPRINT §7).
- Risk: measured on a server CPU. The workshop laptop (i5 class) may be ~2× slower, which is close
  to the budget. T-045 already plans the > 4 MP downscale and the live preview on a downscaled
  image; the one recorded run on the laptop (T-082) decides. No fallback needed now.
