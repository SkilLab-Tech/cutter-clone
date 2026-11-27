#!/usr/bin/env node
// @ts-check
// BP-UX-007 missing-key check (T-008). Fails (exit 1) when:
//  - a key exists in one locale and not the other (pt-BR is the reference);
//  - a value is empty or not a string;
//  - a literal key used in source, t("a.b") or i18nKey="a.b", is absent from pt-BR;
//  - an en value still contains pt-BR-only characters (ã õ ç á é í ó ú â ê ô à), a cheap
//    signal that a string was copied without translation.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = join(webRoot, "src", "i18n", "locales");
const SRC = join(webRoot, "src");
const REFERENCE = "pt-BR";
const PT_ONLY = /[ãõçáéíóúâêôà]/i;

/**
 * @param {unknown} node
 * @param {string} prefix
 * @param {Map<string, unknown>} out
 */
function flatten(node, prefix, out) {
  if (node !== null && typeof node === "object" && !Array.isArray(node)) {
    for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.set(prefix, node);
  }
  return out;
}

/** @param {string} dir @returns {string[]} */
function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/**
 * @param {string} localesDir
 * @param {string} srcDir
 * @returns {string[]} problems
 */
export function checkI18n(localesDir, srcDir) {
  /** @type {string[]} */
  const problems = [];
  const files = readdirSync(localesDir).filter((f) => f.endsWith(".json"));
  /** @type {Map<string, Map<string, unknown>>} */
  const locales = new Map(
    files.map((f) => [
      f.replace(/\.json$/, ""),
      flatten(JSON.parse(readFileSync(join(localesDir, f), "utf8")), "", new Map()),
    ]),
  );
  const ref = locales.get(REFERENCE);
  if (ref === undefined) return [`reference locale ${REFERENCE}.json not found`];

  for (const [lng, keys] of locales) {
    for (const [key, value] of keys) {
      if (typeof value !== "string" || value.trim() === "") {
        problems.push(`${lng}: "${key}" is empty or not a string`);
      }
      if (lng !== REFERENCE && !ref.has(key)) problems.push(`${lng}: extra key "${key}"`);
      if (lng === "en" && typeof value === "string" && PT_ONLY.test(value)) {
        problems.push(`en: "${key}" looks untranslated: ${JSON.stringify(value)}`);
      }
    }
    if (lng === REFERENCE) continue;
    for (const key of ref.keys()) {
      if (!keys.has(key)) problems.push(`${lng}: missing key "${key}"`);
    }
  }

  const literal = /\bt\(\s*["']([\w.-]+)["']|i18nKey=["']([\w.-]+)["']/g;
  for (const file of sourceFiles(srcDir)) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(literal)) {
      const key = m[1] ?? m[2];
      if (key !== undefined && !ref.has(key)) {
        problems.push(`${relative(srcDir, file)}: key "${key}" not in ${REFERENCE}.json`);
      }
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = checkI18n(LOCALES, SRC);
  if (problems.length > 0) {
    console.error(`i18n check FAILED (${problems.length}):`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log("i18n check passed");
}
