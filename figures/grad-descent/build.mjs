// Gradient Descent Test Rig — v3 (5-point polish)
// A steel ball rolls along a curved chute; a coil spring (stiffness = learning rate)
// presses the ball onto the surface; a dial indicator reads the ball's height (loss).
//
// Mapping:
//   ball x  -> theta
//   ball z  -> L(theta)  (loss)
//   spring stiffness -> learning rate
//   surface slope  -> -grad L
//
// v3 changes:
//   1. smooth chute (single curved polygon, no stepped tiles)
//   2. ball sinks 0.3 into the ramp visually so contact reads clearly
//   3. spring: 4 turns, radius 4, top end reaches INTO the anchor plate
//   4. engraved labels bumped to size 3.5
//   5. dial needle sweeps -135°..+135° mapped to loss share 0..1

import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/xavier/.agents/skills/anatomy/kit/iso-kit.mjs";
import { sphereOf } from "/Users/xavier/.agents/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "/Users/xavier/.agents/skills/anatomy/scripts/inline-kit.mjs";

// Inline lathe.mjs (stripped of imports + exports) so the page can call sphereOf().
// lathe.mjs has its own helpers (e.g. runsOf) that collide with iso-kit's, so we
// wrap it in an IIFE and pull only sphereOf out as a global.
const LATHE_KIT = (() => {
  const stripped = readFileSync("/Users/xavier/.agents/skills/anatomy/kit/lathe.mjs", "utf8")
    .replace(/^import .*\n/gm, "")
    .replace(/^export /gm, "");
  return `(function(){\n${stripped}\nwindow.sphereOf = sphereOf;\n})();`;
})();

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 620;
const HEIGHT = 380;

// ---------- world layout ----------
const PLATE = { x: -128, y: -64, w: 262, d: 128, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

// chute
const LAND_X_FROM = -98, LAND_X_TO = 40;
const LAND_TOP_Z = 56;     // ball centre at left end
const LAND_BOT_Z = 18;     // ball centre at right end (the "minimum")
const BALL_R = 8;
const LAND_W = 16;         // chute width across y
const LAND_THICK = 2.5;
const SPAN_Z = LAND_TOP_Z - LAND_BOT_Z;

function surfaceCZ(x) {
  const t = (x - LAND_X_FROM) / (LAND_X_TO - LAND_X_FROM);
  return LAND_BOT_Z + SPAN_Z * Math.cos(t * Math.PI / 2);
}
// top surface of chute is surfaceCZ(x) - BALL_R (so ball centre sits on it)
function surfaceTZ(x) { return surfaceCZ(x) - BALL_R; }

// top spring anchor plate
const TOP_PLATE_Z = 96;
const TOP_PLATE = { x: -8, y: -12, w: 30, d: 24, r: 2 };

// dial indicator
const DIAL = [78, 0];
const DIAL_R = 22;
const DIAL_Z = 70;
const DIAL_H = 10;
const DIAL_TOP = DIAL_Z + DIAL_H;

// spring params (fix #3: longer, looser, anchored into the plate)
const SPRING_R = 4;
const SPRING_TURNS = 4;

// ---------- camera ----------
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [LAND_X_FROM, -LAND_W / 2, LAND_TOP_Z + 4],
    [LAND_X_TO, LAND_W / 2, LAND_BOT_Z + 4],
    [DIAL[0] + DIAL_R + 2, 0, DIAL_TOP + 2],
    [TOP_PLATE.x + TOP_PLATE.w / 2, 0, TOP_PLATE_Z + 6],
  ],
  WIDTH, HEIGHT, { pad: 32, azimuth: 42 },
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
  const strip = { x: -110, y: PLATE.y + PLATE.d - 15, w: 230, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 8, 5, strip.y + 0.8, 0.6, [1.2, 2.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  return out.join("");
}

// ---------- chute: one SMOOTH curved polygon (fix #1) ----------
// The old version tiled 36 flat slabs — the seams read as steps and made the ball
// look like it floated. Now the top surface is a single closed polygon (front curve
// + reversed back curve) and the visible front face is another closed polygon from
// the curve down to baseZ. Perfectly smooth by construction.
function chute() {
  const out = [];
  const yA = -LAND_W / 2, yB = LAND_W / 2;
  const baseZ = LAND_BOT_Z - BALL_R - LAND_THICK;
  const N = 64;

  // back wall (the tall left side)
  const wall = { x: LAND_X_FROM, y: yA, w: 4, d: LAND_W, r: 0.5 };
  out.push(S(k.slabOf(wall, surfaceTZ(LAND_X_FROM), LAND_TOP_Z - surfaceTZ(LAND_X_FROM), P, 3, 0.3), { tone: "mid" }));
  out.push(D([at([wall.x + 2, yA + 2, LAND_TOP_Z]), at([wall.x + 2, yB - 2, LAND_TOP_Z])], { size: 0.45 }));

  // sample the top curve at both y edges (screen coords)
  const front = [], back = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = LAND_X_FROM + t * (LAND_X_TO - LAND_X_FROM);
    front.push(k.iso([x, yB, surfaceTZ(x)], P));
    back.push(k.iso([x, yA, surfaceTZ(x)], P));
  }

  // top surface: front curve left->right, then back curve right->left (closed)
  const topD = k.pathOf(front.concat(back.slice().reverse()), true);
  // front face: curve left->right, down to baseZ at the right end, back along the bottom
  const frontFace = k.pathOf(front.concat([
    k.iso([LAND_X_TO, yB, baseZ], P),
    k.iso([LAND_X_FROM, yB, baseZ], P),
  ]), true);

  out.push(`<path class="iso-shape" data-tone="mid" d="${topD}"/>`);
  out.push(`<path class="iso-shape" data-tone="lo" d="${frontFace}"/>`);
  // crisp edges: the front top edge and the back top edge
  out.push(`<path class="iso-line" data-tone="lo" d="${k.pathOf(front)}"/>`);
  out.push(`<path class="iso-line" data-tone="faint" d="${k.pathOf(back)}"/>`);

  // side rails (thin strips on the outside y edges)
  for (const ySide of [yA, yB - 1.5]) {
    out.push(S(k.slabOf({ x: LAND_X_FROM, y: ySide, w: LAND_X_TO - LAND_X_FROM, d: 1.5, r: 0.4 }, LAND_BOT_Z - BALL_R - 0.6, 1.0, P, 3, 0.2), { tone: "mid" }));
  }
  // tick marks along the front edge (theta axis)
  for (let i = 0; i <= 10; i++) {
    const x = LAND_X_FROM + (i / 10) * (LAND_X_TO - LAND_X_FROM);
    const tickLen = (i % 5 === 0) ? 3 : 1.6;
    out.push(L(k.lineOnTop([x, yB + 0.6], [x, yB + 0.6 + tickLen], 0, P), { tone: "lo" }));
  }
  return out.join("");
}

// ---------- top plate + spring anchor + learning-rate knob ----------
function topStructure() {
  const out = [];
  const postL = { x: LAND_X_FROM, y: -LAND_W / 2 - 0.5, w: 4, d: 2, r: 0.4 };
  const postR = { x: LAND_X_FROM, y: LAND_W / 2 - 1.5, w: 4, d: 2, r: 0.4 };
  for (const p of [postL, postR]) {
    out.push(S(k.slabOf(p, LAND_TOP_Z + 0.5, TOP_PLATE_Z - LAND_TOP_Z - 0.5, P, 3, 0.3), { tone: "mid" }));
  }
  out.push(S(k.slabOf(TOP_PLATE, TOP_PLATE_Z, 3, P, 4, 0.3), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(TOP_PLATE, 2), TOP_PLATE_Z + 3, P), { tone: "lo" }));
  out.push(D([at([TOP_PLATE.x + 4, TOP_PLATE.y + 4, TOP_PLATE_Z + 3]),
     at([TOP_PLATE.x + TOP_PLATE.w - 4, TOP_PLATE.y + TOP_PLATE.d - 4, TOP_PLATE_Z + 3])], { size: 0.45 }));
  // learning-rate knob
  const knob = [TOP_PLATE.x + TOP_PLATE.w / 2, TOP_PLATE.y + TOP_PLATE.d + 3];
  out.push(S(k.slabOf({ x: knob[0] - 1.4, y: TOP_PLATE.y + TOP_PLATE.d, w: 2.8, d: 3, r: 1 }, TOP_PLATE_Z + 1, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(knob[0], knob[1] + 1.4, 2.6, TOP_PLATE_Z, 5, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1] + 1.4, 2.6, TOP_PLATE_Z, TOP_PLATE_Z + 5, 28, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([knob[0] - 1.8, knob[1] + 1.4], [knob[0] + 1.8, knob[1] + 1.4], TOP_PLATE_Z + 5, P), { tone: "hi" }));
  // engraved label (fix #4: bigger)
  out.push(k.faceTextSvg(k.topMatrix([TOP_PLATE.x + TOP_PLATE.w / 2 - 4, TOP_PLATE.y + TOP_PLATE.d / 2], TOP_PLATE_Z + 3, P, "x"), "lr", { size: 3.5, tone: "lo", anchor: "middle" }));
  return out.join("");
}

// ---------- dial indicator on a post ----------
function dial() {
  const out = [];
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, 4, 0, DIAL_Z - 8, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 5, DIAL_Z - 8, 2, P, 28), { tone: "mid" }));
  out.push(L(k.sideArc(x, y, 4, 4, P, 12), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, 4, DIAL_Z - 12, P, 12), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3.4, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 50, 5, DIAL_TOP, [1.3, 2.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.6, DIAL_TOP, P, 16), { tone: "mid" }));
  // "loss" label (fix #4: bigger)
  out.push(k.faceTextSvg(k.topMatrix([x, y + 9], DIAL_TOP, P, "x"), "loss", { size: 3.5, tone: "lo", anchor: "middle" }));
  return out.join("");
}

// needle: share in [0,1] sweeps -135°..+135° (fix #5)
const needleAt = (share) => {
  const angle = -Math.PI * 0.75 + share * Math.PI * 1.5;
  const [x, y] = DIAL;
  return k.lineOnTop(
    [x - Math.sin(angle) * 3.4, y + Math.cos(angle) * 3.4],
    [x + Math.sin(angle) * (DIAL_R - 4), y - Math.cos(angle) * (DIAL_R - 4)],
    DIAL_TOP + 0.2, P);
};

// ---------- compose ----------
const startX = LAND_X_FROM + 6;
const startZ = surfaceCZ(startX);

const ballGroup = () => `<g data-part="ball">
  <g data-part="spring"></g>
  <g data-part="ballbody"></g>
</g>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Fig 1",
  title: "Gradient descent",
  body: [
    plate(),
    chute(),
    topStructure(),
    ballGroup(),
    dial(),
    `<path data-part="needle" class="iso-line" data-tone="lit" d="${needleAt((startZ - LAND_BOT_Z) / SPAN_Z)}" style="stroke-width:1.1"/>`,
  ],
});

// ---------- live script ----------
const live = `
const P = ${JSON.stringify(P)};
const LAND_X_FROM = ${LAND_X_FROM}, LAND_X_TO = ${LAND_X_TO};
const LAND_BOT_Z = ${LAND_BOT_Z}, LAND_TOP_Z = ${LAND_TOP_Z};
const SPAN_Z = ${SPAN_Z};
const TOP_PLATE_Z = ${TOP_PLATE_Z};
const BALL_R = ${BALL_R};
const SINK = 0.3;  // fix #2: visual sink so the ball clearly rests on the ramp
const SPRING_R = ${SPRING_R}, SPRING_TURNS = ${SPRING_TURNS};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP};
function surfaceCZ(x){ const t=(x-LAND_X_FROM)/(LAND_X_TO-LAND_X_FROM); return LAND_BOT_Z + SPAN_Z*Math.cos(t*Math.PI/2); }

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const spring = svg.querySelector('[data-part="spring"]');
const ballbody = svg.querySelector('[data-part="ballbody"]');
const needle = svg.querySelector('[data-part="needle"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const REACH = [LAND_X_FROM + 4, LAND_X_TO - 4];
const clamp = (v,lo,hi)=>Math.min(hi,Math.max(lo,v));
let x = ${startX}, target = x;
function buildSpring(ballCx, ballTopZ) {
  // hand-built vertical helix (coil() does not support a z axis)
  const alongFrom = ballTopZ + 0.4;
  const alongTo   = TOP_PLATE_Z + 1.5;   // fix #3: reaches into the anchor plate
  const count     = SPRING_TURNS * 12;
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const share = i / count;
    const angle = share * SPRING_TURNS * Math.PI * 2;
    const z = alongFrom + (alongTo - alongFrom) * share;
    const px = ballCx + SPRING_R * Math.cos(angle);
    const py = SPRING_R * Math.sin(angle);
    pts.push({ p: iso([px, py, z], P), facing: depthOf([Math.cos(angle), 0, Math.sin(angle)], P) > 0 });
  }
  const front = [], back = [];
  let run = [], near = pts[0].facing;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0 && pts[i].facing !== near) {
      (near ? front : back).push(run);
      run = []; near = pts[i].facing;
    }
    run.push(pts[i].p);
  }
  if (run.length) (near ? front : back).push(run);
  const toPath = (r) => r.map((p, i) => (i ? "L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2)).join("");
  spring.innerHTML = '<path class="iso-line" data-tone="mid" d="'+back.map(toPath).join(" ")+'"/>'
                   + '<path class="iso-line" data-tone="hi" d="'+front.map(toPath).join(" ")+'"/>';
}
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};
function draw() {
  const z = surfaceCZ(x);
  ballbody.innerHTML = __buildBall(x, z - SINK);
  buildSpring(x, z - SINK + BALL_R);
  const share = (z - LAND_BOT_Z) / SPAN_Z;
  needle.setAttribute("d", needleAt(share));
  const text = "loss " + share.toFixed(2) + "  ·  \\u03b8=" + ((x - LAND_X_FROM) / (LAND_X_TO - LAND_X_FROM)).toFixed(2);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(z - LAND_BOT_Z)));
  stage.setAttribute("aria-valuetext", text);
}
let frame = 0, last = 0, visible = false, touring = true, clock = 0, idleTimer = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1/30) : 1/60;
  last = now;
  if (touring) { clock += dt; target = REACH[0] + (1 - Math.cos(clock * 0.55)) * 0.5 * (REACH[1] - REACH[0]); }
  x = still.matches ? target : x + (target - x) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(target - x) < 0.01) x = target;
  draw();
  const settled = !touring && x === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, REACH[0], REACH[1]); clearTimeout(idleTimer); idleTimer = setTimeout(()=>{ touring = !still.matches; clock = 0; run(); }, 3500); run(); };
new IntersectionObserver((entries)=>{ visible = entries[entries.length-1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  steer(REACH[0] + share * (REACH[1] - REACH[0]));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = target + 4;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = target - 4;
  if (event.key === "Home") to = REACH[0];
  if (event.key === "End") to = REACH[1];
  if (to === null) return;
  event.preventDefault();
  steer(clamp(to, REACH[0], REACH[1]));
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Gradient descent",
  hint: "Hover to slide the ball; arrow keys nudge it",
  readout: `loss 0.50  ·  θ=0.00`,
  keys: [
    { mark: "lit", label: "Steel ball: the parameter θ" },
    { mark: "mid", label: "Curved chute: the loss surface L(θ)" },
    { mark: "raised", label: "Coil spring: learning-rate pressure" },
  ],
  caption:
    "A steel ball rolls down a curved chute; a coil spring (stiffness = learning rate) presses it onto the surface. The dial reads the ball's current height, which is the loss L(θ). Move the ball and watch the needle track the loss.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Gradient descent: hover or use arrow keys to move the parameter θ" aria-valuemin="0" aria-valuemax="${SPAN_Z}" aria-valuenow="${SPAN_Z}">${svg}</div>`,
});

const BALL_FN_BODY = `
function __buildBall(ballX, ballZ) {
  const out = [];
  out.push(solidSvg(window.sphereOf([ballX, 0, ballZ], BALL_R, P), { tone: "hi", crease: "lo" }));
  out.push(dotsSvg([iso([ballX, 0, ballZ + BALL_R], P)], { size: 0.55, tone: "lit" }));
  return out.join("");
}
`;

writeFileSync(join(HERE, theme === "light" ? "grad-descent-light.html" : "grad-descent.html"),
  k.pageHtml({ title: "Gradient descent", theme, body, script: kitScript() + LATHE_KIT + BALL_FN_BODY + live }));
console.log("wrote", theme === "light" ? "grad-descent-light.html" : "grad-descent.html");
