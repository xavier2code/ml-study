// KL Counter — 码本对不上的电报台 (Day 2: KL 散度的不对称)
// Two tape decks and two codebooks, crossed:
//   lane A: P-tape (9:1 heads/tails) read with the Q codebook (1 bit, 1 bit)  -> extra 0.531 bit/symbol = KL(P||Q)
//   lane B: Q-tape (1:1) read with the P codebook (0.152, 3.322 bit)          -> extra 0.737 bit/symbol = KL(Q||P)
// A punch head slides on a rail between the two lanes; whichever lane it sits
// over is the pair that runs. The counter dial reads the extra bits per symbol.
//
// Truth: KL(P||Q) = 1 - H(0.9) = 0.531;  KL(Q||P) = -(log2 0.9 + log2 0.1)/2 = 0.737.
// Ideal code lengths are -log2 p (arithmetic coding), engraved on each book.

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

// ---------- world layout ----------
const PLATE = { x: -150, y: -70, w: 300, d: 140, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// tape decks (rear)
const TAPE_Y = -44;
const DECKS = [
  { spool: [-102, TAPE_Y], from: -92, to: -52, tag: "P", book: { at: [-77, -6], title: "Q code", sub: "1 / 1 bit" }, pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0] },
  { spool: [8, TAPE_Y], from: 18, to: 58, tag: "Q", book: { at: [33, -6], title: "P code", sub: "0.15 / 3.32" }, pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0] },
];
const TAPE_Z = 12.6;
const TAPE_H = 1.4;
const SPOOL_R = 9;
const PITCH = 5.5;

// head rail + carriage
const RAIL = { x: -80, y: -57, w: 146, d: 4, r: 1 };
const RAIL2 = { x: -74, y: -50.5, w: 134, d: 3, r: 1 };
const RAIL_Z = 19;
const HEAD_A = -62, HEAD_B = 48;
const REACH = [HEAD_A - 2, HEAD_B + 2];

// counter dial
const DIAL = [104, -18];
const DIAL_R = 15;
const DIAL_Z = 46;
const DIAL_H = 9;
const DIAL_TOP = DIAL_Z + DIAL_H;

// hand crank (front left) + belts
const CRANK = [-128, 30];

// the two truth values
const KL_PQ = 1 - (-(0.9 * Math.log2(0.9) + 0.1 * Math.log2(0.1)));
const KL_QP = -(Math.log2(0.9) + Math.log2(0.1)) / 2 - 1;  // avg P-code length on a 50/50 stream minus Q's own entropy (1 bit)

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [PLATE.x + 6, -70, 26], [DIAL[0] + DIAL_R + 3, 0, DIAL_TOP + 2],
    [CRANK[0] - 10, CRANK[1] + 10, 12], [RAIL.x + RAIL.w, RAIL.y, RAIL_Z + 12],
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
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // deck tags engraved on the plate behind each spool
  for (const deck of DECKS) {
    out.push(k.faceTextSvg(k.topMatrix([deck.spool[0] - 1.5, deck.spool[1] - SPOOL_R - 6], 0.4, P, "x"), deck.tag + "-tape", { size: 2.6, tone: "lo", anchor: "middle" }));
  }
  return out.join("");
}

// ---------- tape decks ----------
function deckStatic(deck) {
  const out = [];
  const [sx, sy] = deck.spool;
  // axle + flanges
  out.push(S(k.cylinder(sx, sy, 2, 4, 18, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(sx, sy, SPOOL_R, 4, 2.6, P, 40, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(sx, sy, SPOOL_R, 19.4, 2.6, P, 40, 0.6), { tone: "mid" }));
  out.push(L(k.ring(sx, sy, SPOOL_R - 1.4, 6.6, P, 40), { tone: "lo" }));
  // tape strip to the guide roller
  out.push(S(k.slabOf({ x: deck.from, y: TAPE_Y - 4, w: deck.to - deck.from, d: 8, r: 1 }, TAPE_Z, TAPE_H, P, 3), { tone: "lo", crease: "none" }));
  // sprocket dots along the tape centre
  const holes = [];
  for (let x = deck.from + 3; x < deck.to - 1; x += PITCH) holes.push(at([x, TAPE_Y, TAPE_Z + TAPE_H]));
  out.push(D(holes, { size: 0.35, tone: "lo" }));
  // guide roller at the far end
  out.push(S(k.cylinder(deck.to + 1.5, TAPE_Y, 2.4, 10, 5, P, 20), { tone: "mid" }));
  out.push(L(k.ring(deck.to + 1.5, TAPE_Y, 1, 15, P, 12), { tone: "lo" }));
  // post under the spool
  out.push(S(k.cylinder(sx, sy, 4, 0, 4, P, 20), { tone: "mid" }));
  return out.join("");
}

// symbols scroll along each tape; rebuilt per frame
function symbolsAt(deck, offset) {
  let out = "";
  const start = Math.floor((deck.from + 2 - offset) / PITCH) * PITCH + offset;
  for (let x = start; x < deck.to - 1.5; x += PITCH) {
    if (x < deck.from + 1.5) continue;
    const kind = deck.pattern[((Math.round((x - offset - deck.from) / PITCH) % 10) + 10) % 10];
    if (kind === 1) {
      out += D([at([x, TAPE_Y, TAPE_Z + TAPE_H + 0.3])], { size: 1.7, tone: "hi" });
    } else {
      const pts = [[x - 2.2, TAPE_Y + 1.7], [x + 2.2, TAPE_Y + 1.7], [x, TAPE_Y - 2]];
      out += `<path class="iso-shape" data-tone="hi" d="${k.onTop(pts, TAPE_Z + TAPE_H + 0.3, P, true)}"/>`;
    }
  }
  return out;
}

// spool flange ticks rotate as the tape runs; rebuilt per frame
function spoolTicksAt(deck, angle) {
  const [sx, sy] = deck.spool;
  let out = "";
  for (let i = 0; i < 3; i++) {
    const a = angle + (i * Math.PI * 2) / 3;
    out += L(k.lineOnTop([sx + Math.sin(a) * 3, sy - Math.cos(a) * 3], [sx + Math.sin(a) * (SPOOL_R - 2), sy - Math.cos(a) * (SPOOL_R - 2)], 22, P), { tone: "lo" });
  }
  return out + D([at([sx, sy, 22])], { size: 0.5, tone: "mid" });
}

// text on an upright plate: baseline along world +x, glyphs standing up in +z
function plateText(at, text, size, tone = "hi") {
  const o = k.iso(at, P);
  const u = k.axisVector(P, [1, 0, 0]);
  const v = k.axisVector(P, [0, 0, 1]);
  return `<text class="iso-face-text" data-tone="${tone}" transform="matrix(${u[0].toFixed(3)} ${u[1].toFixed(3)} ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})" font-size="${size}" text-anchor="middle">${text}</text>`;
}

// ---------- codebook stands ----------
function bookStand(deck) {
  const out = [];
  const [bx, by] = deck.book.at;
  // pedestal
  out.push(S(k.cylinder(bx, by, 2.4, 0, 10, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(bx, by, 3.6, 0, 2.2, P, 20), { tone: "mid" }));
  out.push(S(k.slabOf({ x: bx - 5, y: by - 5, w: 10, d: 10, r: 1.5 }, 10, 2.4, P, 3, 0.4), { tone: "mid" }));
  // the codebook, standing on the pedestal: a thin upright plate
  const HW = 15, HT = 0.5, Z0 = 12.4, HH = 13;
  out.push(S(k.extrude([[bx - HW, by - HT], [bx + HW, by - HT], [bx + HW, by + HT], [bx - HW, by + HT]], Z0, HH, P), { tone: "hi", crease: "lo" }));
  out.push(L(k.lineOnTop([bx - HW + 1.4, by + HT], [bx + HW - 1.4, by + HT], Z0 + HH - 1.4, P), { tone: "lo", free: "both" }));
  // engraved code lengths on the face that looks at the viewer
  out.push(plateText([bx, by + HT + 0.2, Z0 + 8.4], deck.book.title, 4.6));
  out.push(plateText([bx, by + HT + 0.2, Z0 + 3.4], deck.book.sub, 3.4, "mid"));
  out.push(D([at([bx - HW + 2, by + HT, Z0 + 1]), at([bx + HW - 2, by + HT, Z0 + 1])], { size: 0.5, tone: "lo" }));
  return out.join("");
}

// ---------- head rail + carriage ----------
function rail() {
  const out = [];
  for (const r of [RAIL, RAIL2]) {
    out.push(S(k.slabOf(r, RAIL_Z, 3, P, 3, 0.4), { tone: "mid" }));
  }
  for (const x of [RAIL.x - 4, RAIL.x + RAIL.w]) {
    out.push(S(k.slabOf({ x, y: -59.5, w: 4.5, d: 15, r: 1 }, RAIL_Z - 2, 8, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.2, -57, RAIL_Z + 6]), at([x + 2.2, -47, RAIL_Z + 6])], { size: 0.45 }));
  }
  // A and B marks on the rail top
  for (const [x, t] of [[HEAD_A, "A"], [HEAD_B, "B"]]) {
    out.push(L(k.lineOnTop([x, RAIL.y - 1.5], [x, RAIL.y - 3.8], RAIL_Z + 3, P), { tone: "hi" }));
    out.push(k.faceTextSvg(k.topMatrix([x - 1.4, RAIL.y - 7], RAIL_Z + 3, P, "x"), t, { size: 2.4, tone: "lo", anchor: "middle" }));
  }
  return out.join("");
}

function headBody() {
  const out = [];
  const plan = { x: -7, y: -59.5, w: 14, d: 15, r: 2 };
  out.push(S(k.slabOf(plan, RAIL_Z + 3, 5, P, 4, 0.5), { tone: "mid" }));
  out.push(D([at([-5.4, -58.5, RAIL_Z + 8]), at([5.4, -58.5, RAIL_Z + 8]), at([-5.4, -45.5, RAIL_Z + 8]), at([5.4, -45.5, RAIL_Z + 8])], { size: 0.4, tone: "lo" }));
  // knob on top
  out.push(S(k.cylinder(0, -52, 2.6, RAIL_Z + 8, 4.5, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(0, -52, 2.6, RAIL_Z + 8, RAIL_Z + 12.5, 20, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([-2, -52], [2, -52], RAIL_Z + 12.5, P), { tone: "hi" }));
  return out.join("");
}

function plungerBody() {
  const out = [];
  out.push(S(k.cylinder(0, TAPE_Y, 1.8, 0, RAIL_Z + 3, P, 14), { tone: "hi", crease: "none", lit: true }));
  out.push(D([at([0, TAPE_Y, RAIL_Z + 3])], { size: 0.55, tone: "lit" }));
  return out.join("");
}

// ---------- counter dial ----------
function dial() {
  const out = [];
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, 3, 0, DIAL_Z - 5, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 4.2, DIAL_Z - 5, 2, P, 20), { tone: "mid" }));
  out.push(L(k.sideArc(x, y, 3, DIAL_Z - 10, P, 12), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 56, 0.7), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3, DIAL_TOP, 72, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3, P, 36), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2, DIAL_TOP, P, 56), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 2.6, 8, 4, DIAL_TOP, [1.1, 2.3], P, -Math.PI * 0.75, Math.PI * 1.5);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.4, DIAL_TOP, P, 14), { tone: "mid" }));
  const numAt = (share, text) => {
    const a = -Math.PI * 0.75 + share * Math.PI * 1.5;
    return k.faceTextSvg(k.topMatrix([x + Math.sin(a) * (DIAL_R - 7.5) - 1.4, y - Math.cos(a) * (DIAL_R - 7.5)], DIAL_TOP, P, "x"), text, { size: 2.2, tone: "lo", anchor: "middle" });
  };
  out.push(numAt(0, "0"), numAt(1, "1"));
  out.push(k.faceTextSvg(k.topMatrix([x - 1.4, y + 4], DIAL_TOP, P, "x"), "KL", { size: 2.6, tone: "lo", anchor: "middle" }));
  out.push(k.faceTextSvg(k.topMatrix([x - 3.4, y - DIAL_R + 3.5], DIAL_TOP, P, "x"), "bit", { size: 2, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const needleAt = (share) => {
  const angle = -Math.PI * 0.75 + share * Math.PI * 1.5;
  const [x, y] = DIAL;
  return k.lineOnTop(
    [x - Math.sin(angle) * 2.8, y + Math.cos(angle) * 2.8],
    [x + Math.sin(angle) * (DIAL_R - 2.5), y - Math.cos(angle) * (DIAL_R - 2.5)],
    DIAL_TOP + 0.2, P);
};

// ---------- crank + belts ----------
function crankStatic() {
  const out = [];
  const [cx, cy] = CRANK;
  out.push(S(k.cylinder(cx, cy, 4.4, 0, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 8, 3, 2.6, P, 40, 0.5), { tone: "mid" }));
  out.push(L(k.ring(cx, cy, 6.4, 5.6, P, 40), { tone: "lo" }));
  // belts to both spools
  out.push(k.wireSvg([cx, cy, 3], [DECKS[0].spool[0], DECKS[0].spool[1], 4], { tone: "lo" }));
  out.push(k.wireSvg([DECKS[0].spool[0], DECKS[0].spool[1], 4], [DECKS[1].spool[0], DECKS[1].spool[1], 4], { tone: "lo" }));
  return out.join("");
}

function crankPegAt(angle) {
  const [cx, cy] = CRANK;
  const px = cx + Math.sin(angle) * 5, py = cy - Math.cos(angle) * 5;
  return S(k.cylinder(px, py, 1.5, 5.6, 4.4, P, 12), { tone: "hi" }) + D([at([px, py, 10])], { size: 0.55, tone: "lit" });
}

// ---------- compose ----------
const startHead = HEAD_A;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "KL divergence: sending each tape with the other distribution's codebook costs a different number of extra bits",
  body: [
    plate(),
    crankStatic(),
    `<g data-part="crankpeg">${crankPegAt(0)}</g>`,
    rail(),
    deckStatic(DECKS[0]),
    `<g data-part="tape0">${symbolsAt(DECKS[0], 0)}</g>`,
    `<g data-part="spool0">${spoolTicksAt(DECKS[0], 0)}</g>`,
    deckStatic(DECKS[1]),
    `<g data-part="tape1">${symbolsAt(DECKS[1], 0)}</g>`,
    `<g data-part="spool1">${spoolTicksAt(DECKS[1], 0)}</g>`,
    `<g data-part="head" transform="${k.translateAlong(P, [startHead, 0, 0])}">
      <g data-part="plunger">${plungerBody()}</g>
      ${headBody()}
    </g>`,
    bookStand(DECKS[0]),
    bookStand(DECKS[1]),
    dial(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(KL_PQ)}" style="stroke-width:1.1"/>`,
  ],
});

// ---------- live ----------
const live = `
const P = ${JSON.stringify(P)};
const DECKS = ${JSON.stringify(DECKS.map(d => ({ from: d.from, to: d.to, pattern: d.pattern, spool: d.spool })))};
const TAPE_Y = ${TAPE_Y}, TAPE_Z = ${TAPE_Z}, TAPE_H = ${TAPE_H}, PITCH = ${PITCH}, SPOOL_R = ${SPOOL_R};
const HEAD_A = ${HEAD_A}, HEAD_B = ${HEAD_B}, REACH = ${JSON.stringify(REACH)};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, RAIL_Z = ${RAIL_Z};
const KL_PQ = ${KL_PQ}, KL_QP = ${KL_QP};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const head = svg.querySelector('[data-part="head"]');
const plunger = svg.querySelector('[data-part="plunger"]');
const needle = svg.querySelector('[data-part="needle"]');
const readout = document.querySelector("[data-readout]");
const tapes = [svg.querySelector('[data-part="tape0"]'), svg.querySelector('[data-part="tape1"]')];
const spools = [svg.querySelector('[data-part="spool0"]'), svg.querySelector('[data-part="spool1"]')];
const crankpeg = svg.querySelector('[data-part="crankpeg"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
function symbolsAt(deck, offset) {
  let out = "";
  const start = Math.floor((deck.from + 2 - offset) / PITCH) * PITCH + offset;
  for (let x = start; x < deck.to - 1.5; x += PITCH) {
    if (x < deck.from + 1.5) continue;
    const kind = deck.pattern[((Math.round((x - offset - deck.from) / PITCH) % 10) + 10) % 10];
    if (kind === 1) {
      out += dotsSvg([iso([x, TAPE_Y, TAPE_Z + TAPE_H + 0.3], P)], { size: 1.7, tone: "hi" });
    } else {
      const pts = [[x - 2.2, TAPE_Y + 1.7], [x + 2.2, TAPE_Y + 1.7], [x, TAPE_Y - 2]];
      out += '<path class="iso-shape" data-tone="hi" d="' + onTop(pts, TAPE_Z + TAPE_H + 0.3, P, true) + '"/>';
    }
  }
  return out;
}
function spoolTicksAt(deck, angle) {
  const [sx, sy] = deck.spool;
  let out = "";
  for (let i = 0; i < 3; i++) {
    const a = angle + i * Math.PI * 2 / 3;
    out += lineSvg(lineOnTop([sx + Math.sin(a) * 3, sy - Math.cos(a) * 3], [sx + Math.sin(a) * (SPOOL_R - 2), sy - Math.cos(a) * (SPOOL_R - 2)], 22, P), { tone: "lo" });
  }
  return out + dotsSvg([iso([sx, sy, 22], P)], { size: 0.5, tone: "mid" });
}
function crankPegAt(angle) {
  const cx = ${CRANK[0]}, cy = ${CRANK[1]};
  const px = cx + Math.sin(angle) * 5, py = cy - Math.cos(angle) * 5;
  return solidSvg(cylinder(px, py, 1.5, 5.6, 4.4, P, 12), { tone: "hi" }) + dotsSvg([iso([px, py, 10], P)], { size: 0.55, tone: "lit" });
}
const needleAt = ${needleAt.toString().replace(/k\./g, "")};
let hx = HEAD_A, target = HEAD_A, nshare = KL_PQ, ntarget = KL_PQ, clock = 0, side = 0;
let frame = 0, last = 0, visible = false, touring = true, idleTimer = 0;
function draw(tapeOff, crankA, dip) {
  head.setAttribute("transform", translateAlong(P, [hx, 0, 0]));
  plunger.setAttribute("transform", translateAlong(P, [hx, 0, 0]) + " " + translateAlong(P, [0, 0, dip]));
  tapes[0].innerHTML = symbolsAt(DECKS[0], tapeOff % PITCH);
  tapes[1].innerHTML = symbolsAt(DECKS[1], tapeOff % PITCH);
  spools[0].innerHTML = spoolTicksAt(DECKS[0], crankA);
  spools[1].innerHTML = spoolTicksAt(DECKS[1], crankA);
  crankpeg.innerHTML = crankPegAt(crankA);
  needle.setAttribute("d", needleAt(nshare));
  const atA = ntarget === KL_PQ;
  const text = (atA ? "P-tape x Q-code" : "Q-tape x P-code") + "  \\u00b7  extra " + nshare.toFixed(2) + " bit/symbol  \\u00b7  other way " + (atA ? KL_QP : KL_PQ).toFixed(2);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", atA ? "0" : "1");
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1/30) : 1/60;
  last = now;
  clock += dt;
  if (touring && clock > 2.6) { clock = 0.001; side = 1 - side; target = side ? HEAD_B : HEAD_A; }
  const calm = still.matches;
  hx = calm ? target : hx + (target - hx) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - hx) < 0.02) hx = target;
  const active = hx < (HEAD_A + HEAD_B) / 2;
  ntarget = active ? KL_PQ : KL_QP;
  nshare = calm ? ntarget : nshare + (ntarget - nshare) * (1 - Math.exp(-dt / 0.45));
  if (Math.abs(ntarget - nshare) < 0.001) nshare = ntarget;
  const run = calm ? 0 : clock;
  draw(run * 6, run * 2.2, calm ? 0 : Math.max(0, Math.sin(clock * 9)) * 2.2);
  const settled = !touring && hx === target && nshare === ntarget && calm;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, REACH[0], REACH[1]); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; side = target < (HEAD_A + HEAD_B) / 2 ? 0 : 1; run(); }, 3500); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  steer(REACH[0] + share * (REACH[1] - REACH[0]));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowLeft" || event.key === "ArrowDown") {
    event.preventDefault();
    steer(target < (HEAD_A + HEAD_B) / 2 ? HEAD_B : HEAD_A);
  }
  if (event.key === "Home") { event.preventDefault(); steer(HEAD_A); }
  if (event.key === "End") { event.preventDefault(); steer(HEAD_B); }
});
draw(0, 0, 0);
`;

const body = PLATE_CSS + k.plateHtml({
  fig: "Fig 1",
  title: "KL divergence",
  hint: "Hover or arrow keys to slide the punch head",
  readout: `P-tape x Q-code  ·  extra ${KL_PQ.toFixed(2)} bit/symbol  ·  other way ${KL_QP.toFixed(2)}`,
  keys: [
    { mark: "lit", label: "Counter: extra bits per symbol = KL" },
    { mark: "raised", label: "Codebooks: ideal lengths -log2 p for their distribution" },
    { mark: "mid", label: "Punch head: which tape x codebook pair runs" },
  ],
  caption:
    "Two tapes (P-tape: 9 dots to 1 triangle; Q-tape: even) and two codebooks (Q-code: 1 bit for both symbols; P-code: 0.15 and 3.32 bit), used crosswise. Slide the punch head to a lane: the counter reads the extra bits per symbol, which is exactly KL(P||Q) = 0.53 one way and KL(Q||P) = 0.74 the other. The two readings differ because KL is not symmetric.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="KL divergence: slide the punch head between the two lanes" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "kl-counter-light.html" : "kl-counter.html"),
  k.pageHtml({ title: "KL divergence", theme, body, script: kitScript() + live }));
console.log("wrote", theme === "light" ? "kl-counter-light.html" : "kl-counter.html");
