# Third-party provenance (BP-OSS-001)

`scripts/license-gate.mjs` runs in CI (`pnpm license-gate`) and fails the build when:

- a production npm dependency has a GPL, AGPL or LGPL licence, or any licence outside the
  allowlist in `scripts/license-lib.mjs` (deny by default);
- a shipped `.wasm`, `.woff`, `.woff2`, `.ttf` or `.otf` file under `apps/web/public`,
  `apps/web/src` or `packages/core/src` has no entry in `provenance.json`;
- a production npm package that contains `.wasm` has no entry with `npmPackage`;
- an entry is missing `id`, `kind`, `source`, `version`, `license` or `licenseFile`, or the
  licence file is missing.

## provenance.json entry

```json
{
  "id": "clipper2-wasm",
  "kind": "wasm",
  "files": ["apps/web/public/wasm/clipper2.wasm"],
  "npmPackage": "optional-npm-name-when-the-wasm-comes-from-npm",
  "source": "https://github.com/<owner>/<repo>",
  "version": "1.2.3",
  "license": "BSL-1.0",
  "licenseFile": "third-party/licenses/clipper2-wasm.txt"
}
```

Copy the upstream licence text verbatim into `third-party/licenses/`.

## license-overrides.json (optional)

For an npm package whose `license` field is missing or wrong upstream. Keyed by
`name@version`: `{ "license": "MIT", "reason": "LICENSE file in the tarball is MIT; package.json omits the field" }`.
A reason is mandatory.
