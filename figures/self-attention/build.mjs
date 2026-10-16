// Self-Attention Scanner Gantry — Fig 5
// A row of 7 token blocks (t1..t7, varying heights) sits on a rail bed; an overhead
// bridge spans the row; the CARRIAGE (the Query) slides along it and drops a thin
// wire to EVERY token. Each wire's visual weight = its softmax attention:
//   w_i = softmax(-|i - q| * 1.4)   (q = carriage x mapped to token index space)
// Strong wires are tone "lit" + thicker and land on a bigger dot; weak wires are
// "faint". A small meter on the carriage reads the max weight.
//
// Mapping:
//   token blocks      -> the K/V tokens (heights = token magnitudes)
//   carriage          -> the query position q (fractional)
//   wires + dots      -> attention weights w_i
//   dial on carriage  -> max weight (peaks ≈0.61 over a token, ≈0.38 between)

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/xavier/.agents/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "/Users/xavier/.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 620;
const HEIGHT = 400;

// ---------- world ----------
const N = 7;
const PITCH = 26;
const TX = Array.from({ length: N }, (_, i) => (i - 3) * PITCH); // token centres
const TH = [20, 23, 26, 28, 25, 23, 20];                          // token heights
const RAILBED_Z = 4;
const TOPS = TH.map((h) => RAILBED_Z + h);                        // token top faces
const TOKEN_W = 17, TOKEN_D = 30;

const PLATE = { x: -124, y: -50, w: 248, d: 100, r: 8 };
const PLATE_H = 8, FOOT_H = 5;

const BEAM = { x: -119, y: -13, w: 238, d: 26, r: 3 };
const BEAM_Z = 80, BEAM_H = 6;
const FLANGE = { x: -100, y: -3, w: 200, d: 6, r: 1 };
const FLANGE_Z = 77, FLANGE_H = 3;

const POST_X = 108;          // both posts
const BODY = { hw: 13, hd: 13, z: 55, h: 14 };       // carriage body z 52..66
const HUB_Z = 51.5;                                   // wire start (collet bottom)
const COLLET_R = 2.2;

// ---------- camera ----------
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -(PLATE_H + FOOT_H), 0),
    ...k.boxCorners(BEAM, BEAM_Z, BEAM_Z + BEAM_H),
  ],
  WIDTH, HEIGHT, { pad: 32, azimuth: 42 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ---------- build-time wire/token clearance check ----------
// Every wire (hub -> token j) must clear every other token's top by >= 0.4.
{
  let worst = 1e9, desc = "";
  for (let xh = -78; xh <= 78.001; xh += 0.25) {
    for (let j = 0; j < N; j++) {
      const xt = TX[j], zt = TOPS[j] + 0.5;
      for (let m = 0; m < N; m++) {
        if (m === j) continue;
        const dir = Math.sign(xt - xh) || 1;
        const edge = TX[m] + dir * (TOKEN_W / 2);
        const between = (edge - xh) * (xt - xh) > 0 && Math.abs(edge - xh) < Math.abs(xt - xh);
        if (!between) continue;
        const z = HUB_Z + ((edge - xh) / (xt - xh)) * (zt - HUB_Z);
        const margin = z - (TOPS[m] + 0.4);
        if (margin < worst) { worst = margin; desc = `hub ${xh.toFixed(2)} -> t${j + 1} clears t${m + 1}`; }
      }
    }
  }
  console.log(`wire clearance worst margin: ${worst.toFixed(2)} (${desc})`);
  if (worst < 0) { console.error("wire passes through a token — adjust TH or HUB_Z"); process.exit(1); }
}

// ---------- base ----------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -(PLATE_H + FOOT_H), PLATE_H + FOOT_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -(PLATE_H + FOOT_H), 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -(PLATE_H + FOOT_H) + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip under the token row (token index scale)
  const strip = { x: -88, y: 41, w: 176, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  let majors = "", minors = "";
  for (let i = 0; i < N; i++) {
    majors += k.lineOnTop([TX[i], 41.6], [TX[i], 41.6 + 2.8], 0.6, P);
    if (i < N - 1) minors += k.lineOnTop([TX[i] + PITCH / 2, 41.6], [TX[i] + PITCH / 2, 41.6 + 1.3], 0.6, P);
  }
  out.push(L(minors, { tone: "lo" }), L(majors, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
  // label plate, front right
  const label = { x: 64, y: 24, w: 46, d: 10, r: 1 };
  out.push(S(k.slabOf(label, 0, 1, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 0.4), 1, P), { tone: "lo" }));
  out.push(L([26.5, 29, 31.5].map((y) => k.lineOnTop([label.x + 0.5, y], [label.x + label.w - 0.5, y], 1, P)).join(""), { tone: "lo" }));
  out.push(D([at([label.x + 2, label.y + 2, 1]), at([label.x + label.w - 2, label.y + label.d - 2, 1])], { size: 0.4 }));
  return out.join("");
}

// ---------- token rail bed + token blocks ----------
function railBed() {
  const bed = { x: -88, y: -17, w: 176, d: 34, r: 2 };
  return S(k.slabOf(bed, 0, RAILBED_Z, P, 6, 0.8), { tone: "lo" })
    + L(k.planOutline(k.insetPlan(bed, 3), RAILBED_Z, P), { tone: "faint" });
}

function tokens() {
  const out = [];
  for (let i = 0; i < N; i++) {
    const plan = { x: TX[i] - TOKEN_W / 2, y: -TOKEN_D / 2, w: TOKEN_W, d: TOKEN_D, r: 1.5 };
    out.push(S(k.slabOf(plan, RAILBED_Z, TH[i], P, 6, 0.8), { tone: "mid" }));
    out.push(L(k.sideSeam(plan, TOPS[i] - 4, P), { tone: "faint" }));
    out.push(k.faceTextSvg(k.topMatrix([TX[i], 5.5], TOPS[i] + 0.2, P, "x"), `t${i + 1}`, { size: 4, tone: "lo", anchor: "middle" }));
  }
  return out.join("");
}

// ---------- gantry: posts, hanging rail, beam ----------
function post(side) {
  const s = side === "L" ? -1 : 1;
  const base = { x: s === -1 ? -117 : POST_X - 9, y: -17, w: 18, d: 34, r: 2 };
  const post = { x: s === -1 ? -113 : POST_X - 5, y: -13, w: 10, d: 26, r: 1 };
  const collar = { x: s === -1 ? -114 : POST_X - 6, y: -12, w: 13, d: 24, r: 1 };
  const out = [];
  out.push(S(k.slabOf(base, 0, 2.5, P, 4, 0.4), { tone: "lo" }));
  const bolts = [[s === -1 ? -113 : POST_X, -11], [s === -1 ? -113 : POST_X, 11]];
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 1.8, 2.5, P, 12)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 2.5])), { size: 0.45 }));
  out.push(S(k.slabOf(post, 2.5, BEAM_Z - 2.5, P, 6, 0.5), { tone: "mid" }));
  out.push(L(k.sideSeam(post, 42, P), { tone: "faint" }));
  out.push(S(k.slabOf(collar, BEAM_Z - 4, 4, P, 4, 0.4), { tone: "mid" }));
  return out.join("");
}

function bridge() {
  const out = [];
  out.push(S(k.slabOf(FLANGE, FLANGE_Z, FLANGE_H, P, 4, 0.3), { tone: "lo" }));
  for (const s of [-1, 1]) { // end stops on the rail
    const stop = { x: s === -1 ? -96.5 : 93.5, y: -4.5, w: 3, d: 9, r: 0.8 };
    out.push(S(k.slabOf(stop, 74, 6, P, 3), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BEAM, BEAM_Z, BEAM_H, P, 8, 1), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BEAM, 3), BEAM_Z + BEAM_H, P), { tone: "lo" }));
  out.push(L(k.sideSeam(BEAM, BEAM_Z + 3, P), { tone: "faint" }));
  out.push(D([-100, -40, 40, 100].map((x) => at([x, 0, BEAM_Z + BEAM_H])), { size: 0.5, tone: "mid" }));
  return out.join("");
}

// ---------- compose (carriage + wires are live groups) ----------
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Fig 5",
  title: "Self-attention",
  body: [
    plate(),
    railBed(),
    tokens(),
    post("L"),
    post("R"),
    bridge(),
    `<g data-part="carriage"></g>`,
    `<g data-part="wires"></g>`,
  ],
});

// ---------- live script ----------
const live = `
const P = ${JSON.stringify(P)};
const N = ${N}, PITCH = ${PITCH}, SHARP = 1.4;
const TX = ${JSON.stringify(TX)};
const TOPS = ${JSON.stringify(TOPS)};
const HUB_Z = ${HUB_Z};
const SUB = "\\u2081\\u2082\\u2083\\u2084\\u2085\\u2086\\u2087";

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const wires = svg.querySelector('[data-part="wires"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const REACH = [0, N - 1];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function weightsOf(q) {
  const l = TX.map((_, i) => -Math.abs(i - q) * SHARP);
  const m = Math.max(...l);
  const e = l.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
const toneOf = (w) => (w > 0.32 ? "lit" : w > 0.14 ? "hi" : w > 0.05 ? "mid" : "faint");

function buildCarriage(x, w) {
  const out = [];
  // wire collet under the body
  out.push(solidSvg(cylinder(x, 0, ${COLLET_R}, 52, 3, P, 20), { tone: "mid" }));
  out.push(lineSvg(knurl(x, 0, ${COLLET_R}, 52.4, 54.6, 12, P), { tone: "lo" }));
  // body
  const body = { x: x - 13, y: -13, w: 26, d: 26, r: 3 };
  out.push(solidSvg(slabOf(body, ${BODY.z}, ${BODY.h}, P, 8, 1), { tone: "hi", crease: "lo" }));
  out.push(lineSvg(planOutline(insetPlan(body, 3.5), ${BODY.z + BODY.h}, P), { tone: "lo" }));
  // meter: reads the max weight (0.38 between tokens .. 0.61 over one)
  const r = 6.5, cy = -4, dz = ${BODY.z + BODY.h}, dtop = dz + 6.5;
  out.push(solidSvg(cylinder(x, cy, r, dz, 6.5, P, 40, 0.6), { tone: "hi", crease: "lo" }));
  out.push(lineSvg(ring(x, cy, r - 0.7, dtop, P, 40), { tone: "lo" }));
  const t = radialTicks(x, cy, r - 1.3, 21, 7, dtop, [0.7, 1.5], P, -Math.PI * 0.72, Math.PI * 1.44);
  out.push(lineSvg(t.minor, { tone: "lo" }), lineSvg(t.major, { tone: "mid" }));
  const wmax = Math.max(...w);
  const share = clamp((wmax - 0.35) / 0.30, 0, 1);
  const ang = -Math.PI * 0.72 + share * Math.PI * 1.44;
  out.push('<path class="iso-line" data-tone="lit" d="' + lineOnTop(
    [x - Math.sin(ang) * 1.3, cy + Math.cos(ang) * 1.3],
    [x + Math.sin(ang) * (r - 1.7), cy - Math.cos(ang) * (r - 1.7)], dtop + 0.2, P) + '" style="stroke-width:1.1"/>');
  out.push(dotsSvg([iso([x, cy, dtop + 0.2], P)], { size: 0.7, tone: "lit" }));
  // saddle bracket + rollers riding the rail's front flange edge
  out.push(solidSvg(slabOf({ x: x - 10, y: 3.2, w: 20, d: 3.6, r: 0.8 }, dz, 8, P, 4, 0.4), { tone: "mid" }));
  for (const dx of [-7, 7]) {
    out.push(solidSvg(cylinder(x + dx, 6, 3, 74, 6, P, 24), { tone: "mid" }));
    out.push(lineSvg(knurl(x + dx, 6, 3, 74.6, 79.4, 16, P), { tone: "lo" }));
    out.push(dotsSvg([iso([x + dx, 6, 80], P)], { size: 0.55, tone: "lo" }));
  }
  return out.join("");
}

function buildWires(x, w) {
  const hub = iso([x, 0, HUB_Z], P);
  let out = "";
  for (let i = 0; i < N; i++) {
    const p = iso([TX[i], 0, TOPS[i] + 0.5], P);
    const wi = w[i];
    const tone = toneOf(wi);
    out += '<path class="iso-line" data-tone="' + tone + '" d="' + pathOf([hub, p]) + '" style="stroke-width:' + (0.45 + wi * 2).toFixed(2) + '"/>';
    out += dotsSvg([p], { size: (0.8 + wi * 4.2).toFixed(2), tone });
  }
  return out;
}

let q = 2, target = 2;
function draw() {
  const x = (q - 3) * PITCH;
  const w = weightsOf(q);
  carriage.innerHTML = buildCarriage(x, w);
  wires.innerHTML = buildWires(x, w);
  const top = w.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  const text = "q \\u2248 t" + (q + 1).toFixed(1) + " \\u00b7 w" + SUB[top[0][1]] + "=" + top[0][0].toFixed(2) + " \\u00b7 w" + SUB[top[1][1]] + "=" + top[1][0].toFixed(2);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", q.toFixed(2));
  stage.setAttribute("aria-valuetext", text);
}
let frame = 0, last = 0, visible = false, touring = true, clock = 0, idleTimer = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = REACH[0] + (1 - Math.cos(clock * 0.4)) * 0.5 * (REACH[1] - REACH[0]); }
  q = still.matches ? target : q + (target - q) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(target - q) < 0.001) q = target;
  draw();
  const settled = !touring && q === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, REACH[0], REACH[1]); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3500); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  steer(share * (N - 1));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + 0.25;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - 0.25;
  if (event.key === "Home") to = REACH[0];
  if (event.key === "End") to = REACH[1];
  if (to === null) return;
  event.preventDefault();
  steer(clamp(to, REACH[0], REACH[1]));
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 5",
  title: "Self-attention",
  hint: "Hover to slide the query; arrow keys nudge it",
  readout: `q ≈ t3.0 · w₃=0.61 · w₂=0.15`,
  keys: [
    { mark: "lit", label: "Wire + dot: attention weight wᵢ" },
    { mark: "hi", label: "Carriage: the query position q" },
    { mark: "mid", label: "Blocks: the seven tokens (t1..t7)" },
  ],
  caption:
    "Self-attention as a scanner gantry. The bridge carries the query carriage; from it a wire drops to every token, and each wire's thickness, tone and dot show that token's attention weight wᵢ = softmax(−|i−q|·1.4). Park the query over one token and its wire takes the mass (w ≈ 0.61); park it between two and the weight splits between them — the meter on the carriage reads the max.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Self-attention: hover or use arrow keys to move the query" aria-valuemin="0" aria-valuemax="6" aria-valuenow="2">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "self-attention-light.html" : "self-attention.html"),
  k.pageHtml({ title: "Self-attention", theme, body, script: kitScript() + live }));
console.log("wrote", theme === "light" ? "self-attention-light.html" : "self-attention.html");
