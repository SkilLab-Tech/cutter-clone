# Constitution — cutter-clone

## Principles
1. The obligation ledger in docs/blueprint/BLUEPRINT.md §9 is the scope. No unlisted features.
2. A task is done when the verifier named on its obligations passes, not when code compiles.
3. TypeScript strict, no `any`; errors handled at boundaries with typed errors; no secrets in code or logs.
4. Accessibility WCAG 2.2 AA; every screen has empty / loading / error states.
5. Geometry is computed in millimetres (float64). Only a driver converts to device units.
6. Nothing leaves the user's machine: no backend, no analytics, no remote code (BP-NFR-003).
7. The machine is physical: a driver never emits a coordinate outside the profile's limits (BP-NFR-005). In-flight data is always capped and paced, so a cancel lifts the knife within a known bound. When the port is lost the app cannot lift the knife, and the UI says so plainly (BP-DEV-002). Progress means "sent", never "cut".
11. Tasks marked "(sim part)" never mark an obligation verified. Hardware-dependent obligations close only in their Phase 7 task.
8. Plain pt-BR in the default UI; technical terms live only in "Avançado" (BP-UX-002).
9. Behavior-only: no code, assets, icons or text from SignMaster or any vendor; vendor names only in compatibility tables (BP-LEGAL-001). Protocol evidence is recorded in docs/protocol/ with method and date.
10. Every bug in geometry or drivers gets a regression fixture before the fix.

## Stack
Deviation from the house web default (Next.js + Workers), stated: there is no server. The app is
a static, offline-first PWA, so Vite + React is used; Cloudflare Pages only hosts static files.

- Monorepo: pnpm workspaces. `packages/core` (pure TS, no DOM: geometry, import, drivers, simulator), `apps/web` (Vite + React + TS strict).
- State: Zustand. Persistence: IndexedDB via Dexie.
- Geometry: Clipper2 (Boost licence) for offsets/booleans; own code for blade offset, ordering, transforms.
- Import: own SVG parser on top of a permissive path parser; pdf.js (Apache-2.0) for PDF; vtracer (MIT) compiled to WASM for bitmaps [VERIFY package at T-040]; opentype.js (MIT) for fonts.
- Export: pdf-lib (MIT) for print PDFs.
- Device: Web Serial API behind a `Transport` interface; `SimulatorTransport` for demo/tests.
- UI: Phosphor icons; i18next (pt-BR default, en).
- Tests: Vitest + fast-check (core), Playwright + axe-core (web), golden HPGL fixtures.
- Hosting: Cloudflare Pages free tier — R$ 0/month. No paid tier planned.
- Licence: MIT. CI blocks GPL/AGPL/LGPL in the shipped bundle (BP-OSS-001). Inkcut and potrace are GPL: read for ideas only, never vendored.

## Delivery
- One worktree per feature; PRs carry THE-NNN when an issue exists. Merge needs the `labs-gate` CheckRun green (ruleset on main).
- Until a public release, main deploys straight to Pages (no external users, no staging).
- Repo public since 2026-11-27 (Ivan's go). No names of people outside the project, partner locations, private contacts or agreement details in files, commits or PRs: use roles.
- Hardware-dependent obligations (U-01..U-03) are built behind the `Driver` interface and closed only with a real-machine check at the partner workshop.

## LGPD
Own-use open-source tool; no personal data is processed by us. Artwork files stay in the user's
browser. If telemetry or a server is ever proposed, it goes back to the blueprint first.
