// CNN Convolution — sliding stamp jig
//
// A gantry rides two rails over an etched 8x5 input grid; it carries a 3x3
// stamp (square frame, nine pins = the kernel, all weights 1). The stamp
// slides along x and always covers grid columns [pos, pos+2] over rows 1..3.
// An output strip along the front edge holds 6 cells, one per window
// position; the cell under the current detent lights with the conv result
// = sum of the 9 covered values / max over the 6 positions.
//
// Mapping:
//   etched grid + dots      -> input feature map (vertical stripe pattern)
//   9-pin stamp             -> 3x3 kernel, all weights 1.0
//   gantry x / rail detents -> stride-1 window position (0..5)
//   output strip cells      -> output feature map (6 cells)
//   dot radius / tone       -> cell value

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
const HEIGHT = 400;

// ---------- model (truth first) ----------
const COLS = 8, ROWS = 5, CELL = 15;
const GX = -60, GY = -66;                 // grid corner (cols 0..7, rows 0..4)
const ROW0 = 1;                           // stamp covers rows 1..3
const VAL = (c) => (c === 3 || c === 4 ? 1.0 : c === 2 || c === 5 ? 0.5 : 0.1);
const WINDOWS = COLS - 3 + 1;             // 6
const sums = Array.from({ length: WINDOWS }, (_, p) =>
  3 * (VAL(p) + VAL(p + 1) + VAL(p + 2)));
const maxSum = Math.max(...sums);
const NORM = sums.map((s) => s / maxSum); // [0.28, 0.64, 1, 1, 0.64, 0.28]
const wxFor = (p) => GX + p * CELL;       // window left edge (world x)
const START = 2;

// ---------- world layout ----------
const PLATE = { x: -128, y: -92, w: 256, d: 132, r: 8 };
const PLATE_H = 12, FOOT_H = 5;
const RAIL_BACK_Y = -76, RAIL_FRONT_Y = 14, RAIL_D = 5;
const RAIL_Z = 38, RAIL_H = 6;            // rails z 38..44
const RAIL_X0 = -92, RAIL_X1 = 92;
const POST_X = [RAIL_X0 - 2, RAIL_X1 + 2];
const BUSH_Z = 44, BUSH_H = 7;            // bushings z 44..51
const CARR_Z = 51, CARR_H = 5;            // carriage z 51..56
const KNOB_Z = 56, KNOB_H = 5;
const FRAME_Z = 18, FRAME_H = 8;          // stamp frame z 18..26
const PIN_Z = 2, PIN_H = 16;              // pins z 2..18
const ROD_R = 1.1, ROD_Z0 = 26, ROD_Z1 = CARR_Z;
const FRAME_M = 4;                        // frame bar width
const FY0 = GY + ROW0 * CELL - FRAME_M;   // -55 frame outer top
const FY1 = GY + (ROW0 + 3) * CELL + FRAME_M; // -2 frame outer bottom
const STRIP = { x: -63, y: 17, w: 96, d: 18, r: 3 };
const STRIP_Z = 3;
const LABEL = { x: 38, y: 19, w: 20, d: 14, r: 2 };

// ---------- camera ----------
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [RAIL_X0, RAIL_BACK_Y, RAIL_Z + RAIL_H],
    [RAIL_X1, RAIL_FRONT_Y, RAIL_Z + RAIL_H],
    [wxFor(START) - FRAME_M - 4, FY0, KNOB_Z + KNOB_H + 2],
    [wxFor(5) + 3 * CELL + FRAME_M + 4, FY0, KNOB_Z + KNOB_H + 2],
    [wxFor(5) + 3 * CELL + 4, FY1, FRAME_Z],
    [STRIP.x + STRIP.w, STRIP.y + STRIP.d, STRIP_Z],
  ],
  WIDTH, HEIGHT, { pad: 32, azimuth: 42 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const shape = (d, tone, extra = "") =>
  `<path class="iso-shape" data-tone="${tone}"${extra} d="${d}"/>`;

// ---------- base ----------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H + FOOT_H, P)}"/>`];
  for (const [x, y] of k.corners(PLATE, 22)) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// ---------- input grid: etched recessed cells + value dots ----------
function grid() {
  const fills = [], edges = [];
  const dots = { hi: [], mid: [], lo: [] };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = { x: GX + c * CELL + 0.8, y: GY + r * CELL + 0.8, w: CELL - 1.6, d: CELL - 1.6, r: 0.8 };
      fills.push(k.onTop(k.roundedPlan(cell, 4), -1.2, P, true));
      edges.push(k.planOutline(cell, 0, P, 4));
      const v = VAL(c);
      dots[v === 1 ? "hi" : v === 0.5 ? "mid" : "lo"].push(
        at([GX + c * CELL + CELL / 2, GY + r * CELL + CELL / 2, -1.2]));
    }
  }
  const rim = { x: GX - 4.5, y: GY - 4.5, w: COLS * CELL + 9, d: ROWS * CELL + 9, r: 2 };
  return [
    L(k.planOutline(rim, 0, P), { tone: "lo" }),
    shape(fills.join(""), "lo"),
    L(edges.join(""), { tone: "faint" }),
    D(dots.lo, { size: 0.7 + 1.9 * 0.1 }),
    D(dots.mid, { size: 0.7 + 1.9 * 0.5 }),
    D(dots.hi, { size: 0.7 + 1.9 * 1.0 }),
  ].join("");
}

// ---------- gantry frame: posts, rails, bumpers, ruler, detents ----------
function gantryFrame() {
  const out = [];
  for (const px of POST_X) {
    for (const py of [RAIL_BACK_Y, RAIL_FRONT_Y]) {
      out.push(S(k.cylinder(px, py, 4.5, 0, 2, P, 24), { tone: "lo" }));
      out.push(S(k.cylinder(px, py, 3, 2, RAIL_Z - 2, P, 20), { tone: "mid" }));
      out.push(L(k.sideArc(px, py, 3, RAIL_Z - 6, P, 10), { tone: "lo" }));
      out.push(D([at([px, py, RAIL_Z - 2])], { size: 0.45 }));
    }
  }
  for (const ry of [RAIL_BACK_Y, RAIL_FRONT_Y]) {
    const rail = { x: RAIL_X0, y: ry - RAIL_D / 2, w: RAIL_X1 - RAIL_X0, d: RAIL_D, r: 2 };
    out.push(S(k.slabOf(rail, RAIL_Z, RAIL_H, P, 4, 1), { tone: "mid" }));
    for (const bx of [RAIL_X0 + 65, RAIL_X1 - 71]) { // end-stop bumpers
      out.push(S(k.slabOf({ x: bx, y: ry - 5.5, w: 6, d: 11, r: 1 }, RAIL_Z + RAIL_H, 4, P, 3, 0.6), { tone: "lo" }));
      out.push(D([at([bx + 3, ry, RAIL_Z + RAIL_H + 4])], { size: 0.45 }));
    }
  }
  // column ruler etched on the back rail top
  const ticks = k.topTicks(GX, GX + COLS * CELL, CELL, 4, RAIL_BACK_Y - 2.2, RAIL_Z + RAIL_H, [1.2, 2.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // six detents on the front rail top (one per window position)
  let det = "";
  for (let p = 0; p < WINDOWS; p++) {
    const dx = wxFor(p) + 1.5 * CELL;
    det += k.ring(dx, RAIL_FRONT_Y, 1.5, RAIL_Z + RAIL_H, P, 12);
  }
  out.push(L(det, { tone: "lo" }));
  out.push(D(Array.from({ length: WINDOWS }, (_, p) =>
    at([wxFor(p) + 1.5 * CELL, RAIL_FRONT_Y, RAIL_Z + RAIL_H])), { size: 0.5 }));
  return out.join("");
}

// ---------- output strip + label plate ----------
function outputStrip() {
  const out = [];
  out.push(S(k.slabOf(STRIP, 0, STRIP_Z, P, 4, 0.8), { tone: "mid" }));
  const fills = [], edges = [];
  const dots = { hi: [], mid: [], lo: [] };
  let ticks = "";
  for (let p = 0; p < WINDOWS; p++) {
    const cell = { x: wxFor(p) + 1, y: STRIP.y + 2.5, w: CELL - 2, d: CELL - 2, r: 1 };
    fills.push(k.onTop(k.roundedPlan(cell, 4), STRIP_Z - 0.8, P, true));
    edges.push(k.planOutline(cell, STRIP_Z, P, 4));
    const n = NORM[p];
    dots[n >= 1 ? "hi" : n >= 0.5 ? "mid" : "lo"].push(
      at([wxFor(p) + CELL / 2, STRIP.y + STRIP.d / 2, STRIP_Z - 0.8]));
    ticks += k.lineOnTop([wxFor(p) + 1, STRIP.y + STRIP.d - 1.6], [wxFor(p) + 1, STRIP.y + STRIP.d - 4.2], STRIP_Z, P);
  }
  out.push(shape(fills.join(""), "lo"));
  out.push(L(edges.join(""), { tone: "lo" }));
  out.push(L(ticks, { tone: "lo" }));
  out.push(D(dots.lo, { size: 0.9 + 2.1 * 0.28 }));
  out.push(D(dots.mid, { size: 0.9 + 2.1 * 0.64 }));
  out.push(D(dots.hi, { size: 0.9 + 2.1 * 1.0 }));
  const [sx0, sx1] = [STRIP.x + 3, STRIP.x + STRIP.w - 3];
  const sy = STRIP.y + STRIP.d / 2;
  out.push(D([at([sx0, sy, STRIP_Z]), at([sx1, sy, STRIP_Z])], { size: 0.45 }));
  // label plate
  out.push(S(k.slabOf(LABEL, 0, 2, P, 3, 0.5), { tone: "lo" }));
  out.push(L(k.lineOnTop([LABEL.x + 0.4, LABEL.y + 8.5], [LABEL.x + LABEL.w - 0.4, LABEL.y + 8.5], 2, P)
    + k.lineOnTop([LABEL.x + 0.4, LABEL.y + 10.3], [LABEL.x + LABEL.w - 0.4, LABEL.y + 10.3], 2, P)
    + k.lineOnTop([LABEL.x + 0.4, LABEL.y + 12.1], [LABEL.x + LABEL.w - 0.4, LABEL.y + 12.1], 2, P), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([LABEL.x + LABEL.w / 2, LABEL.y + 5.5], 2, P, "x"), "\u03a3", { size: 4.5, tone: "lo", anchor: "middle" }));
  return out.join("");
}

// ---------- compose ----------
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Fig 4",
  title: "Convolution",
  body: [
    plate(),
    grid(),
    outputStrip(),
    gantryFrame(),
    `<g data-part="window"></g>`,
    `<g data-part="gantry"></g>`,
    `<g data-part="outlit"></g>`,
  ],
});

// ---------- live script ----------
const live = `
const P = ${JSON.stringify(P)};
const GX = ${GX}, GY = ${GY}, CELL = ${CELL}, ROW0 = ${ROW0};
const WINDOWS = ${WINDOWS}, NORM = ${JSON.stringify(NORM)};
const RAIL_BACK_Y = ${RAIL_BACK_Y}, RAIL_FRONT_Y = ${RAIL_FRONT_Y}, RAIL_D = ${RAIL_D};
const RAIL_Z = ${RAIL_Z}, RAIL_H = ${RAIL_H};
const BUSH_Z = ${BUSH_Z}, CARR_Z = ${CARR_Z}, KNOB_Z = ${KNOB_Z}, KNOB_H = ${KNOB_H};
const FRAME_Z = ${FRAME_Z}, FRAME_H = ${FRAME_H}, PIN_Z = ${PIN_Z}, PIN_H = ${PIN_H};
const ROD_R = ${ROD_R}, ROD_Z0 = ${ROD_Z0}, ROD_Z1 = ${ROD_Z1};
const FY0 = ${FY0}, FY1 = ${FY1}, FRAME_M = ${FRAME_M};
const STRIP_CY = ${STRIP.y + STRIP.d / 2}, STRIP_Z = ${STRIP_Z};
const VAL = (c) => (c === 3 || c === 4 ? 1.0 : c === 2 || c === 5 ? 0.5 : 0.1);
const wxFor = (p) => GX + p * CELL;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const stage = document.querySelector(".iso-stage");
const svgEl = stage.querySelector("svg");
const gantry = svgEl.querySelector('[data-part="gantry"]');
const windowEl = svgEl.querySelector('[data-part="window"]');
const outlit = svgEl.querySelector('[data-part="outlit"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

// -- the moving assembly, rebuilt in world coords every frame --
function buildGantry(wx) {
  const cx = wx + 1.5 * CELL;          // window centre x
  const cy = GY + (ROW0 + 1.5) * CELL; // window centre y (-28.5)
  const out = [];
  // bushings on both rails (behind the carriage plate)
  for (const ry of [RAIL_BACK_Y, RAIL_FRONT_Y]) {
    for (const bx of [cx - 20, cx + 20]) {
      out.push(solidSvg(slabOf({ x: bx - 5.5, y: ry - 5.5, w: 11, d: 11, r: 1.5 }, BUSH_Z, CARR_Z - BUSH_Z, P, 4, 1), { tone: "lo" }));
      out.push(dotsSvg([iso([bx, ry, CARR_Z], P)], { size: 0.45 }));
    }
  }
  // guide rods at the frame corners
  for (const [rx, ry] of [[wx - 2, FY0 + 2], [wx + 3 * CELL + 2, FY0 + 2], [wx - 2, FY1 - 2], [wx + 3 * CELL + 2, FY1 - 2]]) {
    out.push(solidSvg(cylinder(rx, ry, ROD_R, ROD_Z0, ROD_Z1 - ROD_Z0, P, 12), { tone: "mid" }));
  }
  // stamp frame: 4 bars around the 3x3 opening (the kernel)
  const bars = [
    { x: wx - FRAME_M, y: FY0, w: 3 * CELL + 2 * FRAME_M, d: FRAME_M },
    { x: wx - FRAME_M, y: GY + (ROW0 + 3) * CELL, w: 3 * CELL + 2 * FRAME_M, d: FRAME_M },
    { x: wx - FRAME_M, y: GY + ROW0 * CELL, w: FRAME_M, d: 3 * CELL },
    { x: wx + 3 * CELL, y: GY + ROW0 * CELL, w: FRAME_M, d: 3 * CELL },
  ];
  for (const b of bars) out.push(solidSvg(slabOf(b, FRAME_Z, FRAME_H, P, 3, 0.8), { tone: "hi" }));
  out.push(dotsSvg([
    iso([wx + 1.5 * CELL, FY0 + 2, FRAME_Z + FRAME_H], P),
    iso([wx + 1.5 * CELL, FY1 - 2, FRAME_Z + FRAME_H], P),
    iso([wx - 2, cy, FRAME_Z + FRAME_H], P),
    iso([wx + 3 * CELL + 2, cy, FRAME_Z + FRAME_H], P),
  ], { size: 0.5 }));
  // nine pins: the kernel weights, one per covered cell
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const px = wx + i * CELL + CELL / 2;
      const py = GY + (ROW0 + j) * CELL + CELL / 2;
      out.push(solidSvg(cylinder(px, py, 1.1, PIN_Z, PIN_H, P, 12), { tone: "hi" }));
    }
  }
  out.push(dotsSvg(Array.from({ length: 9 }, (_, n) => {
    const i = Math.floor(n / 3), j = n % 3;
    return iso([wx + i * CELL + CELL / 2, GY + (ROW0 + j) * CELL + CELL / 2, PIN_Z], P);
  }), { size: 0.7, tone: "hi" }));
  // hub + stem up to the carriage
  out.push(solidSvg(slabOf({ x: cx - 4.5, y: cy - 4.5, w: 9, d: 9, r: 1 }, FRAME_Z + FRAME_H, 2, P, 3, 0.4), { tone: "mid" }));
  out.push(solidSvg(cylinder(cx, cy, 3, FRAME_Z + FRAME_H + 2, CARR_Z - FRAME_Z - FRAME_H - 2, P, 20), { tone: "mid" }));
  // carriage plate + clamp knob
  out.push(solidSvg(slabOf({ x: cx - 31, y: RAIL_BACK_Y - 2.5, w: 62, d: RAIL_FRONT_Y - RAIL_BACK_Y + 5, r: 6 }, CARR_Z, 5, P, 6, 1.2), { tone: "mid" }));
  out.push(lineSvg(planOutline({ x: cx - 26, y: RAIL_BACK_Y + 2, w: 52, d: RAIL_FRONT_Y - RAIL_BACK_Y - 4, r: 4 }, CARR_Z + 5, P), { tone: "lo" }));
  out.push(dotsSvg([
    iso([cx - 27, RAIL_BACK_Y + 3, CARR_Z + 5], P), iso([cx + 27, RAIL_BACK_Y + 3, CARR_Z + 5], P),
    iso([cx - 27, RAIL_FRONT_Y - 3, CARR_Z + 5], P), iso([cx + 27, RAIL_FRONT_Y - 3, CARR_Z + 5], P),
  ], { size: 0.45 }));
  out.push(solidSvg(cylinder(cx, cy, 3, KNOB_Z, KNOB_H, P, 24), { tone: "mid" }));
  out.push(lineSvg(knurl(cx, cy, 3, KNOB_Z + 0.4, KNOB_Z + KNOB_H - 0.4, 24, P, 0.3), { tone: "lo" }));
  out.push(lineSvg(lineOnTop([cx - 1.8, cy], [cx + 1.8, cy], KNOB_Z + KNOB_H, P), { tone: "hi" }));
  // engraved kernel size on the top bar
  out.push(faceTextSvg(topMatrix([cx, FY0 + 2], FRAME_Z + FRAME_H, P, "x"), "3\\u00d73", { size: 3, tone: "lo", anchor: "middle" }));
  return out.join("");
}

// -- lit window over the covered cells (tracks the stamp continuously) --
function buildWindow(wx) {
  const plan = { x: wx - 1.2, y: GY + ROW0 * CELL - 1.2, w: 3 * CELL + 2.4, d: 3 * CELL + 2.4, r: 2 };
  const out = ['<path class="iso-shape" data-tone="lit" d="' + onTop(roundedPlan(plan, 6), 0.3, P, true) + '"/>'];
  out.push(lineSvg(planOutline(plan, 0.35, P, 6), { tone: "lit", className: "" }).replace("<path ", '<path style="stroke-width:1.1" '));
  const c0 = clamp(Math.round((wx - GX) / CELL), 0, WINDOWS - 1);
  const pts = [];
  for (let i = 0; i < 3; i++) {
    const c = Math.min(c0 + i, ${COLS - 1});
    for (let j = 0; j < 3; j++) {
      pts.push(iso([GX + c * CELL + CELL / 2, GY + (ROW0 + j) * CELL + CELL / 2, -1.2], P));
    }
  }
  out.push(dotsSvg(pts, { size: 0.7 + 1.9 * 1.0, tone: "hi" }));
  return out.join("");
}

// -- the output cell matching the current window lights up --
function buildOut(active) {
  const ox = wxFor(active) + CELL / 2;
  const out = [];
  out.push(lineSvg(ring(ox, STRIP_CY, 6.2, STRIP_Z + 0.4, P, 20), { tone: "lit" }).replace("<path ", '<path style="stroke-width:1.1" '));
  out.push(dotsSvg([[iso([ox, STRIP_CY, STRIP_Z - 0.8], P)]], { size: 0.9 + 2.1 * NORM[active], tone: "hi" }));
  return out.join("");
}

let pos = wxFor(${START}), target = ${START};
function draw() {
  gantry.innerHTML = buildGantry(pos);
  windowEl.innerHTML = buildWindow(pos);
  const active = clamp(Math.round((pos - GX) / CELL), 0, WINDOWS - 1);
  outlit.innerHTML = buildOut(active);
  const text = "x=" + active + "  \\u00b7  \\u03a3=" + NORM[active].toFixed(2);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(active));
  stage.setAttribute("aria-valuetext", text);
}
let frame = 0, last = 0, visible = false, touring = true, clock = 0, idleTimer = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) {
    clock += dt;
    target = Math.round((1 - Math.cos(clock * 0.45)) * 0.5 * (WINDOWS - 1));
  }
  const goal = wxFor(target);
  pos = still.matches ? goal : pos + (goal - pos) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(goal - pos) < 0.05) pos = goal;
  draw();
  const settled = !touring && pos === goal;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false; target = clamp(next, 0, WINDOWS - 1);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3500);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svgEl.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  steer(Math.round(share * (WINDOWS - 1)));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - 1;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = WINDOWS - 1;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
draw();
`;

// .iso-shape has no rule in ISO_CSS — define its tone fills.
const EXTRA_CSS = `
.iso-shape{stroke:none}
.iso-shape[data-tone="faint"]{fill:var(--anatomy-shade-1)}
.iso-shape[data-tone="lo"]{fill:var(--anatomy-shade-0)}
.iso-shape[data-tone="mid"]{fill:var(--anatomy-face)}
.iso-shape[data-tone="hi"]{fill:var(--anatomy-top)}
.iso-shape[data-tone="lit"]{fill:var(--anatomy-lit);opacity:.12}
`;

const body = PLATE_CSS + k.plateHtml({
  fig: "Fig 4",
  title: "Convolution",
  hint: "Hover to slide the stamp; arrow keys step it",
  readout: `x=${START}  ·  Σ=${NORM[START].toFixed(2)}`,
  keys: [
    { mark: "lit", label: "Lit window + output cell: what the kernel reads now" },
    { mark: "raised", label: "9-pin stamp: the 3×3 kernel (all weights 1)" },
    { mark: "flat", label: "Etched grid: the 8×5 input feature map" },
    { mark: "dim", label: "Output strip: Σ of 9 values ÷ max, per position" },
  ],
  caption:
    "A stamping jig convolves an input with a kernel. The etched 8×5 grid is the input feature map — dot size is the cell value, with a bright stripe down the middle columns. The gantry slides a 3×3 stamp of nine equal pins along the rails; at each of the six detents it covers columns [x, x+2] over the middle rows, and the sum Σ of the nine covered values, normalized by the maximum, is stamped into the matching output-strip cell. Slide the stamp: Σ peaks at 1.00 where the stripe fills the window and falls to 0.28 off it.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Convolution: hover or use arrow keys to slide the 3×3 kernel" aria-valuemin="0" aria-valuemax="${WINDOWS - 1}" aria-valuenow="${START}">${svg}</div>`,
});

const page = k.pageHtml({ title: "Convolution", theme, body, script: kitScript() + live })
  .replace("</style>", EXTRA_CSS + "</style>");

writeFileSync(join(HERE, theme === "light" ? "cnn-sliding-light.html" : "cnn-sliding.html"), page);
console.log("wrote", theme === "light" ? "cnn-sliding-light.html" : "cnn-sliding.html",
  "| solids ~", "50", "| norm", NORM.map((n) => n.toFixed(2)).join(","));
