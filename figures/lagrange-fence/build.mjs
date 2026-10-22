// Lagrange Fence — 围栏上的最高点 (Day 6: 拉格朗日乘子的几何)
// A stepped contour model of a quadratic hill, a straight fence rail across it,
// and a traveler that slides along the fence.
//
// Mapping:
//   hill steps (20/40/60 contours) -> f(x,y) = 80 - x^2/9 - y^2/4, ellipse contours
//   the straight rail on two posts  -> the constraint g = 0 (a budget line)
//   the traveler + probe            -> a feasible point; the probe reads the height f
//   the alignment rose (two needles)-> grad f (points uphill) and grad g (rail normal):
//                                     they overlap exactly at the tangent point
//   the dot on the rail             -> the tangency point s*: contours touch the fence there
//
// Truth: computed numerically. s* = 0.423, f* = 67.6, |lambda| = 3.34.

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
const HEIGHT = 380;

// ---------- truth ----------
const DEN = 2.4; // hill scale: semi-axes grow by sqrt(DEN) so the fence crosses a wide flank
const HILL = [-38, -6];
const fOf = (x, y) => 80 - ((x - HILL[0]) ** 2 / (9 * DEN) + (y - HILL[1]) ** 2 / (4 * DEN));
const stepOf = (x, y) => {
  const t = (x - HILL[0]) ** 2 / (9 * DEN) + (y - HILL[1]) ** 2 / (4 * DEN);
  return t <= 6 ? 20 : t <= 20 ? 15 : t <= 40 ? 10 : t <= 60 ? 5 : 0;
};
const R0 = [-130, 30], R1 = [98, -40];
const RAIL_LEN = Math.hypot(R1[0] - R0[0], R1[1] - R0[1]);
const DIR = [(R1[0] - R0[0]) / RAIL_LEN, (R1[1] - R0[1]) / RAIL_LEN];
const NRM = [-DIR[1], DIR[0]];
const posAt = (s) => [R0[0] + DIR[0] * RAIL_LEN * s, R0[1] + DIR[1] * RAIL_LEN * s];
const REACH = [0.27, 0.58]; // travel range: the hill flank, f from ~18 up to the tangent point
let S_STAR = 0, F_STAR = 0, LAM = 0;
for (let i = 0; i <= 8000; i++) {
  const s = i / 8000, [x, y] = posAt(s), F = fOf(x, y);
  if (F > F_STAR) {
    F_STAR = F; S_STAR = s;
    const dx = x - HILL[0], dy = y - HILL[1];
    LAM = Math.abs((-2 * dx / (9 * DEN)) * NRM[0] + (-dy / (2 * DEN)) * NRM[1]);
  }
}

// ---------- world layout ----------
const PLATE = { x: -150, y: -76, w: 300, d: 146, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// stepped contour model: full ellipses of rising height, painter outer -> inner
const ELL = (a, b, n = 56) => Array.from({ length: n }, (_, i) => {
  const t = (i / n) * Math.PI * 2;
  return [HILL[0] + a * Math.cos(t), HILL[1] + b * Math.sin(t)];
});
const STEPS = [
  { a: 3 * Math.sqrt(60 * DEN), b: 2 * Math.sqrt(60 * DEN), h: 5, label: "20" },
  { a: 3 * Math.sqrt(40 * DEN), b: 2 * Math.sqrt(40 * DEN), h: 10, label: "40" },
  { a: 3 * Math.sqrt(20 * DEN), b: 2 * Math.sqrt(20 * DEN), h: 15, label: "60" },
  { a: 3 * Math.sqrt(6 * DEN), b: 2 * Math.sqrt(6 * DEN), h: 20, label: "74" },
];
const MAST_H = 13;

// rail
const RAIL_Z = 26;
const RAIL_W = 5;
const POST_R = 2.6;

// traveler (built at s = 0.5, translated along the rail by the live script)
const S_REF = 0.5;
const REF = posAt(S_REF);
const TRAV_Z = RAIL_Z + 3; // on top of the rail
const DIAL_OFF = 7.5;      // dial post offset along the rail normal
const ROSE_OFF = -8;       // alignment rose offset the other way

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [R0[0] - 6, R0[1], 34], [R1[0] + 6, R1[1], 34],
    [REF[0], REF[1], 60], [HILL[0], HILL[1], STEPS[3].h + MAST_H + 3],
  ],
  WIDTH, HEIGHT, { pad: 30, azimuth: 42 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], a[1], 0], P));

// a rotated rectangle ring for the rail and the traveler block
const rectRing = (cx, cy, half, wide, [dx, dy]) => {
  const nx = -dy, ny = dx;
  return [
    [cx + dx * half + nx * wide, cy + dy * half + ny * wide],
    [cx + dx * half - nx * wide, cy + dy * half - ny * wide],
    [cx - dx * half - nx * wide, cy - dy * half - ny * wide],
    [cx - dx * half + nx * wide, cy - dy * half + ny * wide],
  ];
};

// ---------- base ----------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -132, y: PLATE.y + PLATE.d - 15, w: 272, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 8, 5, strip.y + 0.8, 0.6, [1.2, 2.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  return out.join("");
}

// ---------- stepped hill ----------
function hill() {
  const out = [];
  for (const st of STEPS) {
    out.push(S(k.extrude(ELL(st.a, st.b), 0, st.h, P), { tone: st.h === 20 ? "mid" : "lo", crease: "lo" }));
    // The contour value is engraved on the top face of each terrace, on its
    // left shoulder: inside this ring, outside the next (taller) one, and clear
    // of the taller terrace in front of it.
    const lx = HILL[0] - st.a * 0.8, ly = HILL[1] + st.b * 0.5;
    const labelSize = Math.min(5.4, st.h * 1.1);
    out.push(k.faceTextSvg(k.topMatrix([lx - labelSize * 0.62, ly], st.h + 0.2, P, "x"), st.label, { size: labelSize, tone: "hi", anchor: "middle" }));
  }
  // summit mast
  out.push(S(k.cylinder(HILL[0], HILL[1], 1.2, STEPS[3].h, MAST_H, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(HILL[0], HILL[1], 2, STEPS[3].h, 1.6, P, 12), { tone: "mid" }));
  out.push(D([at([HILL[0], HILL[1], STEPS[3].h + MAST_H])], { size: 0.6, tone: "hi" }));
  return out.join("");
}

// ---------- fence rail on two posts ----------
function rail() {
  const out = [];
  // posts at both ends, from the board up past the rail
  for (const [px, py] of [R0, R1]) {
    out.push(S(k.cylinder(px, py, 3.6, 0, 2.2, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(px, py, POST_R, 0, RAIL_Z + 4, P, 20), { tone: "mid", crease: "none" }));
    out.push(L(k.sideArc(px, py, POST_R, 8, P, 12), { tone: "lo" }));
    out.push(D([at([px, py, RAIL_Z + 4])], { size: 0.5, tone: "mid" }));
  }
  // the rail bar itself: a rotated rectangle extruded at RAIL_Z
  const mid = [(R0[0] + R1[0]) / 2, (R0[1] + R1[1]) / 2];
  out.push(S(k.extrude(rectRing(mid[0], mid[1], RAIL_LEN / 2 + 6, RAIL_W / 2, DIR), RAIL_Z, 3, P), { tone: "mid", crease: "lo" }));
  // pickets standing on the rail: this is a fence, not a bar
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    const [px, py] = posAt(t);
    out.push(S(k.cylinder(px, py, 0.85, RAIL_Z + 3, 7, P, 10), { tone: "mid", crease: "none" }));
    out.push(D([at([px, py, RAIL_Z + 10])], { size: 0.4, tone: "lo" }));
  }
  // s* tangency mark: a lit dot on the rail top
  const [tx, ty] = posAt(S_STAR);
  out.push(D([at([tx, ty, RAIL_Z + 3])], { size: 0.62, tone: "lit" }));
  // end caps
  for (const [px, py] of [R0, R1]) {
    out.push(S(k.cylinder(px, py, POST_R + 0.6, RAIL_Z - 0.5, 4, P, 20, 0.5), { tone: "mid" }));
  }
  return out.join("");
}

// ---------- traveler (built at REF, translated live) ----------
function travelerStatic() {
  const out = [];
  const [rx, ry] = REF;
  // block straddling the rail (rotated rectangle)
  out.push(S(k.extrude(rectRing(rx, ry, 6.5, 4.6, DIR), TRAV_Z, 4.5, P), { tone: "hi", crease: "lo" }));
  // bushing dots at the four corners
  const corners = rectRing(rx, ry, 5.4, 3.6, DIR);
  out.push(D(corners.map(([x, y]) => at([x, y, TRAV_Z + 4.5])), { size: 0.42, tone: "lo" }));
  // dial on a short mast, offset along the rail normal
  const dx = rx + NRM[0] * DIAL_OFF, dy = ry + NRM[1] * DIAL_OFF;
  out.push(S(k.cylinder(dx, dy, 1.5, TRAV_Z + 4, 6, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(dx, dy, 9, TRAV_Z + 10, 8, P, 44, 0.7), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(dx, dy, 7, TRAV_Z + 18, P, 44), { tone: "lo" }));
  const ticks = k.radialTicks(dx, dy, 7, 4, 2, TRAV_Z + 18, [1, 2], P, -Math.PI * 0.75, Math.PI * 1.5);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(dx, dy, 1.2, TRAV_Z + 18, P, 12), { tone: "mid" }));
  // alignment rose on the other side: a small disc with two needles (rebuilt live)
  const ax = rx + NRM[0] * ROSE_OFF, ay = ry + NRM[1] * ROSE_OFF;
  out.push(S(k.cylinder(ax, ay, 1.5, TRAV_Z + 4, 4.5, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(ax, ay, 6, TRAV_Z + 8.5, 2.2, P, 36, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(ax, ay, 4.6, TRAV_Z + 10.7, P, 36), { tone: "lo" }));
  return out.join("");
}

// the probe: from the rail down to the terrain (rebuilt per frame, in the translated group)
function probeAt(s) {
  const [rx, ry] = REF;
  const h = stepOf(...posAt(s));
  return S(k.cylinder(rx, ry, 1.5, h, RAIL_Z - h, P, 12), { tone: "hi", crease: "none", lit: true })
    + D([at([rx, ry, h])], { size: 0.55, tone: "lit" });
}

// the rose needles: grad f (uphill) and grad g (rail normal); overlap = tangency
function roseAt(s) {
  const [rx, ry] = REF;
  const ax = rx + NRM[0] * ROSE_OFF, ay = ry + NRM[1] * ROSE_OFF;
  const [px, py] = posAt(s);
  let ux = HILL[0] - px, uy = HILL[1] - py;
  const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
  const z = TRAV_Z + 10.9;
  let out = L(k.lineOnTop([ax + ux * 1.1, ay + uy * 1.1], [ax + ux * 4.4, ay + uy * 4.4], z, P), { tone: "lit", free: "end" });
  out += L(k.lineOnTop([ax + NRM[0] * 1.1, ay + NRM[1] * 1.1], [ax + NRM[0] * 4.4, ay + NRM[1] * 4.4], z, P), { tone: "lo", free: "end" });
  out += D([at([ax, ay, z])], { size: 0.5, tone: "mid" });
  return out;
}

// the dial needle: share of the step height (0..20 -> 0..1)
const needleAt = (share) => {
  const angle = -Math.PI * 0.75 + share * Math.PI * 1.5;
  const x = REF[0] + NRM[0] * DIAL_OFF, y = REF[1] + NRM[1] * DIAL_OFF;
  return k.lineOnTop(
    [x - Math.sin(angle) * 2, y + Math.cos(angle) * 2],
    [x + Math.sin(angle) * 6.2, y - Math.cos(angle) * 6.2],
    TRAV_Z + 18.2, P);
};

// ---------- compose ----------
const s0 = 0.75;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Lagrange multipliers: the best point on the fence is where the hill's contour touches it",
  body: [
    plate(),
    hill(),
    rail(),
    `<g data-part="traveler" transform="${k.translateAlong(P, [posAt(s0)[0] - REF[0], posAt(s0)[1] - REF[1], 0])}">
      <g data-part="probe">${probeAt(s0)}</g>
      ${travelerStatic()}
      <g data-part="rose">${roseAt(s0)}</g>
      <path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(stepOf(...posAt(s0)) / 20)}" style="stroke-width:1"/>
    </g>`,
  ],
});

// ---------- live ----------
const live = `
const P = ${JSON.stringify(P)};
const HILL = ${JSON.stringify(HILL)}, R0 = ${JSON.stringify(R0)}, DIR = ${JSON.stringify(DIR)}, NRM = ${JSON.stringify(NRM)};
const RAIL_LEN = ${RAIL_LEN}, RAIL_Z = ${RAIL_Z}, TRAV_Z = ${TRAV_Z}, REF = ${JSON.stringify(REF)};
const DIAL_OFF = ${DIAL_OFF}, ROSE_OFF = ${ROSE_OFF};
const S_STAR = ${S_STAR}, F_STAR = ${F_STAR.toFixed(2)}, LAM = ${LAM.toFixed(2)};
const posAt = (s) => [R0[0] + DIR[0] * RAIL_LEN * s, R0[1] + DIR[1] * RAIL_LEN * s];
const DEN = ${DEN};
const REACH = ${JSON.stringify(REACH)};
const fOf = (x, y) => 80 - ((x - HILL[0]) ** 2 / (9 * DEN) + (y - HILL[1]) ** 2 / (4 * DEN));
const stepOf = (x, y) => { const t = (x - HILL[0]) ** 2 / (9 * DEN) + (y - HILL[1]) ** 2 / (4 * DEN); return t <= 6 ? 20 : t <= 20 ? 15 : t <= 40 ? 10 : t <= 60 ? 5 : 0; };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const traveler = svg.querySelector('[data-part="traveler"]');
const probe = svg.querySelector('[data-part="probe"]');
const rose = svg.querySelector('[data-part="rose"]');
const needle = svg.querySelector('[data-part="needle"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
function probeAt(s) {
  const h = stepOf(posAt(s)[0], posAt(s)[1]);
  return solidSvg(cylinder(REF[0], REF[1], 1.5, h, RAIL_Z - h, P, 12), { tone: "hi", crease: "none", lit: true })
    + dotsSvg([iso([REF[0], REF[1], h], P)], { size: 0.55, tone: "lit" });
}
function roseAt(s) {
  const rx = REF[0] + NRM[0] * ROSE_OFF, ry = REF[1] + NRM[1] * ROSE_OFF;
  const [px, py] = posAt(s);
  let ux = HILL[0] - px, uy = HILL[1] - py;
  const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
  const z = TRAV_Z + 10.9;
  let out = lineSvg(lineOnTop([rx + ux * 1.1, ry + uy * 1.1], [rx + ux * 4.4, ry + uy * 4.4], z, P), { tone: "lit", free: "end" });
  out += lineSvg(lineOnTop([rx + NRM[0] * 1.1, ry + NRM[1] * 1.1], [rx + NRM[0] * 4.4, ry + NRM[1] * 4.4], z, P), { tone: "lo", free: "end" });
  out += dotsSvg([iso([rx, ry, z], P)], { size: 0.5, tone: "mid" });
  return out;
}
const needleAt = ${needleAt.toString().replace(/k\./g, "")};
let s = ${s0}, target = s, lastText = "";
let frame = 0, last = 0, clock = 0, visible = false, touring = true, idleTimer = 0;
function draw() {
  const [px, py] = posAt(s);
  traveler.setAttribute("transform", translateAlong(P, [px - REF[0], py - REF[1], 0]));
  probe.innerHTML = probeAt(s);
  rose.innerHTML = roseAt(s);
  needle.setAttribute("d", needleAt(stepOf(px, py) / 20));
  const f = fOf(px, py);
  const aligned = Math.abs(s - S_STAR) < 0.022;
  const text = "f = " + f.toFixed(1) + (aligned ? "  \\u00b7  grad f \\u2225 grad g  \\u00b7  lambda = " + LAM : "");
  if (text !== lastText) { readout.textContent = text; lastText = text; }
  stage.setAttribute("aria-valuenow", String(Math.round(s * 100)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1/30) : 1/60;
  last = now;
  if (touring) { clock += dt; const mid = (REACH[0] + REACH[1]) / 2, amp = (REACH[1] - REACH[0]) / 2 - 0.02; target = mid + amp * Math.sin(clock * 0.5); }
  s = still.matches ? target : s + (target - s) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - s) < 0.001) s = target;
  draw();
  const settled = !touring && s === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, REACH[0], REACH[1]); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3500); run(); };
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
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + 0.03;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - 0.03;
  if (event.key === "Home") to = S_STAR;
  if (event.key === "End") to = S_STAR;
  if (to === null) return;
  event.preventDefault();
  steer(clamp(to, REACH[0], REACH[1]));
});
draw();
`;

const body = PLATE_CSS + k.plateHtml({
  fig: "Fig 1",
  title: "Lagrange fence",
  hint: "Hover or arrow keys to slide along the fence; Home jumps to the tangent point",
  readout: `f = ${F_STAR.toFixed(1)}  ·  grad f ∥ grad g  ·  lambda = ${LAM.toFixed(2)}`,
  keys: [
    { mark: "lit", label: "Probe and bright needle: the height f at the traveler" },
    { mark: "raised", label: "Alignment rose: grad f (bright) vs grad g (rail normal)" },
    { mark: "mid", label: "Fence: the constraint; dot marks the tangency point" },
  ],
  caption:
    "A stepped contour model of a hill with a fence rail across it. Sliding along the fence, the height f rises, then falls; the best point is where a contour band just touches the fence. There the alignment rose's two needles overlap: grad f is parallel to grad g, and the ratio lambda is the shadow price of the constraint.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Lagrange fence: slide the traveler along the rail; Home goes to the tangent point" aria-valuemin="0" aria-valuemax="100" aria-valuenow="75">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "lagrange-fence-light.html" : "lagrange-fence.html"),
  k.pageHtml({ title: "Lagrange fence", theme, body, script: kitScript() + live }));
console.log("wrote", theme === "light" ? "lagrange-fence-light.html" : "lagrange-fence.html", "· s* =", S_STAR.toFixed(3), "f* =", F_STAR.toFixed(1), "lambda =", LAM.toFixed(2));
