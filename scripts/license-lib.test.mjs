// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCoverage, checkNpm, checkProvenance, evaluateLicense } from "./license-lib.mjs";

test("SPDX: permissive licences pass", () => {
  for (const l of ["MIT", "Apache-2.0", "BSL-1.0", "OFL-1.1", "(MIT OR Apache-2.0)", "ISC"]) {
    assert.equal(evaluateLicense(l).ok, true, l);
  }
});

test("SPDX: GPL family fails, including AND and WITH", () => {
  for (const l of [
    "GPL-3.0-only",
    "GPL-2.0+",
    "AGPL-3.0-or-later",
    "LGPL-2.1",
    "MIT AND GPL-3.0",
    "GPL-2.0 WITH Classpath-exception-2.0",
  ]) {
    assert.equal(evaluateLicense(l).ok, false, l);
  }
});

test("SPDX: dual licence with a permissive branch passes", () => {
  assert.equal(evaluateLicense("(GPL-3.0 OR MIT)").ok, true);
});

test("SPDX: unknown, missing or garbage fails (deny by default)", () => {
  for (const l of [undefined, "", "UNLICENSED", "SEE LICENSE IN LICENSE", "MIT OR", "(MIT"]) {
    assert.equal(evaluateLicense(l).ok, false, String(l));
  }
});

test("npm: a GPL production dependency is a problem", () => {
  const { problems } = checkNpm({
    MIT: [{ name: "ok-pkg", versions: ["1.0.0"], paths: [], license: "MIT" }],
    "GPL-3.0": [{ name: "bad-pkg", versions: ["2.0.0"], paths: [], license: "GPL-3.0" }],
  });
  assert.deepEqual(problems, ["npm bad-pkg@2.0.0: copyleft licence GPL-3.0"]);
});

test("npm: an override needs a reason", () => {
  const { problems } = checkNpm(
    { Unknown: [{ name: "x", versions: ["1.0.0"], paths: [], license: "Unknown" }] },
    { "x@1.0.0": { license: "MIT", reason: "" } },
  );
  assert.deepEqual(problems, ["npm x@1.0.0: override needs a reason"]);
});

function repoWithLicense() {
  const root = mkdtempSync(join(tmpdir(), "lg-"));
  mkdirSync(join(root, "third-party", "licenses"), { recursive: true });
  writeFileSync(join(root, "third-party", "licenses", "x.txt"), "MIT License ...");
  mkdirSync(join(root, "apps", "web", "public"), { recursive: true });
  writeFileSync(join(root, "apps", "web", "public", "x.wasm"), "\0asm");
  return root;
}

const goodEntry = {
  id: "x",
  kind: "wasm",
  files: ["apps/web/public/x.wasm"],
  source: "https://example.invalid/x",
  version: "1.0.0",
  license: "MIT",
  licenseFile: "third-party/licenses/x.txt",
};

test("provenance: a complete WASM entry passes", () => {
  const root = repoWithLicense();
  assert.deepEqual(checkProvenance({ schemaVersion: 1, entries: [goodEntry] }, root), []);
});

test("provenance: a WASM entry without a licence fails", () => {
  const root = repoWithLicense();
  const { license: _omit, ...noLicense } = goodEntry;
  void _omit;
  const problems = checkProvenance({ schemaVersion: 1, entries: [noLicense] }, root);
  assert.deepEqual(problems, ["provenance entry x: missing license"]);
});

test("provenance: missing licence file fails", () => {
  const root = repoWithLicense();
  const problems = checkProvenance(
    { schemaVersion: 1, entries: [{ ...goodEntry, licenseFile: "third-party/licenses/nope.txt" }] },
    root,
  );
  assert.deepEqual(problems, [
    "provenance entry x: licenseFile third-party/licenses/nope.txt not found or empty",
  ]);
});

test("coverage: a shipped WASM file without an entry fails", () => {
  const problems = checkCoverage({ schemaVersion: 1, entries: [] }, ["apps/web/public/x.wasm"], []);
  assert.deepEqual(problems, [
    "apps/web/public/x.wasm: shipped WASM/font file without provenance entry",
  ]);
});

test("coverage: an npm package shipping WASM needs an npmPackage entry", () => {
  const pkgDir = mkdtempSync(join(tmpdir(), "lg-pkg-"));
  writeFileSync(join(pkgDir, "mod.wasm"), "\0asm");
  const problems = checkCoverage(
    { schemaVersion: 1, entries: [] },
    [],
    [{ name: "wasm-pkg", paths: [pkgDir] }],
  );
  assert.deepEqual(problems, ["npm wasm-pkg: ships WASM without a provenance entry (npmPackage)"]);
  const ok = checkCoverage(
    { schemaVersion: 1, entries: [{ ...goodEntry, files: [], npmPackage: "wasm-pkg" }] },
    [],
    [{ name: "wasm-pkg", paths: [pkgDir] }],
  );
  assert.deepEqual(ok, []);
});

test("provenance: an unknown kind fails", () => {
  const root = repoWithLicense();
  const problems = checkProvenance(
    { schemaVersion: 1, entries: [{ ...goodEntry, kind: "js" }] },
    root,
  );
  assert.deepEqual(problems, ['provenance entry x: kind must be "wasm", "font" or "library"']);
});

test("provenance: a GPL crate inside a WASM dependencyList fails", () => {
  const root = repoWithLicense();
  writeFileSync(
    join(root, "third-party", "licenses", "crates.tsv"),
    "image\t0.25.0\tMIT OR Apache-2.0\nevil\t1.0.0\tGPL-3.0-only\n",
  );
  const problems = checkProvenance(
    {
      schemaVersion: 1,
      entries: [{ ...goodEntry, dependencyList: "third-party/licenses/crates.tsv" }],
    },
    root,
  );
  assert.deepEqual(problems, [
    "provenance entry x: linked evil@1.0.0: copyleft licence GPL-3.0-only",
  ]);
});
