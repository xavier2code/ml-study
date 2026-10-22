// PagedAttention — KV-cache memory layout as two storage trays.
//
// Mapping (the machine is the explanation):
//   base plate            -> the GPU KV-cache memory pool
//   LEFT tray "contiguous"-> contiguous allocation: one tall block per sequence,
//                           sized for the sequence's CURRENT length; ragged tops
//                           + dark sockets between blocks = reserved-but-unused
//                           memory (fragmentation / over-reservation), 34% waste
//   RIGHT tray "paged"    -> paged allocation: the same 672 KV tokens as 43
//                           identical 16-token pages in a waffle of slots; only
//                           each sequence's last page can sit half-empty, 2% waste
//   waste meter (dial)    -> share of the pool holding no tokens (needle, red zone)
//   lever (two-position)  -> the scheduler's allocation mode; a cable runs from
//                           the lever to the meter
//
// Data (true numbers, batch of 8):
//   lengths            [24,48,64,80,96,112,120,128] tokens, max 128
//   contiguous reserve 8 x 128 = 1024 tokens, used 672  -> waste 34.375% ~ 34%
//   paged blocks       ceil(len/16) = [2,3,4,5,6,7,8,8] = 43 pages x 16 = 688
//                      capacity, used 672 -> waste 16/688 = 2.33% ~ 2%
//
// Interaction: click the stage or press ArrowLeft (contiguous) / ArrowRight
// (paged) / Space to flip the lever; the arm swings, the highlight swaps trays
// and the needle eases to the new waste. Idle tour flips every ~4.2 s.

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

// ---------- model (truth first) ----------
const MAX_TOKENS = 128;                                  // contiguous reservation per sequence
const BLOCK_TOKENS = 16;                                 // tokens per page (block)
const LENGTHS = [24, 48, 64, 80, 96, 112, 120, 128];     // current lengths, 8 sequences
const USED = LENGTHS.reduce((a, b) => a + b, 0);         // 672 tokens of KV
const WASTE_CONTIG = (1 - USED / (LENGTHS.length * MAX_TOKENS)) * 100;  // 34.375
const PAGES_PER_SEQ = LENGTHS.map((l) => Math.ceil(l / BLOCK_TOKENS));  // [2,3,4,5,6,7,8,8]
const PAGE_COUNT = PAGES_PER_SEQ.reduce((a, b) => a + b, 0);           // 43
const WASTE_PAGED = (1 - USED / (PAGE_COUNT * BLOCK_TOKENS)) * 100;    // 2.33

// geometry scale: 128 tokens = 38.4 world units of height
const TOK = 0.3;
const HALF_PAGES = new Set([1, PAGES_PER_SEQ[0]]);       // last page of seq 1 and seq 7 are half-full

// ---------- world layout ----------
const BASE = { x: -150, y: -86, w: 300, d: 168, r: 8 };  // z 0..10, feet below
const TRAY_H_WALL = 46, TRAY_H_FRONT = 22, FLOOR_TOP = 14;

const TRAY_L = { x: -142, y: -54, w: 136, d: 106, r: 3 };
const TRAY_R = { x: 6, y: -54, w: 136, d: 106, r: 3 };
const WALL_T = 4;

const DIAL_C = [0, -66], DIAL_R = 19, DIAL_Z = 48, DIAL_H = 9, DIAL_TOP = DIAL_Z + DIAL_H;
const LEVER = { x: -22, y: 55, w: 44, d: 18, r: 2 };     // z 10..13
const PIVOT = [0, 61];

// paged tray waffle: 9 columns x 5 rows of page slots
const COLS = 9, ROWS = 5, COL_STRIDE = 14.2, ROW_STRIDE = 19.6;
const colX = (c) => 10 + c * COL_STRIDE;                 // column boundary
const pageX = (c) => colX(c) + 2.1;                      // page left edge (w 10)
const rowY = (r) => -50 + r * ROW_STRIDE + 4.3;          // page front edge (d 11)

// ---------- camera ----------
const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -5, 0),
    [DIAL_C[0] - DIAL_R - 2, DIAL_C[1], 60], [DIAL_C[0] + DIAL_R + 2, DIAL_C[1], 60],
    [-142, -54, TRAY_H_WALL], [142, -54, TRAY_H_WALL],
    [-142, 52, TRAY_H_WALL], [142, 52, TRAY_H_WALL],
    [-26, 42, MAX_TOKENS * TOK + FLOOR_TOP + 2], [-14, 42, MAX_TOKENS * TOK + FLOOR_TOP + 2],
    [0, 79, 28],
  ],
  WIDTH, HEIGHT, { pad: 30, azimuth: 42 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);

// merge several extrude results into one solidSvg call (one highlightable group)
function mergeSolids(list) {
  const out = { fill: "", outline: "", crease: "", top: "", shades: ["", "", "", ""], bevel: "" };
  for (const s of list) {
    out.fill += s.fill; out.outline += s.outline; out.crease += s.crease;
    out.top += s.top; out.bevel += s.bevel || "";
    s.shades.forEach((d, i) => { out.shades[i] += d; });
  }
  return out;
}

const screws = (points, z, ringR = 1.8) => {
  let out = "";
  for (const [x, y] of points) {
    out += L(k.ring(x, y, ringR, z, P, 14), { tone: "lo" });
    out += D([at([x, y, z])], { size: 0.45 });
  }
  return out;
};
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);

// ---------- base plate ----------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -5, 10, P)}"/>`];
  const feet = [[-126, -62], [126, -62], [0, -62], [-126, 58], [0, 58], [126, 58]];
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 7, -5, 1.6, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -3.4, 3.4, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, 0, 10, P, 10, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 6), 10, P), { tone: "lo" }));
  out.push(screws([[-140, -81], [140, -81], [-140, 77.5], [140, 77.5]], 10));
  // ruler strip along the front edge
  const strip = { x: -134, y: 74.5, w: 268, d: 6.5, r: 1 };
  out.push(S(k.slabOf(strip, 10, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(-130, 130, 5, 5, 75, 10.6, [0.8, 1.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([-133, 77.7, 10.6]), at([133, 77.7, 10.6])], { size: 0.45 }));
  return out.join("");
}

// ---------- shared tray shell (walls, floor, rim details) ----------
function trayShell(plan, label, rimTicks) {
  const out = [];
  const inner = {
    x: plan.x + WALL_T, y: plan.y + WALL_T,
    w: plan.w - WALL_T * 2, d: plan.d - WALL_T * 2, r: 1,
  };
  const front = { x: plan.x, y: plan.y + plan.d - WALL_T, w: plan.w, d: WALL_T, r: 1.5 };
  const back = { x: plan.x, y: plan.y, w: plan.w, d: WALL_T, r: 1.5 };
  const left = { x: plan.x, y: plan.y + WALL_T, w: WALL_T, d: plan.d - WALL_T * 2, r: 1 };
  const right = { x: plan.x + plan.w - WALL_T, y: plan.y + WALL_T, w: WALL_T, d: plan.d - WALL_T * 2, r: 1 };
  out.push(S(k.slabOf(back, 10, TRAY_H_WALL - 10, P, 6, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf(left, 10, TRAY_H_WALL - 10, P, 6, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf(inner, 10, FLOOR_TOP - 10, P, 6, 0.8), { tone: "mid" }));
  out.push(rimTicks());
  out.push(S(k.slabOf(right, 10, TRAY_H_WALL - 10, P, 6, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf(front, 10, TRAY_H_FRONT - 10, P, 6, 0.5), { tone: "mid" }));
  const cx = plan.x + plan.w / 2;
  out.push(k.faceTextSvg(k.topMatrix([cx, plan.y + plan.d - WALL_T / 2], TRAY_H_FRONT, P, "x"),
    label, { size: 3.4, tone: "lo", anchor: "middle" }));
  // rim screws: back pair on the tall wall, front pair on the low lip
  const rim = [
    [plan.x + 2, plan.y + 2, TRAY_H_WALL], [plan.x + plan.w - 2, plan.y + 2, TRAY_H_WALL],
    [plan.x + 2, plan.y + plan.d - 2, TRAY_H_FRONT], [plan.x + plan.w - 2, plan.y + plan.d - 2, TRAY_H_FRONT],
  ];
  for (const [x, y, z] of rim) {
    out.push(L(k.ring(x, y, 1.6, z, P, 14), { tone: "lo" }));
    out.push(D([at([x, y, z])], { size: 0.45 }));
  }
  return out.join("");
}

// ---------- LEFT tray: contiguous allocation ----------
function trayContiguous() {
  // tall ragged KV blocks, one per sequence
  const blocks = LENGTHS.map((len, i) =>
    k.slabOf({ x: -138 + i * 16, y: -46, w: 12, d: 88, r: 0.6 }, FLOOR_TOP, len * TOK, P, 4, 0.4));
  // dark sockets in the gaps: reserved, unusable holes between allocations
  const sockets = [];
  for (let i = 0; i < 8; i++) sockets.push({ x: -138 + 12 + i * 16 + 0.5, y: -46, w: 3, d: 88, r: 0.4 });
  const socketSolids = sockets.map((s) => k.slabOf(s, FLOOR_TOP, 1.7, P, 3, 0.2));
  const socketDots = [];
  for (const s of sockets)
    for (let j = 0; j < 7; j++) socketDots.push(at([s.x + 1.5, -40 + j * 13.5, FLOOR_TOP + 1.7]));

  const ticks = () => {
    let d = "";
    for (let i = 0; i <= 8; i++) {
      const x = -138 + i * 16;
      d += k.lineOnTop([x, 48.5], [x, 50], TRAY_H_FRONT, P);
      if (i < 8) d += k.lineOnTop([x + 8, 48.5], [x + 8, 49.3], TRAY_H_FRONT, P);
    }
    return L(d, { tone: "lo" });
  };

  return trayShell(TRAY_L, "contiguous", ticks)
    + S(mergeSolids(socketSolids), { tone: "lo" })
    + D(socketDots, { size: 0.4, tone: "lo" })
    + `<g data-part="kv-contig">${S(mergeSolids(blocks), { tone: "hi" })}</g>`;
}

// ---------- RIGHT tray: paged allocation ----------
function trayPaged() {
  // waffle of slot dividers: column walls + row lines scored on the floor
  const walls = [];
  for (let c = 1; c < COLS; c++)
    walls.push(k.slabOf({ x: colX(c) - 0.75, y: -50, w: 1.5, d: 98, r: 0.3 }, FLOOR_TOP, 1.8, P, 3, 0.2));
  let rowLines = "";
  for (let r = 1; r < ROWS; r++) {
    const y = -50 + r * ROW_STRIDE;
    rowLines += k.lineOnTop([10, y], [colX(1) - 0.75, y], FLOOR_TOP, P);
    for (let c = 1; c < COLS; c++)
      rowLines += k.lineOnTop([colX(c) + 0.75, y], [colX(c + 1) - 0.75, y], FLOOR_TOP, P);
  }
  // empty slot outlines: free pages in the pool
  let free = "";
  for (const idx of [PAGE_COUNT, PAGE_COUNT + 1]) {
    const c = idx % COLS, r = Math.floor(idx / COLS);
    free += k.planOutline({ x: pageX(c), y: rowY(r), w: 10, d: 11, r: 0.6 }, FLOOR_TOP + 0.05, P, 3);
  }
  // the pages themselves: identical 16-token blocks, two sit half-empty
  const pages = [];
  for (let i = 0; i < PAGE_COUNT; i++) {
    const c = i % COLS, r = Math.floor(i / COLS);
    const h = HALF_PAGES.has(i) ? (BLOCK_TOKENS / 2) * TOK : BLOCK_TOKENS * TOK;
    pages.push(k.slabOf({ x: pageX(c), y: rowY(r), w: 10, d: 11, r: 0.6 }, FLOOR_TOP, h, P, 4, 0.3));
  }
  const pageDots = [];
  for (const i of HALF_PAGES) {
    const c = i % COLS, r = Math.floor(i / COLS);
    pageDots.push(at([pageX(c) + 5, rowY(r) + 5.5, FLOOR_TOP + 2.4]));
  }

  const ticks = () => {
    let d = "";
    for (let c = 0; c <= COLS; c++) d += k.lineOnTop([colX(c) + (c === 0 ? 0.6 : 0), 48.5], [colX(c) + (c === 0 ? 0.6 : 0), 50], TRAY_H_FRONT, P);
    return L(d, { tone: "lo" });
  };

  return trayShell(TRAY_R, "paged", ticks)
    + S(mergeSolids(walls), { tone: "lo" })
    + L(rowLines, { tone: "faint" })
    + L(free, { tone: "faint" })
    + `<g data-part="kv-paged">${S(mergeSolids(pages), { tone: "hi" })}</g>`
    + D(pageDots, { size: 0.4, tone: "lo" });
}

// ---------- waste meter (dial) ----------
const wasteAngle = (w) => -Math.PI * 2 / 3 + Math.min(w, 40) / 40 * Math.PI * 4 / 3;
function meter() {
  const [cx, cy] = DIAL_C;
  const out = [];
  out.push(S(k.cylinder(cx, cy, 5.5, 10, 2, P, 24), { tone: "lo" }));           // flange
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    out.push(D([at([cx + 3.9 * Math.cos(a), cy + 3.9 * Math.sin(a), 12])], { size: 0.4 }));
  }
  out.push(S(k.cylinder(cx, cy, 3.2, 12, 32, P, 20), { tone: "mid" }));         // post
  out.push(L(k.sideArc(cx, cy, 3.2, 26, P, 10), { tone: "lo" }));
  out.push(L(k.sideArc(cx, cy, 3.2, 38, P, 10), { tone: "lo" }));
  out.push(S(k.cylinder(cx, cy, 4.4, 44, 4, P, 20), { tone: "mid" }));          // collar
  out.push(D([at([cx + 3.1, cy, 48])], { size: 0.4 }));
  out.push(S(k.cylinder(cx, cy, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(cx, cy, DIAL_R, DIAL_TOP - 3.2, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(cx, cy, DIAL_R - 1.6, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(cx, cy, DIAL_R - 2.5, 24, 6, DIAL_TOP + 0.1, [1.2, 2.6], P, -Math.PI * 2 / 3, Math.PI * 4 / 3);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // zero mark
  const z0 = wasteAngle(0), zs = Math.sin(z0), zc = -Math.cos(z0);
  out.push(L(k.lineOnTop([cx + zs * (DIAL_R - 6), cy + zc * (DIAL_R - 6)], [cx + zs * (DIAL_R - 2.5), cy + zc * (DIAL_R - 2.5)], DIAL_TOP + 0.1, P), { tone: "hi" }));
  // red zone: 30%..40%
  const arc = [];
  for (let i = 0; i <= 20; i++) {
    const a = wasteAngle(30 + i * 0.5);
    arc.push(at([cx + Math.sin(a) * (DIAL_R - 4.4), cy - Math.cos(a) * (DIAL_R - 4.4), DIAL_TOP + 0.1]));
  }
  out.push(`<path class="iso-line" data-tone="red" d="${k.pathOf(arc)}" style="stroke-width:1.3"/>`);
  out.push(k.faceTextSvg(k.topMatrix([cx, cy + 6.5], DIAL_TOP + 0.15, P, "x"), "waste %", { size: 2.7, tone: "lo", anchor: "middle" }));
  return out.join("");
}

// needle: waste 0..40% sweeps -120deg..+120deg
const needleAt = (w) => {
  const a = wasteAngle(w);
  const [cx, cy] = DIAL_C;
  const s = Math.sin(a), c = Math.cos(a);
  return k.lineOnTop(
    [cx - s * 2.8, cy + c * 2.8],
    [cx + s * (DIAL_R - 4.8), cy - c * (DIAL_R - 4.8)],
    DIAL_TOP + 0.25, P);
};

// ---------- lever (two-position switch) ----------
const armSvg = (t) => {
  const ang = Math.PI * (1 - t);
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const [px, py] = PIVOT;
  const a0 = 2.2, a1 = 15.2, hw = 1.7, ch = 0.7;
  const loc = [[a0, -hw + ch], [a0 + ch, -hw], [a1 - ch, -hw], [a1, -hw + ch], [a1, hw - ch], [a1 - ch, hw], [a0 + ch, hw], [a0, hw - ch]];
  const ring = loc.map(([u, v]) => [px + u * dx - v * dy, py + u * dy + v * dx]);
  const out = [k.solidSvg(k.extrude(ring, 19.5, 2, P, { convex: true }), { tone: "mid" })];
  const kx = px + a1 * dx, ky = py + a1 * dy;
  out.push(k.solidSvg(k.cylinder(kx, ky, 2.7, 19.5, 6.5, P, 20), { tone: "mid" }));
  out.push(k.lineSvg(k.knurl(kx, ky, 2.7, 19.8, 25.7, 20, P, 0.15), { tone: "lo" }));
  out.push(k.dotsSvg([k.iso([kx, ky, 26], P)], { size: 0.5, tone: "hi" }));
  return out.join("");
};

function lever() {
  const out = [];
  out.push(S(k.slabOf(LEVER, 10, 3, P, 5, 0.5), { tone: "mid" }));
  out.push(screws([[-18.5, 57.5], [18.5, 57.5], [-18.5, 70.5], [18.5, 70.5]], 13, 1.4));
  // detents for the two positions
  for (const s of [-1, 1]) {
    out.push(L(k.ring(PIVOT[0] + s * 15.2, PIVOT[1], 1.7, 13, P, 12), { tone: "lo" }));
    out.push(D([at([PIVOT[0] + s * 15.2, PIVOT[1], 13])], { size: 0.45 }));
  }
  out.push(`<g data-part="lever"><g data-part="arm">${armSvg(0)}</g>`);
  out.push(S(k.cylinder(PIVOT[0], PIVOT[1], 3.4, 13, 7, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(PIVOT[0], PIVOT[1], 3.4, 13.4, 19.6, 24, P, 0.15), { tone: "lo" }));
  out.push(D([at([PIVOT[0], PIVOT[1], 20])], { size: 0.55, tone: "hi" }));
  out.push(`</g>`);
  return out.join("");
}

// control cable: lever plate -> meter flange, down the channel between trays
function cable() {
  return k.wireSvg(at([0, 54.8, 11.8]), at([0, -60.8, 11.8]), { tone: "lo", ends: "both", size: 1.1 });
}

// ---------- compose ----------
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "PagedAttention: two KV-cache layouts",
  body: [
    base(),
    meter(),
    cable(),
    trayContiguous(),
    trayPaged(),
    lever(),
    `<path data-part="needle" class="iso-line" data-tone="lit" d="${needleAt(WASTE_CONTIG)}" style="stroke-width:1.1"/>`,
    (() => {
      const [cx, cy] = DIAL_C;
      return L(k.ring(cx, cy, 1.9, DIAL_TOP + 0.3, P, 16), { tone: "mid" })
        + D([at([cx, cy, DIAL_TOP + 0.3])], { size: 0.7, tone: "lit" });
    })(),
  ],
});

// ---------- live script ----------
const live = `
const P = ${JSON.stringify(P)};
const WASTE_CONTIG = ${WASTE_CONTIG}, WASTE_PAGED = ${WASTE_PAGED};
const PIVOT = ${JSON.stringify(PIVOT)};
const DIAL_C = ${JSON.stringify(DIAL_C)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP};
const wasteAngle = ${wasteAngle.toString()};
const armSvg = ${armSvg.toString().replace(/\bk\./g, "")};
const needleAt = ${needleAt.toString().replace(/\bk\./g, "")};

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const arm = svg.querySelector('[data-part="arm"]');
const needle = svg.querySelector('[data-part="needle"]');
const contig = svg.querySelector('[data-part="kv-contig"] > .iso-solid');
const paged = svg.querySelector('[data-part="kv-paged"] > .iso-solid');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
stage.style.cursor = "pointer";
stage.style.outline = "none";

let mode = "contiguous";          // which scheduler owns the cache
let t = 0;                        // lever: 0 = contiguous (left), 1 = paged (right)
let waste = WASTE_CONTIG;         // eased meter value
let frame = 0, last = 0, visible = false, touring = true, clock = 0, idleTimer = 0;

function highlight() {
  if (mode === "contiguous") {
    contig.setAttribute("data-lit", "");
    paged.removeAttribute("data-lit");
    paged.style.opacity = ".8";
    contig.style.opacity = "";
  } else {
    paged.setAttribute("data-lit", "");
    contig.removeAttribute("data-lit");
    contig.style.opacity = ".8";
    paged.style.opacity = "";
  }
  stage.setAttribute("aria-checked", String(mode === "paged"));
}

let lastArmT = -1;
function draw() {
  if (Math.abs(t - lastArmT) > 0.0015) { arm.innerHTML = armSvg(t); lastArmT = t; }
  needle.setAttribute("d", needleAt(waste));
  const text = "mode: " + mode + "  \\u00b7  waste " + Math.round(waste) + "%  \\u00b7  batch 8 seqs";
  if (readout.textContent !== text) readout.textContent = text;
}

function setMode(next) {
  if (next === mode) return;
  mode = next;
  highlight();
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 6000);
  touring = false;
  run();
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const tTarget = mode === "paged" ? 1 : 0;
  const wTarget = mode === "paged" ? WASTE_PAGED : WASTE_CONTIG;
  if (still.matches) { t = tTarget; waste = wTarget; }
  else {
    t += (tTarget - t) * (1 - Math.exp(-dt / 0.28));
    waste += (wTarget - waste) * (1 - Math.exp(-dt / 0.45));
    if (Math.abs(tTarget - t) < 0.001) t = tTarget;
    if (Math.abs(wTarget - waste) < 0.35) waste = wTarget;
  }
  if (touring) { clock += dt; if (clock > 4.2) { clock = 0; mode = mode === "contiguous" ? "paged" : "contiguous"; highlight(); } }
  draw();
  const settled = t === (mode === "paged" ? 1 : 0) && waste === (mode === "paged" ? WASTE_PAGED : WASTE_CONTIG);
  const idle = touring && clock <= 0.05 && settled;
  frame = visible && !idle ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;

stage.addEventListener("click", () => setMode(mode === "contiguous" ? "paged" : "contiguous"));
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") { event.preventDefault(); setMode("contiguous"); }
  else if (event.key === "ArrowRight") { event.preventDefault(); setMode("paged"); }
  else if (event.key === " " || event.key === "Enter") {
    event.preventDefault(); setMode(mode === "contiguous" ? "paged" : "contiguous");
  }
});
highlight();
draw();
`;

const body = PLATE_CSS + k.plateHtml({
  fig: "Fig 6",
  title: "PagedAttention",
  hint: "Click or press \u2190/\u2192 to flip the scheduler lever",
  readout: `mode: contiguous \u00b7 waste 34% \u00b7 batch 8 seqs`,
  keys: [
    { mark: "lit", label: "Lit tray: the layout the scheduler is using" },
    { mark: "flat", label: "Dark sockets: reserved memory holding no tokens" },
    { mark: "raised", label: "Waste meter: share of the pool that is empty" },
  ],
  caption:
    "The same KV cache for a batch of 8 sequences, held two ways. Contiguous (left): every sequence reserves room for its longest possible generation, so ragged tops and the dark sockets between blocks sit unused \u2014 34% of the pool. Paged (right): the same 672 tokens become 43 fixed 16-token pages in one shared pool; only a sequence\u2019s last page can sit half-empty (the two low pages), so waste is 2%, and two slots stay free for the next sequence. Flip the lever and the meter follows.",
  body: `<div class="iso-stage" tabindex="0" role="switch" aria-checked="false" aria-label="Allocation mode: contiguous or paged">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "paged-attention-light.html" : "paged-attention.html"),
  k.pageHtml({ title: "PagedAttention", theme, body, script: kitScript() + live }));
console.log("wrote", theme === "light" ? "paged-attention-light.html" : "paged-attention.html",
  "\u2014 parts: pages " + PAGE_COUNT + ", blocks " + LENGTHS.length + ", waste " + WASTE_CONTIG.toFixed(1) + "% / " + WASTE_PAGED.toFixed(1) + "%");
