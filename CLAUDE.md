# cutter-clone

## Estado atual
- Projeto: cutter-clone (nome provisório). App open source, no navegador, para operar plotters de recorte. A Foison C48 Pro Cam é a primeira suportada. Faz letreiro em vinil e adesivo impresso e recortado (print-and-cut com marcas lidas pela câmera), pensado para leigos. PWA + Web Serial, sem backend.
- Blueprint: docs/blueprint/BLUEPRINT.md, aprovado em 2026-11-25. Readiness: ready-with-gaps.
- PRD: none
- Specs: specs/constitution.md, specs/spec.md, specs/plan.md, specs/tasks.md
- Fase atual: Phase 1 feita (T-001..T-008); Phase 1b sem a máquina feita (T-009, T-010, T-012, T-013). PRs empilhados no repo público: #1 (Phase 1) ← #2 (T-009/T-010) ← #3 (spikes).
- Próximo passo: no espaço parceiro, H-01..H-08 e T-011 com apps/web/public/smoke.html (instruções em docs/protocol/README.md). Phase 2 só depois do gate G-1 (T-011).
- Gate de PR: o ruleset da main exige o CheckRun `labs-gate` (runner próprio, app skillab-ci-runner, runner pcdell; config em SkilLab-Tech/labs-cockpit `config/labs-gate.json`). O GitHub Actions não cria run nesta conta (billing): o ci.yml fica, mas não é o gate. O e2e (Playwright) não roda no labs-gate; roda no CI local, num container mcr.microsoft.com/playwright:v1.65.1-noble a partir de um clone limpo (o host não tem as libs do Chromium).
- Deploy: Cloudflare Pages por wrangler (direct upload de apps/web/dist). O job de deploy do ci.yml só roda quando o Actions voltar.
- Commits de agente saem como "labs-srv1 agent <labs@labs-srv1.local>" (o host não tem identidade git).
- Gaps abertos:
  - P0 bloqueadas: BP-DEV-001, BP-DEV-002, BP-UX-008 (U-02); BP-ARMS-001, BP-PRINT-001 (U-03); BP-ARMS-002 (U-01); BP-DEV-006, BP-OSS-004 (transitivas).
  - Incógnitas: U-01..U-08 (BLUEPRINT §10).
- Decisões:
  - 2026-11-27: repo PÚBLICO (go do Ivan). O histórico foi anonimizado antes; o repo privado original, com o histórico antigo e os PRs antigos, é SkilLab-Tech/cutter-clone-archive (privado, não publicar).
  - Defaults: MIT, monorepo pnpm (packages/core + apps/web), Vite+React, Cloudflare Pages.
  - 2026-11-27: TS 6.0.3 (limite do typescript-eslint), Vite 8.3.8 (8.4.0 é novo demais para o release-age do pnpm), react-router 8, i18next 27.
  - 2026-11-27: Clipper2 = clipper2-ts 2.0.1-19 (BSL-1.0); vtracer = build web próprio via scripts/build-vtracer-wasm.sh (commit 82fedd1). CSP com 'wasm-unsafe-eval'.
  - 2026-11-27: Web Serial funciona em file:// no Chromium (docs/protocol/README.md). Padrão do smoke: 38400 8N1, sem controle de fluxo.

## Regras
- O escopo é o ledger em docs/blueprint/BLUEPRINT.md §9. Nada fora dele.
- Uma tarefa "(sim part)" nunca marca uma obrigação como verified. Obrigações que dependem do hardware fecham só na tarefa da Phase 7.
- Behavior-only: nenhum código, asset, ícone ou texto do SignMaster ou de qualquer fabricante. Nome de fabricante só em tabela de compatibilidade.
- Nenhuma dependência GPL/AGPL/LGPL no bundle. O gate de licença cobre npm, WASM e fontes.
- Evidência de protocolo vai em docs/protocol/, com método e data.
- O repo é público: nenhum nome de pessoa de fora do projeto, local parceiro, contato privado, CNPJ/CPF ou detalhe de acordo entra em arquivo, commit ou PR. Use papéis ("operador piloto", "espaço parceiro"). Contato comercial público de fabricante pode, com fonte.
