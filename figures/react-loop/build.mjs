// ReAct Agent Loop — Indexing Turntable
// A heavy indexing table divided into three 120° sectors (Thought / Action /
// Observation) turns under a fixed overhead stylus: the step being executed.
// A ratchet pawl clicks each sector home; a small counter wheel beside the
// base advances one digit per full T→A→O cycle.
//
// Mapping:
//   table sector under stylus -> current loop phase
//   table angle (120° steps)  -> agent step count
//   pawl click                -> sector detent (one per step)
//   counter wheel digit       -> completed cycles (mod 10, odometer-style)
//
// Rotating parts (sector engraving, labels, pawl, counter digits, stylus) are
// re-rendered in world coords every frame from the eased table angle.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/xavier/.agents/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "/Users/xavier/.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 400;

// ---------- world layout ----------
const BASE = { x: -106, y: -74, w: 212, d: 148, r: 10 };
const PLATE_H = 10;
const FOOT_H = 6;

// turntable
const TBL_R = 46, TBL_Z0 = 6, TBL_TOP = 22;
const ENG_Z = 22.1, LAB_Z = 22.15;
const LAB_R = 24, DOT_R = 37;
const HUB_R = 6;

// stylus (over the rim at world angle 60°, radius 37.5 — lands on sector dots)
const STYLUS = [18.5, 33.4];

// pawl (pivot outside the rim at world angle 0° — a notch parks here when settled)
const PAWL_PIVOT = [57, 0], PAWL_L = 10.5, PAWL_HW = 1.9;

// counter wheel
const CTR = [76, 40], CTR_R = 13, CTR_TOP = 14, CTR_DIG_R = 8.2;

const AZ = 42; // camera azimuth (matches fitProjection below)
const PHASES = ["Thought", "Action", "Observation"];

// ---------- camera ----------
const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -PLATE_H - FOOT_H, 0),
    [-64.5, 35, 69.5],       // post cap
    [22, 33.4, 66.5],        // arm far end
    [89, 53, 17],            // counter wheel extent
    [0, 0, 25.6],            // hub
  ],
  WIDTH, HEIGHT, { pad: 30, azimuth: AZ },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);

// ---------- shared render functions ----------
// These run in Node for the initial (no-JS) render and are serialized into the
// live script with .toString(); they address the kit through `k`, which is the
// imported module here and a map of the page's module globals there.
const RADc = Math.PI / 180;
const fmt3 = (v) => Math.round(v * 1000) / 1000;

// screen direction of a horizontal world direction at angle phi
function screenDir(phi) {
  const o = k.iso([0, 0, 0], P);
  const p = k.iso([Math.cos(phi), Math.sin(phi), 0], P);
  return [p[0] - o[0], p[1] - o[1]];
}

// text engraved flat on a horizontal face, anchored at world angle a, radius r
// around (cx, cy). Baseline runs along the tangent (reads left-to-right at the
// reading station), text descends along the outward radial. Rotates with the part.
function faceMatrix(cx, cy, a, r, z) {
  const o = k.iso([cx + r * Math.cos(a), cy + r * Math.sin(a), z], P);
  const u = screenDir(a - Math.PI / 2);
  const v = screenDir(a);
  return `matrix(${fmt3(u[0])} ${fmt3(u[1])} ${fmt3(v[0])} ${fmt3(v[1])} ${fmt3(o[0])} ${fmt3(o[1])})`;
}
function textEl(cx, cy, a, r, z, str, size, tone) {
  return `<text class="iso-face-text" data-tone="${tone}" transform="${faceMatrix(cx, cy, a, r, z)}" font-size="${size}" text-anchor="middle">${str}</text>`;
}

// rotating engraving of the turntable top, at table angle R (degrees)
function tableRotSVG(R, phase) {
  let out = "";
  for (let j = 0; j < 3; j++) {
    const d = (120 * j + R) * RADc;
    const cs = Math.cos(d), sn = Math.sin(d);
    // sector divider, hub to rim
    out += L(k.lineOnTop([9 * cs, 9 * sn], [42.5 * cs, 42.5 * sn], ENG_Z, P), { tone: "lo" });
    // rim chevron marking the notch line
    const w = 2.6 * RADc;
    out += L(k.lineOnTop([46 * Math.cos(d - w), 46 * Math.sin(d - w)], [44.4 * cs, 44.4 * sn], ENG_Z, P), { tone: "lo" });
    out += L(k.lineOnTop([46 * Math.cos(d + w), 46 * Math.sin(d + w)], [44.4 * cs, 44.4 * sn], ENG_Z, P), { tone: "lo" });
    // sector arc near the rim (the current sector is picked out)
    const a0 = d + 8 * RADc, a1 = d + 112 * RADc, pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = a0 + (a1 - a0) * i / 14;
      pts.push([38.5 * Math.cos(a), 38.5 * Math.sin(a)]);
    }
    out += L(k.onTop(pts, ENG_Z, P), { tone: j === phase ? "hi" : "faint" });
    // sector centre dot — the stylus lands on it when the sector is current
    const c = (60 + 120 * j + R) * RADc;
    out += D([at([DOT_R * Math.cos(c), DOT_R * Math.sin(c), ENG_Z])], { size: 0.8, tone: j === phase ? "hi" : "lo" });
    // engraved label, rotating with the table
    out += textEl(0, 0, c, LAB_R, LAB_Z, PHASES[j], 3.3, j === phase ? "mid" : "lo");
    // notch groove on the visible side wall (fades at the silhouette)
    const face = Math.cos((120 * j + R - AZ) * RADc);
    if (face > 0.1) {
      const al = Math.min(1, (face - 0.1) / 0.3);
      out += `<path class="iso-line" data-tone="lo" d="${k.pathOf([k.iso([TBL_R * cs, TBL_R * sn, 8.5], P), k.iso([TBL_R * cs, TBL_R * sn, 20], P)])}" style="opacity:${al.toFixed(2)}"/>`;
    }
  }
  // hub index line, spinning with the table
  const h = R * RADc;
  out += L(k.lineOnTop([1.4 * Math.cos(h), 1.4 * Math.sin(h)], [5.2 * Math.cos(h), 5.2 * Math.sin(h)], 25.1, P), { tone: "lo" });
  return out;
}

// ratchet pawl, pivoted at PAWL_PIVOT, lifted by betaDeg
function pawlSVG(betaDeg) {
  const b = betaDeg * RADc;
  const d = [-Math.cos(b), -Math.sin(b)];
  const pp = [-d[1], d[0]];
  const pv = PAWL_PIVOT;
  const end = [pv[0] + d[0] * PAWL_L, pv[1] + d[1] * PAWL_L];
  const arm = [
    [pv[0] + pp[0] * PAWL_HW, pv[1] + pp[1] * PAWL_HW],
    [end[0] + pp[0] * PAWL_HW, end[1] + pp[1] * PAWL_HW],
    [end[0] - pp[0] * PAWL_HW, end[1] - pp[1] * PAWL_HW],
    [pv[0] - pp[0] * PAWL_HW, pv[1] - pp[1] * PAWL_HW],
  ];
  let out = S(k.extrude(arm, 12, 5, P), { tone: "mid", crease: "none" });
  const e2 = [end[0] + d[0] * 2.9, end[1] + d[1] * 2.9];
  const tooth = [
    [end[0] + pp[0] * 1.1, end[1] + pp[1] * 1.1],
    [e2[0] + pp[0] * 1.1, e2[1] + pp[1] * 1.1],
    [e2[0] - pp[0] * 1.1, e2[1] - pp[1] * 1.1],
    [end[0] - pp[0] * 1.1, end[1] - pp[1] * 1.1],
  ];
  out += S(k.extrude(tooth, 8, 4.2, P), { tone: "mid", crease: "none" });
  out += D([at([pv[0], pv[1], 17.4])], { size: 0.8, tone: "hi" });
  return out;
}

// counter wheel digits + ticks at wheel angle rw (degrees); cur = lit digit
function counterSVG(rw, cur) {
  let out = "";
  for (let d = 0; d < 10; d++) {
    const a = (36 * d + rw) * RADc;
    const cs = Math.cos(a), sn = Math.sin(a);
    out += L(k.lineOnTop([CTR[0] + 10.4 * cs, CTR[1] + 10.4 * sn], [CTR[0] + 12.2 * cs, CTR[1] + 12.2 * sn], CTR_TOP + 0.1, P), { tone: "lo" });
    out += textEl(CTR[0], CTR[1], a, CTR_DIG_R, CTR_TOP + 0.15, String(d), 2.7, d === cur ? "hi" : "lo");
  }
  return out;
}

// overhead stylus, pressing down by press in [0, 1]
function needleSVG(press) {
  const tipZ = 23.4 - press * 1.15;
  let out = S(k.cylinder(STYLUS[0], STYLUS[1], 0.8, tipZ, 46.2 - tipZ, P, 12), { tone: "lit", crease: "none" });
  out += D([at([STYLUS[0], STYLUS[1], tipZ + 0.35])], { size: 0.75, tone: "hi" });
  return out;
}

// ---------- static geometry ----------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of k.corners(BASE, 26)) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip along the front edge
  const strip = { x: -88, y: 59, w: 176, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.7, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 6, 5, strip.y + 0.7, 0.7, [1.1, 2.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.7]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.7])], { size: 0.45 }));
  // label plate (rules only — the words live on the table itself)
  const lp = { x: -99, y: -66, w: 36, d: 17, r: 2 };
  out.push(S(k.slabOf(lp, 0, 1.4, P, 3, 0.3), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(lp, 2.5), 1.4, P), { tone: "lo" }));
  for (const ry of [-60.5, -57.5, -54.5]) {
    out.push(L(k.lineOnTop([lp.x + 5, ry], [lp.x + lp.w - 5, ry], 1.4, P), { tone: "faint" }));
  }
  out.push(D([at([lp.x + 3.4, lp.y + 3.4, 1.4]), at([lp.x + lp.w - 3.4, lp.y + 3.4, 1.4])], { size: 0.45 }));
  return out.join("");
}

function bossAndTable() {
  const out = [];
  // plinth the table turns on
  out.push(S(k.cylinder(0, 0, 50, 0, TBL_Z0, P, 56, 1), { tone: "lo" }));
  out.push(L(k.ring(0, 0, 50, TBL_Z0, P, 56), { tone: "lo" }));
  // reading-station ticks on the plinth: where each sector centre parks
  for (const [a, tone, r1, r2] of [[60, "mid", 46.8, 49.8], [180, "lo", 46.8, 49.2], [300, "lo", 46.8, 49.2]]) {
    const c = a * Math.PI / 180;
    out.push(L(k.lineOnTop([r1 * Math.cos(c), r1 * Math.sin(c)], [r2 * Math.cos(c), r2 * Math.sin(c)], TBL_Z0 + 0.1, P), { tone }));
  }
  // the table (short fat cylinder — its silhouette never changes as it turns)
  out.push(S(k.cylinder(0, 0, TBL_R, TBL_Z0, TBL_TOP - TBL_Z0, P, 72, 1.2), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(0, 0, TBL_R - 3, TBL_TOP + 0.05, P, 72), { tone: "lo" }));
  out.push(L(k.sideArc(0, 0, TBL_R, TBL_Z0 + 1, P, 40), { tone: "faint" }));
  out.push(L(k.sideArc(0, 0, TBL_R, TBL_TOP - 1, P, 40), { tone: "faint" }));
  // hub
  out.push(S(k.cylinder(0, 0, HUB_R, TBL_TOP, 3, P, 28, 0.8), { tone: "mid" }));
  out.push(L(k.ring(0, 0, HUB_R, TBL_TOP + 3, P, 28), { tone: "lo" }));
  out.push(D([at([0, 0, TBL_TOP + 3.4])], { size: 0.6, tone: "hi" }));
  return out.join("");
}

function cable() {
  return k.wireSvg(at([PAWL_PIVOT[0], PAWL_PIVOT[1], 1.6]), at([73.4, 34.6, 1.8]),
    { via: [at([66, 9, 1.6]), at([70, 26, 1.6])], tone: "lo", size: 1.15 });
}

function pawlPost() {
  const [x, y] = PAWL_PIVOT;
  const out = [];
  out.push(S(k.cylinder(x, y, 3.4, 0, 1.6, P, 20), { tone: "lo" })); // foot disc
  out.push(S(k.cylinder(x, y, 2.4, 1.6, 18.4, P, 20), { tone: "mid" }));
  out.push(L(k.ring(x, y, 2.4, 20, P, 20), { tone: "lo" }));
  return out.join("");
}

function gantry() {
  const out = [];
  // post + foot
  out.push(S(k.slabOf({ x: -67, y: 28.5, w: 13, d: 13, r: 1.5 }, 0, 2.4, P, 4, 0.4), { tone: "lo" }));
  out.push(D([at([-64.8, 30.7, 2.4]), at([-57.2, 38.3, 2.4])], { size: 0.5 }));
  out.push(S(k.slabOf({ x: -63, y: 32.5, w: 5, d: 5, r: 0.8 }, 0, 66, P, 4, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -64.5, y: 31, w: 8, d: 8, r: 1 }, 66, 3, P, 4, 0.4), { tone: "mid" }));
  out.push(D([at([-62.6, 33, 69]), at([-58.4, 37, 69])], { size: 0.5 }));
  // arm across to the head
  out.push(S(k.slabOf({ x: -61, y: 31.6, w: 83, d: 3.6, r: 1.2 }, 63, 3.5, P, 4, 0.3), { tone: "mid" }));
  // head + collar (the stylus itself is live, below)
  out.push(S(k.slabOf({ x: 14.5, y: 29.4, w: 8, d: 8, r: 1 }, 48, 15, P, 4, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(STYLUS[0], STYLUS[1], 2.6, 46, 2.4, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(STYLUS[0], STYLUS[1], 2.6, 46.4, 48, 20, P, 0.3), { tone: "lo" }));
  return out.join("");
}

function counterStatic() {
  const out = [];
  out.push(S(k.slabOf({ x: 70.5, y: 34.5, w: 11, d: 11, r: 1.2 }, 0, 3, P, 4, 0.3), { tone: "lo" }));
  out.push(D([at([72.6, 36.6, 3]), at([79.4, 43.4, 3])], { size: 0.45 }));
  out.push(S(k.cylinder(CTR[0], CTR[1], 2.8, 3, 8, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(CTR[0], CTR[1], CTR_R, 11, 3, P, 48, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.sideArc(CTR[0], CTR[1], CTR_R, 11.6, P, 30), { tone: "faint" }));
  // hub cap + pointer needle reaching the digit ring
  out.push(S(k.cylinder(CTR[0], CTR[1], 2.6, CTR_TOP, 2.4, P, 16), { tone: "mid" }));
  out.push(L(k.lineOnTop([CTR[0] + 2.6, CTR[1]], [CTR[0] + 11.8, CTR[1]], CTR_TOP + 2.5, P), { tone: "hi" }));
  out.push(D([at([CTR[0] + 11.8, CTR[1], CTR_TOP + 2.5])], { size: 0.7, tone: "hi" }));
  return out.join("");
}

// ---------- compose ----------
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Fig 7",
  body: [
    plate(),
    cable(),
    bossAndTable(),
    `<g data-part="table-rot">${tableRotSVG(0, 0)}</g>`,
    pawlPost(),
    `<g data-part="pawl">${pawlSVG(0)}</g>`,
    gantry(),
    `<g data-part="needle">${needleSVG(1)}</g>`,
    counterStatic(),
    `<g data-part="counter-rot">${counterSVG(0, 0)}</g>`,
  ],
});

// ---------- live script ----------
const live = `
const P = ${JSON.stringify(P)};
const k = { iso, pathOf, solidSvg, lineSvg, dotsSvg, lineOnTop, onTop, segment, extrude, cylinder, ring, depthOf };
const at = (p) => iso(p, P);
const S = (paths, style) => solidSvg(paths, style);
const L = (d, style) => lineSvg(d, style);
const D = (pts, style) => dotsSvg(pts, style);
const RADc = Math.PI / 180;
const fmt3 = (v) => Math.round(v * 1000) / 1000;
const ENG_Z = ${ENG_Z}, LAB_Z = ${LAB_Z}, LAB_R = ${LAB_R}, DOT_R = ${DOT_R};
const STYLUS = ${JSON.stringify(STYLUS)};
const PAWL_PIVOT = ${JSON.stringify(PAWL_PIVOT)}, PAWL_L = ${PAWL_L}, PAWL_HW = ${PAWL_HW};
const CTR = ${JSON.stringify(CTR)}, CTR_TOP = ${CTR_TOP}, CTR_DIG_R = ${CTR_DIG_R};
const TBL_R = ${TBL_R}, AZ = ${AZ};
const PHASES = ${JSON.stringify(PHASES)};
${screenDir.toString()}
${faceMatrix.toString()}
${textEl.toString()}
${tableRotSVG.toString()}
${pawlSVG.toString()}
${counterSVG.toString()}
${needleSVG.toString()}

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const gTable = svg.querySelector('[data-part="table-rot"]');
const gPawl = svg.querySelector('[data-part="pawl"]');
const gCounter = svg.querySelector('[data-part="counter-rot"]');
const gNeedle = svg.querySelector('[data-part="needle"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

let step = 0, angle = 0, rw = 0, press = 1;
let touring = !still.matches, tourAt = 0, wake = 0;

const phaseOf = (s) => ((s % 3) + 3) % 3;
const cycleOf = (s) => Math.floor(s / 3);
const RT = () => -120 * step;
const RWT = () => -36 * cycleOf(step);

function draw() {
  const phase = phaseOf(step), cycle = cycleOf(step);
  gTable.innerHTML = tableRotSVG(angle, phase);
  gPawl.innerHTML = pawlSVG(Math.min(1, Math.abs(RT() - angle) / 16) * 24);
  gCounter.innerHTML = counterSVG(rw, ((cycle % 10) + 10) % 10);
  gNeedle.innerHTML = needleSVG(press);
  const text = "phase: " + PHASES[phase] + " \\u00b7 cycle " + (cycle + 1) + " \\u00b7 step " + (step + 1);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(phase));
  stage.setAttribute("aria-valuetext", text);
}

let frame = 0, last = 0, visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const rt = RT(), rwt = RWT();
  if (still.matches) {
    angle = rt; rw = rwt; press = 1;
  } else {
    angle += (rt - angle) * (1 - Math.exp(-dt / 0.45));
    if (Math.abs(rt - angle) < 0.06) angle = rt;
    rw += (rwt - rw) * (1 - Math.exp(-dt / 0.55));
    if (Math.abs(rwt - rw) < 0.15) rw = rwt;
    const restNow = angle === rt && rw === rwt;
    const pressT = restNow ? 1 : 0;
    press += (pressT - press) * (1 - Math.exp(-dt / (pressT ? 0.12 : 0.06)));
    if (restNow && press > 0.999) press = 1;
  }
  draw();
  const rest = angle === rt && rw === rwt && press === 1;
  if (touring && rest && now >= tourAt) { tourAt = now + 2500; step += 1; }
  frame = visible && (!rest || touring) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };

function steer(dir) {
  touring = false;
  clearTimeout(wake);
  step = Math.max(0, step + dir);
  run();
  wake = setTimeout(() => { if (!still.matches) { touring = true; tourAt = 0; run(); } }, 7000);
}

new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);

stage.addEventListener("pointerdown", () => { stage.focus({ preventScroll: true }); steer(1); });
stage.addEventListener("keydown", (event) => {
  let dir = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") dir = 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") dir = -1;
  if (event.key === "Home") { touring = false; clearTimeout(wake); step = 0; run(); return; }
  if (dir === null) return;
  event.preventDefault();
  steer(dir);
});

draw();
`;

const body = k.plateHtml({
  fig: "Fig 7",
  title: "ReAct loop",
  hint: "Click or arrow keys step the table",
  readout: "phase: Thought · cycle 1 · step 1",
  keys: [
    { mark: "lit", label: "Stylus: the step being executed now" },
    { mark: "hi", label: "Indexing table: Thought → Action → Observation" },
    { mark: "dim", label: "Counter wheel: one digit per completed cycle" },
  ],
  caption:
    "A ReAct agent thinks, acts, and observes — forever. The indexing table turns one 120° sector per step under a fixed stylus, so the sector beneath the stylus is the phase being executed; the pawl clicks each sector home, and the little wheel on the right advances one digit per full Thought→Action→Observation cycle (odometer-style, mod 10). Click or press → to run the loop yourself.",
  body: `<style>.iso-stage{outline:none}.iso-stage:focus-visible{outline:1px solid var(--anatomy-mid);outline-offset:6px}</style><div class="iso-stage" tabindex="0" role="slider" aria-label="ReAct loop: click or use arrow keys to step through Thought, Action, Observation" aria-valuemin="0" aria-valuemax="2" aria-valuenow="0">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "react-loop-light.html" : "react-loop.html"),
  k.pageHtml({ title: "ReAct loop", theme, body, script: kitScript() + live, width: 660 }));
console.log("wrote", theme === "light" ? "react-loop-light.html" : "react-loop.html");
