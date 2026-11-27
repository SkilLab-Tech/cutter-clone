#!/usr/bin/env node
// @ts-check
// BP-OSS-001 license gate. Fails (exit 1) on:
//  - a production npm dependency whose licence is GPL/AGPL/LGPL or outside the allowlist;
//  - a WASM/font provenance entry missing source, version, licence or licence file;
//  - a shipped .wasm/.woff/.woff2/.ttf/.otf file, or a prod npm package with WASM, not covered
//    by third-party/provenance.json.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkCoverage,
  checkNpm,
  checkProvenance,
  findProvenanceFiles,
  readJson,
} from "./license-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROVENANCE = join(root, "third-party", "provenance.json");
const OVERRIDES = join(root, "third-party", "license-overrides.json");
/** Source folders whose files end up in the bundle. */
const SHIPPED_DIRS = ["apps/web/public", "apps/web/src", "packages/core/src"];

/** @returns {import("./license-lib.mjs").PnpmLicenses} */
function pnpmLicenses() {
  const out = execFileSync("pnpm", ["-r", "licenses", "list", "--prod", "--json"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const trimmed = out.trim();
  return trimmed === ""
    ? {}
    : /** @type {import("./license-lib.mjs").PnpmLicenses} */ (JSON.parse(trimmed));
}

function main() {
  const overrides = existsSync(OVERRIDES)
    ? /** @type {Record<string, import("./license-lib.mjs").Override>} */ (readJson(OVERRIDES))
    : {};
  const provenance = existsSync(PROVENANCE)
    ? /** @type {import("./license-lib.mjs").Provenance} */ (readJson(PROVENANCE))
    : { schemaVersion: 1, entries: [] };

  const npm = checkNpm(pnpmLicenses(), overrides);
  const shipped = SHIPPED_DIRS.flatMap((d) => findProvenanceFiles(join(root, d), root));
  const problems = [
    ...npm.problems,
    ...checkProvenance(provenance, root),
    ...checkCoverage(provenance, shipped, npm.packages),
  ];

  console.log(
    `license gate: ${npm.packages.length} production npm package versions, ` +
      `${(provenance.entries ?? []).length} provenance entries, ${shipped.length} shipped WASM/font files`,
  );
  for (const p of npm.packages) console.log(`  ${p.license.padEnd(14)} ${p.name}@${p.version}`);
  if (problems.length > 0) {
    console.error(`\nlicense gate FAILED (${problems.length}):`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log("license gate passed");
}

main();
