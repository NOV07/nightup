// Offline checks for the legal pages. Run: node scripts/check-legal-parity.mjs [ref]
//  1. English unchanged: app/legal-content/<page>.en.ts must equal, character for
//     character, the strings of the old hardcoded app/<page>/page.tsx at git ref
//     (default origin/main).
//  2. Greek parity: <page>.el.ts must match <page>.en.ts in sections, paragraphs,
//     list items, link/URL count and destinations, and per section must contain the
//     same numbers, emails, URLs, identifiers and service names.
import fs from "fs";
import { extractOld, loadContent } from "./legal-extract.mjs";

const ref = process.argv[2] || "origin/main";
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

function exactCompare(page) {
  const a = flat(extractOld(page, ref)), b = flat(loadContent(`app/legal-content/${page}.en.ts`));
  if (a.length !== b.length) fail(`${page}: ${a.length} strings in ${ref} vs ${b.length} in .en.ts`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const [path, x] = a[i], [, y] = b[i];
    if (x !== y) {
      let n = 0; while (x[n] === y[n]) n++;
      fail(`${page} ${path}: differs at char ${n}\n    old: ...${JSON.stringify(x.slice(Math.max(0, n - 20), n + 30))}\n    new: ...${JSON.stringify(y.slice(Math.max(0, n - 20), n + 30))}`);
    }
  }
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
  exactCompare(p);
  parity(p);
}
console.log(failures ? `\n${failures} problem(s)` : "\nAll legal checks passed");
process.exit(failures ? 1 : 0);
