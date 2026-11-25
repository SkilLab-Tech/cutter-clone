# cutter-clone

## Estado atual
- Projeto: cutter-clone (nome provisório). App open source, no navegador, para operar plotters de recorte. A Foison C48 Pro Cam é a primeira suportada. Faz letreiro em vinil e adesivo impresso e recortado (print-and-cut com marcas lidas pela câmera), pensado para leigos. PWA + Web Serial, sem backend.
- Blueprint: docs/blueprint/BLUEPRINT.md, aprovado em 2026-11-25. Readiness: ready-with-gaps.
- PRD: none
- Specs: specs/constitution.md, specs/spec.md, specs/plan.md, specs/tasks.md
- Fase atual: Phase 0 (evidência de hardware, humana, no espaço parceiro) e Phase 1 (skeleton) em paralelo.
- Próximo passo: T-001..T-005 (workspace pnpm, Vitest, shell Vite+React, Playwright, CI). Depois disso, o gate G-1 (T-009..T-013), antes da Phase 2.
- Gaps abertos:
  - P0 bloqueadas: BP-DEV-001, BP-DEV-002, BP-UX-008 (U-02); BP-ARMS-001, BP-PRINT-001 (U-03); BP-ARMS-002 (U-01); BP-DEV-006, BP-OSS-004 (transitivas).
  - Incógnitas: U-01..U-08 (BLUEPRINT §10).
- Decisões:
  - Ivan aprovou o repo privado em 2026-11-25.
  - Tornar público é ação travada: precisa do go do Ivan.
  - Defaults: MIT, monorepo pnpm (packages/core + apps/web), Vite+React, Cloudflare Pages.

## Regras
- O escopo é o ledger em docs/blueprint/BLUEPRINT.md §9. Nada fora dele.
- Uma tarefa "(sim part)" nunca marca uma obrigação como verified. Obrigações que dependem do hardware fecham só na tarefa da Phase 7.
- Behavior-only: nenhum código, asset, ícone ou texto do SignMaster ou de qualquer fabricante. Nome de fabricante só em tabela de compatibilidade.
- Nenhuma dependência GPL/AGPL/LGPL no bundle. O gate de licença cobre npm, WASM e fontes.
- Evidência de protocolo vai em docs/protocol/, com método e data.
