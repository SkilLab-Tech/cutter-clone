// @ts-check
// License gate logic (BP-OSS-001). Pure functions; the CLI lives in license-gate.mjs.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Licences allowed in the shipped bundle. Deny by default: anything not listed fails and must be
 * reviewed. GPL/AGPL/LGPL are never allowed (constitution: no copyleft in the bundle).
 */
export const ALLOWED = new Set([
  "0BSD",
  "Apache-2.0",
  "BlueOak-1.0.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BSL-1.0",
  "CC-BY-4.0",
  "CC0-1.0",
  "ISC",
  "MIT",
  "MIT-0",
  "OFL-1.1",
  "Python-2.0",
  "Unicode-3.0", // OSI-approved permissive (unicode-ident and similar Rust crates)
  "Unlicense",
  "Zlib",
]);

const COPYLEFT = /^(A|L)?GPL/i;

/** File extensions that need a provenance entry when shipped. */
export const PROVENANCE_EXTENSIONS = [".wasm", ".woff", ".woff2", ".ttf", ".otf"];

/**
 * @typedef {{ ok: true } | { ok: false, reason: string }} Verdict
 */

/**
 * Evaluates an SPDX licence expression. OR passes if any branch passes; AND needs all.
 * `X WITH exception` is judged by X. Unknown or unparsable expressions fail.
 * @param {unknown} expr
 * @returns {Verdict}
 */
export function evaluateLicense(expr) {
  if (typeof expr !== "string" || expr.trim() === "") {
    return { ok: false, reason: "missing licence" };
  }
  const tokens = expr.replace(/\(/g, " ( ").replace(/\)/g, " ) ").trim().split(/\s+/);
  let pos = 0;

  /** @returns {Verdict} */
  function parseOr() {
    let left = parseAnd();
    while (tokens[pos]?.toUpperCase() === "OR") {
      pos++;
      const right = parseAnd();
      left = left.ok ? left : right;
    }
    return left;
  }
  /** @returns {Verdict} */
  function parseAnd() {
    let left = parseAtom();
    while (tokens[pos]?.toUpperCase() === "AND") {
      pos++;
      const right = parseAtom();
      left = left.ok ? right : left;
    }
    return left;
  }
  /** @returns {Verdict} */
  function parseAtom() {
    const tok = tokens[pos++];
    if (tok === undefined) throw new Error("unexpected end");
    if (tok === "(") {
      const v = parseOr();
      if (tokens[pos++] !== ")") throw new Error("missing )");
      return v;
    }
    if (tokens[pos]?.toUpperCase() === "WITH") pos += 2;
    const id = tok.replace(/\+$/, "");
    if (COPYLEFT.test(id)) return { ok: false, reason: `copyleft licence ${tok}` };
    if (ALLOWED.has(id)) return { ok: true };
    return { ok: false, reason: `licence ${tok} is not in the allowlist` };
  }

  try {
    const v = parseOr();
    if (pos !== tokens.length) return { ok: false, reason: `unparsable licence "${expr}"` };
    return v;
  } catch {
    return { ok: false, reason: `unparsable licence "${expr}"` };
  }
}

/**
 * @typedef {{ name: string, versions: string[], paths: string[], license: string }} NpmPackage
 * @typedef {Record<string, NpmPackage[]>} PnpmLicenses  output of `pnpm -r licenses list --prod --json`
 * @typedef {{ license: string, reason: string }} Override
 */

/**
 * @param {PnpmLicenses} report
 * @param {Record<string, Override>} overrides keyed by "name@version"
 * @returns {{ packages: { name: string, version: string, license: string, paths: string[] }[], problems: string[] }}
 */
export function checkNpm(report, overrides = {}) {
  /** @type {{ name: string, version: string, license: string, paths: string[] }[]} */
  const packages = [];
  /** @type {string[]} */
  const problems = [];
  for (const [groupLicense, list] of Object.entries(report)) {
    for (const pkg of list) {
      for (const version of pkg.versions) {
        const key = `${pkg.name}@${version}`;
        const override = overrides[key];
        const license = override ? override.license : (pkg.license ?? groupLicense);
        if (override && (!override.reason || override.reason.trim() === "")) {
          problems.push(`npm ${key}: override needs a reason`);
        }
        const verdict = evaluateLicense(license);
        if (!verdict.ok) problems.push(`npm ${key}: ${verdict.reason}`);
        packages.push({ name: pkg.name, version, license, paths: pkg.paths });
      }
    }
  }
  return { packages, problems };
}

/**
 * @typedef {{
 *   id?: string, kind?: string, files?: string[], npmPackage?: string,
 *   source?: string, version?: string, license?: string, licenseFile?: string,
 *   dependencyList?: string
 * }} ProvenanceEntry
 * @typedef {{ schemaVersion?: number, entries?: ProvenanceEntry[] }} Provenance
 */

/**
 * Validates provenance entries for WASM modules, fonts and key libraries (kind "library":
 * an npm dependency whose licence text we keep, e.g. the Clipper2 port chosen in T-012).
 * @param {Provenance} provenance
 * @param {string} root repo root, to resolve licenseFile and files
 * @returns {string[]} problems
 */
export function checkProvenance(provenance, root) {
  /** @type {string[]} */
  const problems = [];
  if (provenance.schemaVersion !== 1) problems.push("provenance: schemaVersion must be 1");
  const entries = provenance.entries ?? [];
  entries.forEach((e, i) => {
    const label = `provenance entry ${e.id ?? `#${i}`}`;
    for (const field of /** @type {const} */ ([
      "id",
      "kind",
      "source",
      "version",
      "license",
      "licenseFile",
    ])) {
      const value = e[field];
      if (typeof value !== "string" || value.trim() === "")
        problems.push(`${label}: missing ${field}`);
    }
    if (e.kind !== undefined && !["wasm", "font", "library"].includes(e.kind)) {
      problems.push(`${label}: kind must be "wasm", "font" or "library"`);
    }
    if ((e.files ?? []).length === 0 && !e.npmPackage) {
      problems.push(`${label}: needs files[] or npmPackage`);
    }
    if (e.license !== undefined) {
      const verdict = evaluateLicense(e.license);
      if (!verdict.ok) problems.push(`${label}: ${verdict.reason}`);
    }
    if (typeof e.licenseFile === "string" && e.licenseFile !== "") {
      const p = join(root, e.licenseFile);
      if (!existsSync(p) || statSync(p).size === 0) {
        problems.push(`${label}: licenseFile ${e.licenseFile} not found or empty`);
      }
    }
    for (const f of e.files ?? []) {
      if (!existsSync(join(root, f))) problems.push(`${label}: file ${f} not found`);
    }
    // Optional TSV (name<TAB>version<TAB>licence) of everything linked into a WASM binary,
    // e.g. the Rust crates of vtracer. Every licence must pass the same rules as npm.
    if (typeof e.dependencyList === "string") {
      const p = join(root, e.dependencyList);
      if (!existsSync(p)) {
        problems.push(`${label}: dependencyList ${e.dependencyList} not found`);
      } else {
        const lines = readFileSync(p, "utf8")
          .split("\n")
          .filter((l) => l.trim() !== "");
        if (lines.length === 0)
          problems.push(`${label}: dependencyList ${e.dependencyList} is empty`);
        for (const line of lines) {
          const [name, version, license] = line.split("\t");
          // Cargo's legacy "MIT/Apache-2.0" means "MIT OR Apache-2.0".
          const spdx = license === "(none)" ? undefined : license?.replace(/\//g, " OR ");
          const verdict = evaluateLicense(spdx);
          if (!verdict.ok) problems.push(`${label}: linked ${name}@${version}: ${verdict.reason}`);
        }
      }
    }
  });
  return problems;
}

/**
 * Lists files under `dir` (recursively) whose extension needs provenance.
 * @param {string} dir absolute
 * @param {string} root for relative output
 * @returns {string[]} repo-relative POSIX paths
 */
export function findProvenanceFiles(dir, root) {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...findProvenanceFiles(p, root));
    } else if (PROVENANCE_EXTENSIONS.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
      out.push(relative(root, p).split(sep).join("/"));
    }
  }
  return out;
}

/**
 * Every shipped WASM/font file and every prod npm package that contains WASM must be covered.
 * @param {Provenance} provenance
 * @param {string[]} shippedFiles repo-relative
 * @param {{ name: string, paths: string[] }[]} npmPackages
 * @returns {string[]} problems
 */
export function checkCoverage(provenance, shippedFiles, npmPackages) {
  /** @type {string[]} */
  const problems = [];
  const entries = provenance.entries ?? [];
  const coveredFiles = new Set(entries.flatMap((e) => e.files ?? []));
  const coveredPkgs = new Set(entries.map((e) => e.npmPackage).filter(Boolean));
  for (const f of shippedFiles) {
    if (!coveredFiles.has(f))
      problems.push(`${f}: shipped WASM/font file without provenance entry`);
  }
  for (const pkg of npmPackages) {
    const hasWasm = pkg.paths.some((p) =>
      findProvenanceFiles(p, p).some((f) => f.endsWith(".wasm")),
    );
    if (hasWasm && !coveredPkgs.has(pkg.name)) {
      problems.push(`npm ${pkg.name}: ships WASM without a provenance entry (npmPackage)`);
    }
  }
  return problems;
}

/**
 * @param {string} path
 * @returns {unknown}
 */
export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
