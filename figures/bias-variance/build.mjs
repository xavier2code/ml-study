// Bias–Variance Trade-off — a beam balance machine.
//
// Mapping:
//   handwheel rotation   -> model complexity s in [0,1]
//   left pan weight      -> bias  = 0.85*(1-s) + 05      (underfitting)
//   right pan weight     -> variance = 0.05 + 0.9*s^2.2  (overfitting)
//   beam tilt            -> proportional to (variance - bias)
//   dial needle          -> total error = bias^2 + variance (U-shaped in s)
//   notch on ruler strip -> argmin of total error (the sweet spot)
//
// The pans hang level from the tilted beam ends; everything moving is
// re-rendered each frame in world coordinates (no group transforms).

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/xavier/.agents/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "/Users/xavier/.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// The kit's plate corners are absolutely positioned (hint bottom-left, readout
// bottom-right, both white-space:nowrap). Long readouts therefore overlap the
// hint, and long hints overflow the card on narrow screens. Give each its own
// line and let the hint wrap.
const PLATE_CSS = `<style>
.iso-plate{padding-bottom:74px}
.iso-plate-corner[data-corner="hint"]{bottom:24px;left:0;right:0;white-space:normal;line-height:1.35}
.iso-plate-corner[data-corner="readout"]{bottom:0;left:0;right:0;text-align:right}
</style>`;

const WIDTH = 620;
const HEIGHT = 430;

// ---------- model ----------
const biasOf = (s) => 0.85 * (1 - s) + 0.05;
const varOf = (s) => 0.05 + 0.9 * Math.pow(s, 2.2);
const totalOf = (s) => biasOf(s) * biasOf(s) + varOf(s);

let TMIN = 1e9, TMAX = 0, S_STAR = 0;
for (let i = 0; i <= 2000; i++) {
  const s = i / 2000, t = totalOf(s);
  if (t < TMIN) { TMIN = t; S_STAR = s; }
  if (t > TMAX) TMAX = t;
}
const S0 = 0.12;

// ---------- world layout ----------
const PLATE = { x: -105, y: -42, w: 210, d: 84, r: 10 };
const PLATE_H = 10, FOOT_H = 5;

// tower
const COL = { x: -5.5, y: -5.5, w: 11, d: 11, r: 0.8 };
const COLLAR_BASE = { x: -9, y: -9, w: 18, d: 18, r: 2 };
const COLLAR_MID = { x: -8, y: -8, w: 16, d: 16, r: 2 };
const HOUSING = { x: -7, y: -7, w: 14, d: 14, r: 1.5 };
const PIVOT_Z = 84;         // beam centreline z
const COL_TOP = 74, HOUSING_TOP = 79;

// beam
const L = 72, W2 = 2.6, H2 = 2.3;
const HOOK_DROP = 2.4;      // chain anchor below beam centreline
const MAX_TILT = 13 * Math.PI / 180;

// pans
const HANG = 20, PAN_R = 15, COL_R = 7.5;

// complexity handwheel (on the base collar front face, y=9)
const WHEEL = [0, 16], WHEEL_R = 7, WHEEL_TOP = 6.0;

// total-error dial (on an arm from the tower, face up)
const DIAL = [0, 18.5], DIAL_R = 11, FACE = 60;

// complexity ruler strip on the base plate
const STRIP = { x: -86, y: 26, w: 172, d: 8, r: 1.5 };
const RU_FROM = -80, RU_TO = 80;
const NOTCH_X = RU_FROM + (RU_TO - RU_FROM) * S_STAR;

// ---------- camera ----------
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [86, 34, 1], [-86, 34, 1],
    [85, 15, 40], [-85, -15, 40],
    [72, 0, PIVOT_Z + 20], [-72, 0, PIVOT_Z + 20],
    [72, 0, PIVOT_Z - 22], [-72, 0, PIVOT_Z - 22],
    [DIAL[0] + DIAL_R, DIAL[1] + DIAL_R, FACE + 2],
    [0, 42, 1],
  ],
  WIDTH, HEIGHT, { pad: 32, azimuth: 42 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ld = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ---------- base plate ----------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(Ld(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(Ld(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  // complexity ruler strip: s = 0 at the left end, 1 at the right
  out.push(S(k.slabOf(STRIP, 0, 0.9, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(RU_FROM, RU_TO, 8, 5, STRIP.y + 0.8, 0.9, [1.2, 2.6], P);
  out.push(Ld(ticks.minor, { tone: "lo" }), Ld(ticks.major, { tone: "mid" }));
  out.push(D([at([RU_FROM - 3.5, STRIP.y + 4, 0.9]), at([RU_TO + 3.5, STRIP.y + 4, 0.9])], { size: 0.45 }));
  // the sweet spot: argmin of total error, marked across the strip
  out.push(Ld(k.lineOnTop([NOTCH_X, 31], [NOTCH_X, 33.8], 0.95, P), { tone: "hi" }));

  // label plate with three rule lines
  const labelPlate = { x: -101, y: 10, w: 26, d: 10, r: 1 };
  out.push(S(k.slabOf(labelPlate, 0, 1, P, 2), { tone: "lo", crease: "none" }));
  for (const yy of [12.5, 15, 17.5]) {
    out.push(Ld(k.lineOnTop([-98, yy], [-78, yy], 1.05, P), { tone: "lo", free: "end" }));
  }
  out.push(D([at([-99.5, 12.5, 1.05]), at([-99.5, 15, 1.05]), at([-99.5, 17.5, 1.05])], { size: 0.4 }));
  return out.join("");
}

// ---------- tower, pivot, dial, handwheel ----------
function tower() {
  const out = [];
  out.push(S(k.slabOf(COLLAR_BASE, 0, 6, P, 6, 1), { tone: "lo" }));
  out.push(S(k.slabOf(COL, 0, COL_TOP, P, 4, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf(COLLAR_MID, 44, 4, P, 6, 0.8), { tone: "mid" }));
  for (const z of [20, 32, 58, 66]) {
    out.push(Ld(k.planOutline(k.insetPlan(COL, 1.2), z, P), { tone: "faint" }));
  }
  out.push(S(k.slabOf(HOUSING, COL_TOP, HOUSING_TOP - COL_TOP, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 2.2, HOUSING_TOP, 3.5, P, 20), { tone: "hi", crease: "lo" }));

  // dial arm (flush on the column front face), drum mounted on its end
  out.push(S(k.slabOf({ x: -3, y: 5.5, w: 6, d: 14, r: 0.8 }, 50, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([-1.5, 8, 53]), at([1.5, 8, 53])], { size: 0.45 }));
  out.push(S(k.cylinder(DIAL[0], DIAL[1], DIAL_R, FACE - 7, 7, P, 64, 0.8), { tone: "mid", crease: "lo" }));
  out.push(Ld(k.knurl(DIAL[0], DIAL[1], DIAL_R, FACE - 4.6, FACE - 0.3, 72, P, 0.3), { tone: "lo" }));
  out.push(Ld(k.ring(DIAL[0], DIAL[1], 10.4, FACE, P, 48), { tone: "lo" }));
  const ticks = k.radialTicks(DIAL[0], DIAL[1], 9.6, 24, 4, FACE, [1.1, 2.4], P, -Math.PI * 0.75, Math.PI * 1.5);
  out.push(Ld(ticks.minor, { tone: "lo" }), Ld(ticks.major, { tone: "mid" }));
  // the minimum-error mark at the start of the sweep
  const sweet = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI * 0.75 - 0.055 + i * (0.11 / 8);
    sweet.push(at([DIAL[0] + Math.sin(a) * 10, DIAL[1] - Math.cos(a) * 10, FACE]));
  }
  out.push(`<path class="iso-line" data-tone="hi" style="stroke-width:1.2" d="${k.pathOf(sweet)}"/>`);
  out.push(Ld(k.ring(DIAL[0], DIAL[1], 1.7, FACE, P, 16), { tone: "mid" }));
  out.push(D([at([DIAL[0], DIAL[1], FACE])], { size: 0.55 }));

  // complexity handwheel on the base collar front face
  out.push(S(k.slabOf({ x: -3, y: 9, w: 6, d: 7, r: 0.8 }, 0, 2.5, P, 3), { tone: "lo", crease: "none" }));
  out.push(S(k.cylinder(WHEEL[0], WHEEL[1], WHEEL_R, 2.5, 3.5, P, 40, 0.5), { tone: "mid" }));
  out.push(Ld(k.knurl(WHEEL[0], WHEEL[1], WHEEL_R, 2.9, 5.7, 44, P, 0.25), { tone: "lo" }));
  out.push(Ld(k.ring(WHEEL[0], WHEEL[1], 1.8, WHEEL_TOP, P, 16), { tone: "mid" }));
  out.push(D([at([WHEEL[0], WHEEL[1], WHEEL_TOP])], { size: 0.5 }));
  // fixed zero index beside the wheel rim (where the marker starts)
  const ia = -Math.PI * 0.75;
  out.push(Ld(k.lineOnTop(
    [WHEEL[0] + Math.sin(ia) * 7.4, WHEEL[1] - Math.cos(ia) * 7.4],
    [WHEEL[0] + Math.sin(ia) * 9.4, WHEEL[1] - Math.cos(ia) * 9.4], WHEEL_TOP - 3, P), { tone: "lo" }));
  return out.join("");
}

// needle: total-error share in [0,1] sweeps -135deg..+135deg
const needleAt = (share) => {
  const angle = -Math.PI * 0.75 + share * Math.PI * 1.5;
  return k.lineOnTop(
    [DIAL[0] + Math.sin(angle) * 1.7, DIAL[1] - Math.cos(angle) * 1.7],
    [DIAL[0] + Math.sin(angle) * 7.6, DIAL[1] - Math.cos(angle) * 7.6],
    FACE + 0.15, P);
};

// ---------- compose ----------
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Fig 2",
  title: "Bias\u2013variance",
  body: [
    plate(),
    `<g data-part="index"></g>`,
    tower(),
    `<g data-part="wheelmark"></g>`,
    `<g data-part="beam"></g>`,
    `<g data-part="panL"></g>`,
    `<g data-part="panR"></g>`,
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="end" style="stroke-width:1.1" d="${needleAt(Math.min(1, Math.max(0, (totalOf(S0) - TMIN) / (TMAX - TMIN))))}"/>`,
  ],
});

// ---------- live script ----------
const live = `
const P = ${JSON.stringify(P)};
const PIVOT_Z = ${PIVOT_Z}, L = ${L}, W2 = ${W2}, H2 = ${H2}, HOOK_DROP = ${HOOK_DROP};
const MAX_TILT = ${MAX_TILT};
const HANG = ${HANG}, PAN_R = ${PAN_R}, COL_R = ${COL_R};
const WHEEL = ${JSON.stringify(WHEEL)}, WHEEL_TOP = ${WHEEL_TOP};
const DIAL = ${JSON.stringify(DIAL)}, FACE = ${FACE};
const RU_FROM = ${RU_FROM}, RU_TO = ${RU_TO};
const TMIN = ${TMIN}, TMAX = ${TMAX};

function biasOf(s){ return 0.85*(1-s)+0.05; }
function varOf(s){ return 0.05+0.9*Math.pow(s,2.2); }

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const beam = svg.querySelector('[data-part="beam"]');
const panL = svg.querySelector('[data-part="panL"]');
const panR = svg.querySelector('[data-part="panR"]');
const needle = svg.querySelector('[data-part="needle"]');
const wheelmark = svg.querySelector('[data-part="wheelmark"]');
const index = svg.querySelector('[data-part="index"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v,lo,hi)=>Math.min(hi,Math.max(lo,v));

// point on the tilted beam: u along it, dy lateral, dz along its normal
function pt(u, dy, dz, ct, st){
  return [u*ct - dz*st, dy, PIVOT_Z + u*st + dz*ct];
}
function beamHTML(t){
  const ct = Math.cos(t), st = Math.sin(t);
  const q = (a,b,c,d)=>pathOf([iso(a,P),iso(b,P),iso(c,P),iso(d,P)],true);
  const tFL=pt(-L,W2,H2,ct,st), tFR=pt(L,W2,H2,ct,st), tBR=pt(L,-W2,H2,ct,st), tBL=pt(-L,-W2,H2,ct,st);
  const bFR=pt(L,W2,-H2,ct,st), bFL=pt(-L,W2,-H2,ct,st), bBR=pt(L,-W2,-H2,ct,st);
  let out = '<path class="iso-shape" data-tone="mid" d="'+q(tFL,tFR,tBR,tBL)+'"/>';           // top
  out += '<path class="iso-shape" data-tone="lo" d="'+q(tFL,tFR,bFR,bFL)+'"/>';               // front
  out += '<path class="iso-shape" data-tone="lo" d="'+q(tFR,tBR,bBR,bFR)+'"/>';               // right end
  const h = 3.6;
  const gFL=pt(-h,h,h,ct,st), gFR=pt(h,h,h,ct,st), gBR=pt(h,-h,h,ct,st), gBL=pt(-h,-h,h,ct,st);
  const gbFR=pt(h,h,-h,ct,st), gbFL=pt(-h,h,-h,ct,st), gbBR=pt(h,-h,-h,ct,st);
  out += '<path class="iso-shape" data-tone="mid" d="'+q(gFL,gFR,gBR,gBL)+'"/>';              // hub top
  out += '<path class="iso-shape" data-tone="lo" d="'+q(gFL,gFR,gbFR,gbFL)+'"/>';             // hub front
  out += '<path class="iso-shape" data-tone="lo" d="'+q(gFR,gBR,gbBR,gbFR)+'"/>';             // hub right
  for (const side of [-1,1]) {                                                                // hanging hooks
    const u = side*(L-0.8);
    const a=pt(u-1.1,W2,-H2,ct,st), b=pt(u+1.1,W2,-H2,ct,st), c=pt(u+1.1,W2,-H2-2.2,ct,st), d=pt(u-1.1,W2,-H2-2.2,ct,st);
    out += '<path class="iso-shape" data-tone="lo" d="'+q(a,b,c,d)+'"/>';
  }
  out += lineSvg(pathOf([iso(tFL,P),iso(tFR,P),iso(bFR,P),iso(bFL,P)],true), {tone:"lo"});
  out += lineSvg(pathOf([iso(tFR,P),iso(tBR,P),iso(bBR,P),iso(bFR,P),iso(tFR,P)]), {tone:"lo"});
  return out;
}
function panHTML(side, t, err){
  const ct = Math.cos(t), st = Math.sin(t);
  const anchor = pt(side*(L-0.8), 0, -H2-HOOK_DROP, ct, st);
  const panX = anchor[0], panTop = anchor[2] - HANG;
  let out = solidSvg(cylinder(panX, 0, PAN_R, panTop-3, 3, P, 40, 0.6), {tone:"mid"});
  out += lineSvg(ring(panX, 0, PAN_R-1.6, panTop, P, 32), {tone:"lo"});
  out += faceTextSvg(topMatrix([panX+3, 11.3], panTop+0.2, P, "x"), side<0?"bias":"var", {size:2.8, tone:"lo", anchor:"middle"});
  const hgt = 1.2 + err*16.8;
  out += solidSvg(cylinder(panX, 0, COL_R, panTop, hgt, P, 28, 0.5), {tone:"hi", crease:"lo"});
  const n = Math.floor(hgt/3.4);
  const tv = towardViewer(P), faceA = Math.atan2(tv[1], tv[0]);
  for (let i=1;i<=n;i++) {
    const z = panTop+i*3.4;
    const pts = [];
    for (let j=0;j<=18;j++) {
      const a = faceA - Math.PI/2 + (j/18)*Math.PI;
      pts.push(iso([panX + COL_R*Math.cos(a), COL_R*Math.sin(a), z], P));
    }
    out += fadeLineSvg(pts, {fade:[99,99], tone:"lo"});
  }
  out += dotsSvg([iso([panX, 0, panTop+hgt+0.01],P)], {size:0.55, tone:"mid"});
  const rims = [90,210,330].map((deg)=>{const r=deg*Math.PI/180; return [panX+Math.cos(r)*PAN_R*0.94, Math.sin(r)*PAN_R*0.94, panTop];});
  for (const rp of rims) out += lineSvg(pathOf([iso(anchor,P), iso(rp,P)]), {tone:"lo"});
  out += dotsSvg([iso(anchor,P)], {size:0.7, tone:"mid"});
  out += dotsSvg(rims.map((rp)=>iso(rp,P)), {size:0.45, tone:"mid"});
  return out;
}
function wheelMarkHTML(s){
  const a = -Math.PI*0.75 + s*Math.PI*1.5;
  return lineSvg(lineOnTop(
    [WHEEL[0]+Math.sin(a)*1.8, WHEEL[1]-Math.cos(a)*1.8],
    [WHEEL[0]+Math.sin(a)*6.2, WHEEL[1]-Math.cos(a)*6.2], WHEEL_TOP+0.1, P), {tone:"hi", free:"end"});
}
function indexHTML(s){
  const x = RU_FROM + s*(RU_TO-RU_FROM);
  return dotsSvg([iso([x, 30.2, 1.4],P)], {size:0.8, tone:"hi"});
}
const needleAt = ${needleAt.toString().replace(/k\./g, "")};
function draw(){
  const b = biasOf(s), v = varOf(s), tot = b*b+v;
  const t = (b-v)/0.9 * MAX_TILT;  // the heavier error sinks its pan
  beam.innerHTML = beamHTML(t);
  wheelmark.innerHTML = wheelMarkHTML(s);
  index.innerHTML = indexHTML(s);
  panL.innerHTML = panHTML(-1, t, b);
  panR.innerHTML = panHTML(1, t, v);
  const norm = clamp((tot-TMIN)/(TMAX-TMIN), 0, 1);
  needle.setAttribute("d", needleAt(norm));
  const text = "s "+s.toFixed(2)+" \\u00b7 bias "+b.toFixed(2)+" \\u00b7 var "+v.toFixed(2)+" \\u00b7 total "+tot.toFixed(2);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(s*100)));
  stage.setAttribute("aria-valuetext", text);
}
let s = ${S0}, target = s;
let frame = 0, last = 0, visible = false, touring = true, clock = 0, idleTimer = 0;
function tick(now){
  const dt = last ? Math.min((now-last)/1000, 1/30) : 1/60;
  last = now;
  if (touring) { clock += dt; target = (1-Math.cos(clock*0.5))*0.5; }
  s = still.matches ? target : s + (target-s)*(1-Math.exp(-dt/0.35));
  if (Math.abs(target-s) < 0.001) s = target;
  draw();
  const settled = !touring && s === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, 0, 1); clearTimeout(idleTimer); idleTimer = setTimeout(()=>{ touring = !still.matches; clock = 0; run(); }, 3500); run(); };
new IntersectionObserver((entries)=>{ visible = entries[entries.length-1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(clamp((event.clientX - box.left) / box.width, 0, 1));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + 0.04;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - 0.04;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = 1;
  if (to === null) return;
  event.preventDefault();
  steer(clamp(to, 0, 1));
});
draw();
`;

const body = PLATE_CSS + k.plateHtml({
  fig: "Fig 2",
  title: "Bias\u2013variance",
  hint: "Hover to turn the wheel \u00b7 arrow keys nudge complexity",
  readout: `s ${S0.toFixed(2)} \u00b7 bias ${biasOf(S0).toFixed(2)} \u00b7 var ${varOf(S0).toFixed(2)} \u00b7 total ${totalOf(S0).toFixed(2)}`,
  keys: [
    { mark: "lit", label: "Needle: total error = bias\u00b2 + variance" },
    { mark: "raised", label: "Pans carry the bias weight and the variance weight" },
    { mark: "mid", label: "Handwheel: model complexity s" },
  ],
  caption:
    "A beam balance weighs bias against variance. The handwheel sets model complexity s; the left pan carries the bias weight 0.85(1\u2212s)+0.05 and the right pan the variance weight 0.05+0.9s\u00b7\u00b2\u00b7\u00b2, so rising complexity lifts the bias pan and sinks the variance pan. The dial needle reads the total error bias\u00b2+variance \u2014 it dips to its minimum at the notch on the scale, the sweet spot between under- and overfitting.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Bias\u2013variance trade-off: hover or use arrow keys to set model complexity" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(S0 * 100)}">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "bias-variance-light.html" : "bias-variance.html"),
  k.pageHtml({ title: "Bias\u2013variance trade-off", theme, body, script: kitScript() + live }));
console.log("wrote", theme === "light" ? "bias-variance-light.html" : "bias-variance.html",
  "| TMIN", TMIN.toFixed(3), "at s*", S_STAR.toFixed(3), "| TMAX", TMAX.toFixed(3));
