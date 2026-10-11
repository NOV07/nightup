import fs from "fs";
import { execSync } from "child_process";

// Pulls { eyebrow, title, updated, sections } out of the OLD hardcoded
// app/<page>/page.tsx as stored in a git ref.
export function extractOld(page, ref = "origin/main") {
  const src = execSync(`git show ${ref}:app/${page}/page.tsx`, { encoding: "utf8", maxBuffer: 1 << 24 });
  const a = src.search(/\{\[\r?\n/) + 1;
  const b = src.indexOf("].map(") + 1;
  const sections = new Function("return " + src.slice(a, b))();
  const eyebrow = src.match(/uppercase[^>]*>\s*([^<]+?)\s*<\/p>/)[1];
  const title = src.match(/<h1[^>]*>\s*([^<]+?)\s*<\/h1>/)[1];
  const updated = src.match(/(Last updated:[^<]*?)\s*<\/p>/)[1];
  return { eyebrow, title, updated, sections };
}

// Loads a legal-content module (`const content: LegalContent = {...};`) without a TS toolchain.
export function loadContent(file) {
  const src = fs.readFileSync(file, "utf8");
  const m = src.match(/const content: LegalContent = ([\s\S]*?);\s*export default content;/);
  if (!m) throw new Error("Unexpected format: " + file);
  return new Function("return " + m[1])();
}
