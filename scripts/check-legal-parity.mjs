// Offline checks for the legal pages. Run: node scripts/check-legal-parity.mjs [ref] [--expect=path1,path2,...]
//  1. English diff: app/legal-content/<page>.en.ts is compared string by string with
//     the same file at git ref (default origin/main). Every removed and added sentence
//     is printed. With --expect, the set of changed paths (page:path) must match exactly.
//  2. Block counts: the change in blocks per section (paragraphs + lists) vs the ref
//     must be identical in English and Greek.
//  3. Greek parity: <page>.el.ts must match <page>.en.ts in sections, paragraphs,
//     list items, link/URL count and destinations, and per section must contain the
//     same numbers, emails, URLs, identifiers and service names.
import fs from "fs";
import { execSync } from "child_process";
import { loadContent, parseContent } from "./legal-extract.mjs";

const args = process.argv.slice(2);
const expectArg = args.find((a) => a.startsWith("--expect="));
const ref = args.find((a) => !a.startsWith("--")) || "origin/main";
const pages = ["privacy", "terms", "cookies"];
const NAMES = ["Vercel", "Supabase", "Resend", "Anthropic", "SoundCloud", "Spotify", "OpenStreetMap", "Nominatim", "Unsplash", "Contabo", "Google Maps", "Nightup Radio", "Nightup.gr", "Dimitrios Kantanoleon", "EU-US Data Privacy Framework"];
let failures = 0;
const fail = (m) => { failures++; console.log("  FAIL " + m); };

function flat(c) {
  const out = [["eyebrow", c.eyebrow], ["title", c.title], ["updated", c.updated]];
  c.sections.forEach((s, i) => {
    out.push([`sections[${i}].title`, s.title]);
    s.blocks.forEach((b, j) => {
      if (Array.isArray(b)) b.forEach((it, k) => out.push([`sections[${i}].blocks[${j}][${k}]`, it]));
      else out.push([`sections[${i}].blocks[${j}]`, b]);
    });
  });
  return out;
}

function loadAtRef(page, lang) {
  const src = execSync(`git show ${ref}:app/legal-content/${page}.${lang}.ts`, { encoding: "utf8", maxBuffer: 1 << 24 });
  return parseContent(src, `${ref}:${page}.${lang}.ts`);
}

// Longest-common-subsequence diff over the flattened strings (paths are labels only).
function diffStrings(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i][1] === b[j][1] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i][1] === b[j][1]) { i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ kind: "removed", path: a[i++][0], text: a[i - 1][1] });
    else out.push({ kind: "added", path: b[j++][0], text: b[j - 1][1] });
  }
  while (i < n) out.push({ kind: "removed", path: a[i][0], text: a[i++][1] });
  while (j < m) out.push({ kind: "added", path: b[j][0], text: b[j++][1] });
  return out;
}

const changedPaths = new Set();
const sentences = (t) => t.split(/(?<=[.!?;])\s+/).map((x, i) => [String(i), x]);
function englishDiff(page) {
  const d = diffStrings(flat(loadAtRef(page, "en")), flat(loadContent(`app/legal-content/${page}.en.ts`)));
  if (!d.length) console.log("  EN: unchanged vs " + ref);
  // Paragraph-level result, then the exact sentences inside it that differ.
  const removed = new Map(d.filter((x) => x.kind === "removed").map((x) => [x.path, x.text]));
  for (const x of d) {
    if (x.kind === "added") changedPaths.add(`${page}:${x.path}`);
    console.log(`  EN ${x.kind.toUpperCase()} ${page}:${x.path}`);
    const old = removed.get(x.path);
    if (x.kind === "added" && old !== undefined) {
      for (const y of diffStrings(sentences(old), sentences(x.text))) console.log(`      ${y.kind === "added" ? "+" : "-"} ${JSON.stringify(y.text)}`);
    } else if (old === undefined || x.kind === "added") console.log(`      + ${JSON.stringify(x.text)}`);
  }
}

const blockCounts = (c) => c.sections.map((s) => s.blocks.length);
function blockDelta(page) {
  const elFile = `app/legal-content/${page}.el.ts`;
  if (!fs.existsSync(elFile)) return;
  const d = (o, n) => (o.sections.length !== n.sections.length ? `sections ${o.sections.length}->${n.sections.length}` : blockCounts(n).map((v, i) => v - blockCounts(o)[i]).join(","));
  const en = d(loadAtRef(page, "en"), loadContent(`app/legal-content/${page}.en.ts`));
  const el = d(loadAtRef(page, "el"), loadContent(elFile));
  console.log(`  block delta per section  EN [${en}]  EL [${el}]`);
  if (en !== el) fail(`${page}: block delta differs between EN and EL`);
}

const tokens = (t) => {
  const found = [];
  for (const m of t.matchAll(/\d+/g)) found.push(m[0]);
  for (const m of t.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)) found.push(m[0]);
  for (const m of t.matchAll(/\b(?:www\.)?[a-z0-9-]+\.(?:org|gr|com)(?:\/[\w./-]*)?/gi)) found.push(m[0].replace(/\.$/, ""));
  for (const m of t.matchAll(/\b[a-z]+(?:_[a-z]+)+\b/g)) found.push(m[0]);
  for (const n of NAMES) { const c = t.split(n).length - 1; for (let i = 0; i < c; i++) found.push(n); }
  return found.sort().join(" | ");
};

function structure(c) {
  return c.sections.map((s) => s.blocks.map((b) => (Array.isArray(b) ? `L${b.length}` : "P")).join(","));
}

function parity(page) {
  const en = loadContent(`app/legal-content/${page}.en.ts`);
  const elFile = `app/legal-content/${page}.el.ts`;
  if (!fs.existsSync(elFile)) { console.log(`  (no ${page}.el.ts yet)`); return; }
  const el = loadContent(elFile);
  const rows = [];
  if (en.sections.length !== el.sections.length) fail(`${page}: sections ${en.sections.length} vs ${el.sections.length}`);
  const se = structure(en), sl = structure(el);
  se.forEach((s, i) => { if (s !== sl[i]) fail(`${page} section ${i + 1}: block shape ${s} vs ${sl[i]}`); });
  if (tokens(en.updated) !== tokens(el.updated)) fail(`${page}: date tokens differ`);
  en.sections.forEach((s, i) => {
    const e = tokens([s.title, ...s.blocks.flat()].join("\n")), g = tokens([el.sections[i].title, ...el.sections[i].blocks.flat()].join("\n"));
    if (e !== g) fail(`${page} section ${i + 1}: tokens differ\n    en: ${e}\n    el: ${g}`);
  });
  const count = (c) => ({ sections: c.sections.length, paragraphs: c.sections.reduce((n, s) => n + s.blocks.filter((b) => !Array.isArray(b)).length, 0), lists: c.sections.reduce((n, s) => n + s.blocks.filter(Array.isArray).length, 0), items: c.sections.reduce((n, s) => n + s.blocks.filter(Array.isArray).reduce((m, b) => m + b.length, 0), 0), urls: (tokens(JSON.stringify(c)).match(/(?:\.org|\.gr|\.com)/g) || []).length });
  console.log(`  EN ${JSON.stringify(count(en))}\n  EL ${JSON.stringify(count(el))}`);
}

for (const p of pages) {
  console.log(p);
  englishDiff(p);
  blockDelta(p);
  parity(p);
}
if (expectArg) {
  const want = new Set(expectArg.slice(9).split(",").filter(Boolean));
  const extra = [...changedPaths].filter((x) => !want.has(x)), missing = [...want].filter((x) => !changedPaths.has(x));
  if (extra.length) fail("changed but not expected: " + extra.join(", "));
  if (missing.length) fail("expected but not changed: " + missing.join(", "));
}
console.log(failures ? `\n${failures} problem(s)` : "\nAll legal checks passed");
process.exit(failures ? 1 : 0);
