// Entropy Gauge — 熵测量台 (Day 1: 熵的物理比喻)
// A U-tube (communicating vessel) + valve hand-wheel + dial.
//
// Mapping:
//   valve wheel rotation  -> the coin's bias p (heads probability, 0.05..0.95)
//   liquid columns L/R    -> P(heads) = p and P(tails) = 1-p  (total is conserved)
//   dial needle           -> H(p) = -p·log2 p - (1-p)·log2(1-p), 0..1 bit
//   levels sum is constant: probability mass is conserved; it only shifts sides.
//
// Truth: H(p) computed per frame; liquid heights 4+p*40 and 4+(1-p)*40 sum to 48.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/xavier/.agents/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "/Users/xavier/.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 620;
const HEIGHT = 380;

// ---------- world layout ----------
const PLATE = { x: -132, y: -66, w: 264, d: 132, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// U-tube: two glass columns on a transfer block
const TUBE = [
  { cx: -78, cy: -30, tag: "H" },
  { cx: -34, cy: -30, tag: "T" },
];
const TUBE_R = 8;
const LIQ_R = 5.5;
const BLOCK = { x: -88, y: -40, w: 64, d: 20, r: 3 };  // transfer channel under both tubes
const BLOCK_TOP = 9;
const FLANGE_H = 5;               // base collar where glass meets block
const LIQ_BASE = BLOCK_TOP + FLANGE_H;   // liquid starts on top of flange
const LIQ_SPAN = 40;              // p*40 + (1-p)*40 = 40, conserved
const TUBE_TOP = LIQ_BASE + LIQ_SPAN + 6;

// valve hand-wheel (front, between viewer and the block)
const VALVE = [-56, 8];
const VALVE_STEM_H = 12;
const VALVE_R = 9.5;

// dial indicator (right)
const DIAL = [64, -4];
const DIAL_R = 21;
const DIAL_Z = 56;
const DIAL_H = 10;
const DIAL_TOP = DIAL_Z + DIAL_H;

// retort yoke holding the glass tops (behind the tubes)
const YOKE_Z = TUBE_TOP + 4;

const P0 = 0.9; // rest pose

const Hp = (p) => -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
const liqH = (p) => 4 + p * LIQ_SPAN;

// ---------- camera ----------
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [TUBE[0].cx - TUBE_R, TUBE[0].cy, YOKE_Z + 3],
    [DIAL[0] + DIAL_R + 2, 0, DIAL_TOP + 2],
    [VALVE[0] + VALVE_R + 4, VALVE[1] + 4, VALVE_STEM_H + 6],
  ],
  WIDTH, HEIGHT, { pad: 30, azimuth: 42 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], a[1], 0], P));

// ---------- base ----------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -114, y: PLATE.y + PLATE.d - 15, w: 236, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 8, 5, strip.y + 0.8, 0.6, [1.2, 2.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // label plate beside the valve
  const label = { x: -104, y: -2, w: 22, d: 12, r: 2 };
  out.push(S(k.slabOf(label, 0, 1.6, P, 3, 0.3), { tone: "lo" }));
  out.push(L([0, 1.4].map((o) => k.lineOnTop([label.x + 2, label.y + 3 + o], [label.x + label.w - 2, label.y + 3 + o], 1.8, P)).join(""), { tone: "lo", free: "both" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + label.w / 2 - 2.2, label.y + 6.4], 1.8, P, "x"), "p", { size: 3.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}

// ---------- U-tube: transfer block, flanges, glass outlines, yoke ----------
function block() {
  const out = [];
  out.push(S(k.slabOf(BLOCK, 0, BLOCK_TOP, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BLOCK, 3), BLOCK_TOP, P), { tone: "lo" }));
  out.push(D(k.corners(BLOCK, 4).map(([x, y]) => at([x, y, BLOCK_TOP])), { size: 0.4 }));
  // the channel that connects the two columns: a groove line edge to edge
  out.push(L(k.lineOnTop([TUBE[0].cx, BLOCK.y + BLOCK.d / 2], [TUBE[1].cx, BLOCK.y + BLOCK.d / 2], BLOCK_TOP, P), { tone: "lo" }));
  for (const t of TUBE) {
    out.push(S(k.cylinder(t.cx, t.cy, TUBE_R + 1.4, BLOCK_TOP - 1, FLANGE_H + 1, P, 32, 0.6), { tone: "mid" }));
    out.push(L(k.ring(t.cx, t.cy, TUBE_R, BLOCK_TOP + FLANGE_H, P, 32), { tone: "lo" }));
    // engraved tag plate on the block front face, under each column
    out.push(k.faceTextSvg(k.topMatrix([t.cx - 2.2, t.cy + 13.5], BLOCK_TOP, P, "x"), t.tag, { size: 3.2, tone: "lo", anchor: "middle" }));
  }
  return out.join("");
}

function glass() {
  // outlines only: the liquid is drawn before, glass reads through its lines.
  // every arc sits at a height where its ends land on a ring at the same radius.
  const out = [];
  for (const t of TUBE) {
    out.push(L(k.ring(t.cx, t.cy, TUBE_R, TUBE_TOP, P, 40), { tone: "lo" }));
    out.push(L(k.sideArc(t.cx, t.cy, TUBE_R, TUBE_TOP, P, 28), { tone: "faint" }));
    out.push(L(k.sideArc(t.cx, t.cy, TUBE_R, BLOCK_TOP + FLANGE_H, P, 28), { tone: "faint" }));
  }
  return out.join("");
}

function yoke() {
  const out = [];
  // two rear posts and a cross bar that collars both glass tops
  const posts = [[TUBE[0].cx - 14, -46], [TUBE[1].cx + 14, -46]];
  for (const [x, y] of posts) {
    out.push(S(k.cylinder(x, y, 2.2, 0, YOKE_Z, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 3.2, 0, 2.4, P, 20), { tone: "mid" }));
    out.push(L(k.sideArc(x, y, 2.2, YOKE_Z - 0.5, P, 12), { tone: "lo" }));
  }
  const bar = { x: posts[0][0] - 3, y: -48, w: posts[1][0] - posts[0][0] + 6, d: 4, r: 1 };
  out.push(S(k.slabOf(bar, YOKE_Z, 3, P, 4, 0.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(bar, 1.2), YOKE_Z + 3, P), { tone: "lo" }));
  for (const t of TUBE) {
    // collar: a small block that clamps the tube, sitting on the bar
    out.push(S(k.slabOf({ x: t.cx - 6, y: -34, w: 12, d: 9, r: 2 }, YOKE_Z - 4.5, 8, P, 4, 0.5), { tone: "mid" }));
    out.push(D([at([t.cx - 4, -27.5, YOKE_Z + 3.5]), at([t.cx + 4, -27.5, YOKE_Z + 3.5])], { size: 0.45 }));
  }
  return out.join("");
}

// ---------- valve hand-wheel ----------
// spokes are rebuilt per frame (floor-plane rotation): group data-part="spokes"
function valveStatic() {
  const out = [];
  const [vx, vy] = VALVE;
  // pedestal + stem
  out.push(S(k.cylinder(vx, vy, 4.4, 0, 2.4, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(vx, vy, 2.2, 2.4, VALVE_STEM_H - 2.4, P, 20), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(vx, vy, 2.2, VALVE_STEM_H - 3, P, 12), { tone: "lo" }));
  // the disc
  out.push(S(k.cylinder(vx, vy, VALVE_R, VALVE_STEM_H, 3, P, 48, 0.7), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(vx, vy, VALVE_R - 1.6, VALVE_STEM_H + 3, P, 48), { tone: "lo" }));
  // scale arc on the plate around the wheel: p 0.05..0.95 sweeps 270°, 0.5 at top
  const arcR = VALVE_R + 5.5;
  const arcFrom = -Math.PI * 1.25 + Math.PI / 36, arcSpan = Math.PI * 1.5 - Math.PI / 18;
  const arcPts = [];
  for (let i = 0; i <= 32; i++) {
    const a = arcFrom + (arcSpan * i) / 32;
    arcPts.push([vx + Math.sin(a) * arcR, vy - Math.cos(a) * arcR]);
  }
  out.push(L(k.onTop(arcPts, 0.4, P), { tone: "lo" }));
  out.push(D([at(arcPts[0]), at(arcPts[arcPts.length - 1])], { size: 0.45 }));
  const ticks = k.radialTicks(vx, vy, arcR, 9, 4, 0.4, [1.1, 2.2], P, arcFrom, arcSpan);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([vx, vy - arcR, 0.4])], { size: 0.5, tone: "hi" })); // index dot at p=0.5, on the arc
  out.push(k.faceTextSvg(k.topMatrix([vx - 2, vy - arcR - 5], 0.4, P, "x"), "0.5", { size: 2.2, tone: "lo", anchor: "middle" }));
  return out.join("");
}

function spokesAt(p) {
  const [vx, vy] = VALVE;
  const base = -(p - 0.5) * Math.PI * 1.5; // p=0.5 -> spokes at 0/90/180/270
  let d = L(k.ring(vx, vy, 1.9, VALVE_STEM_H + 3, P, 16), { tone: "lo" });
  for (let i = 0; i < 4; i++) {
    const a = base + (i * Math.PI) / 2;
    d += L(k.lineOnTop([vx + Math.sin(a) * 1.9, vy - Math.cos(a) * 1.9], [vx + Math.sin(a) * (VALVE_R - 1.6), vy - Math.cos(a) * (VALVE_R - 1.6)], VALVE_STEM_H + 3, P), { tone: i === 0 ? "lit" : "mid" });
  }
  d += D([at([vx, vy, VALVE_STEM_H + 3])], { size: 0.6, tone: "hi" });
  return d;
}

// ---------- dial ----------
function dial() {
  const out = [];
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, 3.4, 0, DIAL_Z - 6, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 4.6, DIAL_Z - 6, 2, P, 24), { tone: "mid" }));
  out.push(L(k.sideArc(x, y, 3.4, DIAL_Z - 12, P, 12), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3.4, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 10, 5, DIAL_TOP, [1.3, 2.8], P, -Math.PI * 0.75, Math.PI * 1.5);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.6, DIAL_TOP, P, 16), { tone: "mid" }));
  // full-scale mark at 1 bit (fair coin): a hi tick just outside the ring
  out.push(L(k.lineOnTop([x + Math.sin(Math.PI * 0.75) * (DIAL_R - 3), y - Math.cos(Math.PI * 0.75) * (DIAL_R - 3)], [x + Math.sin(Math.PI * 0.75) * (DIAL_R - 6.5), y - Math.cos(Math.PI * 0.75) * (DIAL_R - 6.5)], DIAL_TOP, P), { tone: "hi" }));
  // engraved: 0 / 1 bit at the ends, H in the middle
  const numAt = (share, text) => {
    const a = -Math.PI * 0.75 + share * Math.PI * 1.5;
    return k.faceTextSvg(k.topMatrix([x + Math.sin(a) * (DIAL_R - 9) - 1.8, y - Math.cos(a) * (DIAL_R - 9)], DIAL_TOP, P, "x"), text, { size: 2.6, tone: "lo", anchor: "middle" });
  };
  out.push(numAt(0, "0"), numAt(1, "1"), numAt(0.5, "H"));
  out.push(k.faceTextSvg(k.topMatrix([x - 2, y + DIAL_R - 4], DIAL_TOP, P, "x"), "bit", { size: 2.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const needleAt = (share) => {
  const angle = -Math.PI * 0.75 + share * Math.PI * 1.5;
  const [x, y] = DIAL;
  return k.lineOnTop(
    [x - Math.sin(angle) * 3.4, y + Math.cos(angle) * 3.4],
    [x + Math.sin(angle) * (DIAL_R - 2.6), y - Math.cos(angle) * (DIAL_R - 2.6)],
    DIAL_TOP + 0.2, P);
};

// ---------- liquid (live) ----------
function liquidAt(p) {
  const out = [];
  for (let i = 0; i < 2; i++) {
    const t = TUBE[i];
    const h = liqH(i === 0 ? p : 1 - p);
    out.push(S(k.cylinder(t.cx, t.cy, LIQ_R, LIQ_BASE, h, P, 28), { tone: "hi", crease: "lo" }));
    out.push(D([at([t.cx, t.cy, LIQ_BASE + h])], { size: 0.55, tone: "lit" }));
  }
  return out.join("");
}

// ---------- compose ----------
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Entropy gauge: a U-tube and dial that measure a coin's uncertainty in bits",
  body: [
    plate(),
    yoke(),
    block(),
    `<g data-part="liquid">${liquidAt(P0)}</g>`,
    glass(),
    valveStatic(),
    `<g data-part="spokes">${spokesAt(P0)}</g>`,
    dial(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(Hp(P0))}" style="stroke-width:1.1"/>`,
  ],
});

// ---------- live script ----------
const live = `
const P = ${JSON.stringify(P)};
const TUBE = ${JSON.stringify(TUBE.map(t => [t.cx, t.cy]))};
const LIQ_R = ${LIQ_R}, LIQ_BASE = ${LIQ_BASE}, LIQ_SPAN = ${LIQ_SPAN};
const VALVE = ${JSON.stringify(VALVE)}, VALVE_R = ${VALVE_R}, VALVE_TOP = ${VALVE_STEM_H + 3};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP};
const REACH = [0.05, 0.95];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const Hp = (p) => -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const liquid = svg.querySelector('[data-part="liquid"]');
const spokes = svg.querySelector('[data-part="spokes"]');
const needle = svg.querySelector('[data-part="needle"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let p = ${P0}, target = p;
function liquidAt(p) {
  const out = [];
  for (let i = 0; i < 2; i++) {
    const [cx, cy] = TUBE[i];
    const h = 4 + (i === 0 ? p : 1 - p) * LIQ_SPAN;
    out.push(solidSvg(cylinder(cx, cy, LIQ_R, LIQ_BASE, h, P, 28), { tone: "hi", crease: "lo" }));
    out.push(dotsSvg([iso([cx, cy, LIQ_BASE + h], P)], { size: 0.55, tone: "lit" }));
  }
  return out.join("");
}
function spokesAt(p) {
  const [vx, vy] = VALVE;
  const base = -(p - 0.5) * Math.PI * 1.5;
  let d = lineSvg(ring(vx, vy, 1.9, VALVE_TOP, P, 16), { tone: "lo" });
  for (let i = 0; i < 4; i++) {
    const a = base + i * Math.PI / 2;
    d += lineSvg(lineOnTop([vx + Math.sin(a) * 1.9, vy - Math.cos(a) * 1.9], [vx + Math.sin(a) * (VALVE_R - 1.6), vy - Math.cos(a) * (VALVE_R - 1.6)], VALVE_TOP, P), { tone: i === 0 ? "lit" : "mid" });
  }
  return d + dotsSvg([iso([vx, vy, VALVE_TOP], P)], { size: 0.6, tone: "hi" });
}
const needleAt = ${needleAt.toString().replace(/k\./g, "")};
function draw() {
  const h = Hp(p);
  liquid.innerHTML = liquidAt(p);
  spokes.innerHTML = spokesAt(p);
  needle.setAttribute("d", needleAt(h));
  const text = "p = " + p.toFixed(2) + "  \\u00b7  H = " + h.toFixed(2) + " bit";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(p * 100)));
  stage.setAttribute("aria-valuetext", text);
}
let frame = 0, last = 0, visible = false, touring = true, clock = 0, idleTimer = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1/30) : 1/60;
  last = now;
  if (touring) { clock += dt; target = 0.5 + 0.45 * Math.sin(clock * 0.5); }
  p = still.matches ? target : p + (target - p) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - p) < 0.001) p = target;
  draw();
  const settled = !touring && p === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, REACH[0], REACH[1]); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = Math.asin ? Math.asin((target - 0.5) / 0.45) / 0.5 : 0; run(); }, 3500); run(); };
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
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + 0.05;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - 0.05;
  if (event.key === "Home") to = 0.5;
  if (event.key === "End") to = 0.95;
  if (to === null) return;
  event.preventDefault();
  steer(Math.round(clamp(to, REACH[0], REACH[1]) * 20) / 20);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Entropy gauge",
  hint: "Hover or arrow keys to bias the coin",
  readout: `p = ${P0.toFixed(2)}  ·  H = ${Hp(P0).toFixed(2)} bit`,
  keys: [
    { mark: "lit", label: "Dial needle: the coin's uncertainty H(p)" },
    { mark: "raised", label: "Liquid columns: P(heads) and P(tails), total conserved" },
    { mark: "mid", label: "Valve wheel: sets the bias p" },
  ],
  caption:
    "A U-tube and dial that measure a coin's uncertainty in bits. The valve wheel sets the coin's bias p; the two liquid columns show the probability mass of heads and tails (their sum is constant); the dial reads the entropy H(p). Level columns pin the needle at 1 bit; push all the liquid to one side and it falls to 0.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Entropy gauge: hover or arrow keys to set the coin bias p" aria-valuemin="5" aria-valuemax="95" aria-valuenow="90">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "entropy-gauge-light.html" : "entropy-gauge.html"),
  k.pageHtml({ title: "Entropy gauge", theme, body, script: kitScript() + live }));
console.log("wrote", theme === "light" ? "entropy-gauge-light.html" : "entropy-gauge.html");
