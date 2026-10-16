#!/usr/bin/env node
// Content schema checker: node scripts/check-content.mjs [days...]
// Validates content/days/*.json against the golden-sample schema.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DAYS_DIR = join(ROOT, "content", "days");
const daysJson = JSON.parse(readFileSync(join(ROOT, "days.json"), "utf8"));
const titles = new Map(daysJson.map((d) => [d.day, d.title]));

const files = process.argv.length > 2
  ? process.argv.slice(2).map((d) => `d${d}.json`).map((f) => join(DAYS_DIR, f))
  : readdirSync(DAYS_DIR).map((f) => join(DAYS_DIR, f)).sort((a, b) => +a.match(/d(\d+)/)[1] - +b.match(/d(\d+)/)[1]);

let bad = 0;
for (const f of files) {
  const name = f.split("/").pop();
  let j;
  try { j = JSON.parse(readFileSync(f, "utf8")); } catch (e) { console.log(`✗ ${name}: JSON parse error: ${e.message}`); bad++; continue; }
  const errs = [];
  const d = j.day;
  if (!Number.isInteger(d) || d < 1 || d > 160) errs.push(`bad day ${d}`);
  if (titles.get(d) && j.title && j.title !== titles.get(d)) errs.push(`title mismatch: "${j.title}" vs days.json "${titles.get(d)}"`);
  if (!Array.isArray(j.sections) || j.sections.length < 3) errs.push(`sections ${j.sections?.length} < 3`);
  else j.sections.forEach((s, i) => {
    if (typeof s.h !== "string" || !s.h) errs.push(`sections[${i}].h missing`);
    if (typeof s.md !== "string" || s.md.length < 120) errs.push(`sections[${i}].md too short (${s.md?.length})`);
  });
  const bodyLen = (j.sections || []).reduce((n, s) => n + (s.md || "").length, 0);
  if (bodyLen < 1000) errs.push(`total md too short: ${bodyLen} chars`);
  if (!Array.isArray(j.keyPoints) || j.keyPoints.length < 3) errs.push(`keyPoints ${(j.keyPoints || []).length} < 3`);
  if (!Array.isArray(j.quiz) || j.quiz.length < 4) errs.push(`quiz ${(j.quiz || []).length} < 4`);
  else j.quiz.forEach((q, i) => {
    if (typeof q.q !== "string" || q.q.length < 8) errs.push(`quiz[${i}].q missing`);
    if (!Array.isArray(q.options) || q.options.length < 3) errs.push(`quiz[${i}].options ${(q.options || []).length} < 3`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options || []).length) errs.push(`quiz[${i}].answer ${q.answer} out of range`);
    if (typeof q.explain !== "string" || q.explain.length < 15) errs.push(`quiz[${i}].explain missing`);
  });
  if (errs.length) { console.log(`✗ d${d}: ${errs.join("; ")}`); bad++; }
  else console.log(`✓ d${d} · ${j.sections.length}节 ${bodyLen}字 ${j.quiz.length}题`);
}
console.log(bad ? `\n${bad} file(s) FAILED` : `\nall ${files.length} files OK`);
process.exit(bad ? 1 : 0);
