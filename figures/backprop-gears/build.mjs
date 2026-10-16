// Backpropagation Gear Train — an "anatomy" figure
//
// The machine: four meshed spur gears on shafts, L1 (smallest, left) to L4 (largest,
// right, the loss). The error signal δ enters as a crank fixed to L4 and back-drives
// the train toward L1. Meshed gears counter-rotate; the rotation ratio at each mesh
// is the teeth (radius) ratio — the local Jacobian. Each layer's gradient is the
// accumulated product of ratios from L4 down to it: the chain rule, multiplied out
// gear by gear.
//
// Mapping:
//   crank angle (L4)        -> the error signal δ
//   gear radius / teeth     -> layer Jacobian factor at each mesh
//   angle_i                 -> -angle_{i+1} * (r_{i+1} / r_i)
//   |g_i|                   -> product of ratios L4 -> L_i (×0.9 per hop, scaled)
//   bright index line       -> each layer's gradient direction
//   engraved "×r/r" marks   -> the local ratios written at each mesh

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/xavier/.agents/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "/Users/xavier/.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 620;
const HEIGHT = 380;

// ---------- the model (truth first) ----------
const RADII = [10, 13, 17, 22]; // L1 .. L4, world units
const MESH = 1.2; // teeth overlap at each mesh (teeth are 1.3 deep)

// shaft centres along x so adjacent pitch circles overlap by MESH
const CX = [0];
for (let i = 1; i < 4; i++) CX.push(CX[i - 1] + RADII[i - 1] + RADII[i] - MESH);
const spanL = CX[0] - RADII[0], spanR = CX[3] + RADII[3];
const shift = -(spanL + spanR) / 2;
for (let i = 0; i < 4; i++) CX[i] = Math.round((CX[i] + shift) * 100) / 100;

const TIP = RADII.slice();
const ROOT = RADII.map((r) => r - 1.3);
const TOOTH = RADII.map((r) => Math.round((2 * Math.PI * r) / 2.62)); // [24,31,41,53]

// gradient magnitudes: |g_i| = prod(ratios from L4 to L_i), 0.9 per hop, scaled to read
const HOP = [RADII[3] / RADII[2], RADII[2] / RADII[1], RADII[1] / RADII[0]];
const rawG = [0.9 ** 3 * HOP[0] * HOP[1] * HOP[2], 0.9 ** 2 * HOP[0] * HOP[1], 0.9 * HOP[0]];
const K = rawG[0] / 0.42; // meter scale: earliest layer reads 0.42
const G = rawG.map((v) => (v / K).toFixed(2));

// ---------- world layout ----------
const PLATE = { x: -76, y: -36, w: 152, d: 80, r: 6 };
const PLATE_H = 12;
const FOOT_H = 5;

const GEAR_BOT = 13.5, GEAR_H = 5, GEAR_TOP = GEAR_BOT + GEAR_H; // disc z 13.5..18.5
const SHAFT_R = 1.5, SHAFT_TOP = 22;
const HUB_R = 3.0;
const BOSS_R = 2.6, BOSS_TOP = 22.8; // crank boss on L4
const Z_ARM = 23.0, ARM = RADII[3] + 5; // crank arm/knob
const KNOB_R = 1.9, KNOB_H = 3.2;

const STRIP = { x: -60, y: 29, w: 120, d: 10, r: 1.5 }; // engraved label strip
const PRO_R = 27.5; // protractor ring around L4

// ---------- camera ----------
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [CX[0] - RADII[0], 0, SHAFT_TOP],
    [CX[3] + ARM, 0, Z_ARM + KNOB_H], [CX[3] - ARM, 0, Z_ARM + KNOB_H],
    [CX[3], ARM, Z_ARM + KNOB_H], [CX[3], -ARM, Z_ARM + KNOB_H],
  ],
  WIDTH, HEIGHT, { pad: 30, azimuth: 42 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);

// ---------- base ----------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of k.corners(PLATE, 21)) {
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H, 1.6, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---------- engraved label strip: layer names + local ratios at each mesh ----------
function labelStrip() {
  const out = [];
  out.push(S(k.slabOf(STRIP, 0, 0.7, P, 3), { tone: "lo", crease: "none" }));
  const names = ["L1", "L2", "L3", "L4 · loss"];
  for (let i = 0; i < 4; i++) {
    // tick from strip back edge pointing at this gear's shaft
    out.push(L(k.lineOnTop([CX[i], STRIP.y], [CX[i], STRIP.y - 1.8], 0.7, P), { tone: "lo" }));
    out.push(k.faceTextSvg(k.topMatrix([CX[i], STRIP.y + 6.5], 0.7, P, "x"), names[i], { size: 3.6, tone: "lo", anchor: "middle" }));
  }
  for (let i = 0; i < 3; i++) {
    const mx = (CX[i] + CX[i + 1]) / 2;
    const ratio = RADII[i + 1] / RADII[i];
    out.push(k.faceTextSvg(k.topMatrix([mx, STRIP.y + 6.2], 0.7, P, "x"), "×" + ratio.toFixed(2), { size: 2.8, tone: "lo", anchor: "middle" }));
  }
  return out.join("");
}

// ---------- crank protractor engraved around L4 ----------
function protractor() {
  const out = [];
  const [cx] = [CX[3]];
  out.push(L(k.ring(cx, 0, PRO_R, 0.1, P, 72), { tone: "lo" }));
  out.push(L(k.ring(cx, 0, PRO_R - 3.4, 0.1, P, 72), { tone: "faint" }));
  // engraved degree ticks over the viewer-facing 150° arc
  const ticks = k.radialTicks(cx, 0, PRO_R, 16, 3, 0.1, [1.2, 2.6], P, (60 * Math.PI) / 180, (150 * Math.PI) / 180);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  return out.join("");
}

// ---------- oiler at each bearing (front-left, clear of every rim) ----------
function oilers() {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const d = TIP[i] + 3.2;
    const ox = CX[i] - d * 0.7071, oy = d * 0.7071;
    out.push(S(k.cylinder(ox, oy, 1.05, 0, 2.6, P, 14), { tone: "mid" }));
    out.push(L(k.knurl(ox, oy, 1.05, 0.4, 2.2, 9, P, 0.15), { tone: "lo" }));
    out.push(S(k.cylinder(ox, oy, 0.62, 2.6, 1.0, P, 10), { tone: "hi" }));
    out.push(D([at([ox, oy, 3.6])], { size: 0.4, tone: "lo" }));
  }
  return out.join("");
}

// ---------- one gear: pedestal, shaft, toothed disc, hub, live index line ----------
function gear(i) {
  const cx = CX[i], root = ROOT[i], tip = TIP[i], teeth = TOOTH[i];
  const out = [];
  // shaft first: pedestal and disc cover its lower runs
  out.push(S(k.cylinder(cx, 0, SHAFT_R, 0, SHAFT_TOP, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(cx, 0, 4.2, 0, 3.2, P, 24), { tone: "lo" }));
  out.push(L(k.ring(cx, 0, 3.0, 3.2, P, 20), { tone: "lo" }));
  // toothed disc: root cylinder + knurled wall + teeth ticks on the top face
  out.push(S(k.cylinder(cx, 0, root, GEAR_BOT, GEAR_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(cx, 0, root, GEAR_BOT + 0.3, GEAR_TOP - 0.3, teeth, P, 0.25), { tone: "lo" }));
  out.push(L(k.radialTicks(cx, 0, tip, teeth, 4, GEAR_TOP + 0.05, [1.3, 1.3], P).minor, { tone: "lo" }));
  out.push(L(k.ring(cx, 0, root, GEAR_TOP + 0.05, P, 64), { tone: "lo" }));
  // live index line (filled every frame by the page script)
  out.push(`<g data-part="index${i}"></g>`);
  // hub + shaft end cap
  out.push(S(k.cylinder(cx, 0, HUB_R, GEAR_TOP, 2, P, 24), { tone: "mid" }));
  out.push(L(k.ring(cx, 0, 2.1, GEAR_TOP + 2, P, 18), { tone: "lo" }));
  if (i === 3) {
    // crank boss: the error input
    out.push(S(k.cylinder(cx, 0, BOSS_R, GEAR_TOP + 2, BOSS_TOP - GEAR_TOP - 2, P, 20), { tone: "mid" }));
    out.push(L(k.knurl(cx, 0, BOSS_R, GEAR_TOP + 2.4, BOSS_TOP - 0.4, 10, P, 0.2), { tone: "lo" }));
  } else {
    out.push(L(k.ring(cx, 0, 1.9, SHAFT_TOP, P, 16), { tone: "mid" }));
    out.push(D([at([cx, 0, SHAFT_TOP])], { size: 0.45 }));
  }
  return out.join("");
}

// ---------- compose ----------
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Fig 3",
  title: "Backpropagation",
  body: [
    plate(),
    labelStrip(),
    protractor(),
    oilers(),
    gear(0), gear(1), gear(2), gear(3), // ascending x = far to near
    `<g data-part="crank"></g>`,
  ],
});

// ---------- live script ----------
const live = `
const P = ${JSON.stringify(P)};
const CX = ${JSON.stringify(CX)};
const RADII = ${JSON.stringify(RADII)};
const ROOT = ${JSON.stringify(ROOT)};
const TIP = ${JSON.stringify(TIP)};
const ZT = ${GEAR_TOP + 0.1}, ZA = ${Z_ARM}, ARM = ${ARM};
const KNOB_R = ${KNOB_R}, KNOB_H = ${KNOB_H};
const G1 = "${G[0]}", G2 = "${G[1]}", G3 = "${G[2]}";

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const idx = [0, 1, 2, 3].map((i) => svg.querySelector('[data-part="index' + i + '"]'));
const crankG = svg.querySelector('[data-part="crank"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const DEG = Math.PI / 180;

// rotation ratio at each mesh: angle_i = -angle_{i+1} * (r_{i+1} / r_i)
function anglesOf(a4) {
  const a = [0, 0, 0, a4];
  a[2] = -a4 * (RADII[3] / RADII[2]);
  a[1] = -a[2] * (RADII[2] / RADII[1]);
  a[0] = -a[1] * (RADII[1] / RADII[0]);
  return a;
}

function draw() {
  const a = anglesOf(crank);
  window.__bg = { a: a.slice(), crank: crank };
  for (let i = 0; i < 4; i++) {
    const cx = CX[i], root = ROOT[i], tip = TIP[i];
    const c = Math.cos(a[i]), s = Math.sin(a[i]);
    let h = '<path class="iso-line" data-tone="lit" d="' + lineOnTop([cx, 0], [cx + c * root, s * root], ZT, P) + '" style="stroke-width:1.5"/>';
    h += '<path class="iso-line" data-tone="lit" d="' + lineOnTop([cx + c * root, s * root], [cx + c * tip, s * tip], ZT, P) + '" style="stroke-width:2.4"/>';
    for (const da of [2.2, -2.2]) { // companion teeth marks riding the index
      const cc = Math.cos(a[i] + da), ss = Math.sin(a[i] + da);
      h += '<path class="iso-line" data-tone="hi" d="' + lineOnTop([cx + cc * (root - 2.6), ss * (root - 2.6)], [cx + cc * root, ss * root], ZT, P) + '"/>';
    }
    idx[i].innerHTML = h;
  }
  const bx = CX[3] + Math.cos(crank) * ARM, by = Math.sin(crank) * ARM;
  crankG.innerHTML =
    '<path class="iso-line" data-tone="hi" d="' + lineOnTop([CX[3], 0], [bx, by], ZA, P) + '" style="stroke-width:2.8"/>' +
    solidSvg(cylinder(bx, by, KNOB_R, ZA, KNOB_H, P, 20), { tone: "hi", crease: "lo" }) +
    lineSvg(knurl(bx, by, KNOB_R, ZA + 0.4, ZA + KNOB_H - 0.3, 10, P, 0.15), { tone: "lo" }) +
    dotsSvg([iso([bx, by, ZA + KNOB_H], P)], { size: 0.55, tone: "lit" });
  const deg = Math.round(((crank / DEG) % 360 + 360) % 360);
  const text = "δ crank " + deg + "° · |g1| " + G1 + " · |g2| " + G2 + " · |g3| " + G3;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(deg));
  stage.setAttribute("aria-valuetext", text);
}

let crank = 132 * DEG, target = crank, frame = 0, last = 0, visible = false, touring = true, idleTimer = 0;
const REACH = [0, 720 * DEG];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) target += dt * 38 * DEG;
  crank = still.matches ? target : crank + (target - crank) * (1 - Math.exp(-dt / 0.22));
  if (!touring && Math.abs(target - crank) < 0.001) crank = target;
  draw();
  const settled = !touring && crank === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, REACH[0], REACH[1]); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; run(); }, 3500); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  steer(REACH[0] + share * (REACH[1] - REACH[0]));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + 20 * DEG;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - 20 * DEG;
  if (event.key === "Home") to = REACH[0];
  if (event.key === "End") to = REACH[1];
  if (to === null) return;
  event.preventDefault();
  steer(clamp(to, REACH[0], REACH[1]));
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 3",
  title: "Backpropagation",
  hint: "Hover to crank δ · ←/→ nudge",
  readout: `δ crank 132° · |g1| ${G[0]} · |g2| ${G[1]} · |g3| ${G[2]}`,
  keys: [
    { mark: "lit", label: "Index line — layer i's gradient, swinging with the product of ratios" },
    { mark: "raised", label: "Gears L1–L4 — layer weights; radius sets each local Jacobian" },
    { mark: "flat", label: "Crank δ — the error, entered at the loss gear L4" },
  ],
  caption:
    "Backpropagation as a gear train. The error δ enters at the loss gear L4 — turn the crank — and back-drives the train toward L1. Meshed gears counter-rotate, and each mesh multiplies the swing by its teeth ratio, the local Jacobian engraved between the labels. The bright index lines are each layer's gradient: |g_i| is the product of ratios from L4 down to L_i, so the smallest gear, L1, swings 2.2× the crank. That accumulated product is the chain rule, multiplied out mesh by mesh.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Backpropagation gear train: hover or use arrow keys to turn the error crank" aria-valuemin="0" aria-valuemax="720" aria-valuenow="132">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "backprop-gears-light.html" : "backprop-gears.html"),
  k.pageHtml({ title: "Backpropagation", theme, body, script: kitScript() + live }));
console.log("wrote", theme === "light" ? "backprop-gears-light.html" : "backprop-gears.html");
