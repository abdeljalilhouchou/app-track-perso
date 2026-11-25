/**
 * The mood page's holographic head: a man's head built slice by slice, drawn as glowing
 * lines, with features (eyes, brows, nostrils, lips) that follow a smile value from -1
 * (very bad) to 1 (great). Pure geometry, so it is computed once and can be tested.
 */

export type P3 = [number, number, number];
export type WireLine = { pts: P3[]; w: number; hair?: boolean; row?: boolean; neck?: boolean };
export type Feature = { pts: P3[]; glow: number; solid?: boolean; white?: boolean; tear?: boolean };

/** Smile per mood score (1..5) and the colour of the lines. */
export const HOLO_MOODS: Record<number, { smile: number; color: string }> = {
  0: { smile: 0, color: "#fbbf24" },
  1: { smile: -1, color: "#a78bfa" },
  2: { smile: -0.5, color: "#60a5fa" },
  3: { smile: 0, color: "#94a3b8" },
  4: { smile: 0.55, color: "#fb923c" },
  5: { smile: 1, color: "#34d399" },
};

// y, half-width, front depth, back depth, squareness (2 = round, higher = squarer jaw).
const PROFILE: [number, number, number, number, number][] = [
  [1.02, 0.02, 0.02, 0.02, 2],
  [0.97, 0.26, 0.24, 0.32, 2],
  [0.88, 0.45, 0.43, 0.58, 2.1],
  [0.74, 0.58, 0.58, 0.76, 2.2],
  [0.56, 0.65, 0.67, 0.86, 2.3],
  [0.36, 0.68, 0.72, 0.88, 2.4],
  [0.16, 0.68, 0.74, 0.84, 2.5],
  [-0.04, 0.68, 0.76, 0.76, 2.6],
  [-0.22, 0.65, 0.76, 0.64, 2.8],
  [-0.4, 0.61, 0.74, 0.52, 3.0],
  [-0.56, 0.56, 0.71, 0.4, 3.2],
  [-0.68, 0.48, 0.67, 0.3, 3.0],
  [-0.79, 0.36, 0.63, 0.22, 2.6],
  [-0.87, 0.22, 0.52, 0.16, 2.2],
  [-0.92, 0.08, 0.3, 0.1, 2],
];

function slice(y: number): [number, number, number, number] | null {
  if (y >= PROFILE[0][0]) return [PROFILE[0][1], PROFILE[0][2], PROFILE[0][3], PROFILE[0][4]];
  for (let i = 1; i < PROFILE.length; i++) {
    const a = PROFILE[i - 1], b = PROFILE[i];
    if (y >= b[0]) {
      const t = (a[0] - y) / (a[0] - b[0]), s = t * t * (3 - 2 * t);
      return [1, 2, 3, 4].map((k) => a[k] + (b[k] - a[k]) * s) as [number, number, number, number];
    }
  }
  return null;
}

const g = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2));
export const halfWidth = (y: number) => slice(y)?.[0] ?? 0;

function relief(x: number, y: number) {
  let d = 0;
  d += 0.17 * g(x, y, 0, -0.06, 0.055, 0.2) + 0.07 * g(x, y, 0, -0.26, 0.085, 0.055);
  d += 0.03 * (g(x, y, -0.075, -0.27, 0.04, 0.035) + g(x, y, 0.075, -0.27, 0.04, 0.035));
  d -= 0.07 * (g(x, y, -0.26, 0.1, 0.11, 0.07) + g(x, y, 0.26, 0.1, 0.11, 0.07));
  d += 0.03 * (g(x, y, -0.26, 0.1, 0.06, 0.035) + g(x, y, 0.26, 0.1, 0.06, 0.035));
  d += 0.05 * (g(x, y, -0.27, 0.24, 0.15, 0.045) + g(x, y, 0.27, 0.24, 0.15, 0.045));
  d += 0.04 * (g(x, y, -0.4, -0.08, 0.12, 0.11) + g(x, y, 0.4, -0.08, 0.12, 0.11));
  d -= 0.025 * (g(x, y, -0.34, -0.32, 0.08, 0.13) + g(x, y, 0.34, -0.32, 0.08, 0.13));
  d += 0.035 * g(x, y, 0, -0.43, 0.14, 0.04) + 0.045 * g(x, y, 0, -0.52, 0.12, 0.045);
  d -= 0.02 * g(x, y, 0, -0.6, 0.11, 0.03);
  d += 0.05 * g(x, y, 0, -0.76, 0.14, 0.07);
  return d;
}

/** A point of the head at height y and angle a (0 = front, PI/2 = right side). */
export function headPoint(y: number, a: number, lift = 0): P3 | null {
  const s = slice(y);
  if (!s) return null;
  const [hw, fd, bd, n] = s, sa = Math.sin(a), ca = Math.cos(a), e = 2 / n;
  const x = hw * Math.sign(sa) * Math.abs(sa) ** e;
  let z = (ca >= 0 ? fd : bd) * Math.sign(ca) * Math.abs(ca) ** e;
  if (ca > 0) z += relief(x, y) * ca ** 3;
  const k = 1 + lift;
  return [x * k, y + (y > 0 ? lift * 0.3 : 0), z * k];
}

/** Front surface depth at (x, y), where the features are laid. */
export function surfaceZ(x: number, y: number) {
  const s = slice(y);
  if (!s) return 0;
  const [hw, fd, , n] = s, t = Math.min(1, Math.abs(x) / hw);
  const c = Math.pow(Math.max(0, 1 - t ** n), 1 / n);
  return fd * c + relief(x, y) * c ** 3;
}

const onFace = (x: number, y: number, lift = 0.014): P3 => [x, y, surfaceZ(x, y) + lift];

export function buildWire(): WireLine[] {
  const lines: WireLine[] = [];
  const hairlineAt = (a: number) => 0.64 - 0.4 * Math.pow(Math.abs(a) / Math.PI, 1.3);
  for (let y = -0.88; y <= 1.0; y += 0.05) {
    let seg: P3[] = [], hairState: boolean | null = null;
    for (let k = 0; k <= 64; k++) {
      const a = -Math.PI + (2 * Math.PI * k) / 64, p = headPoint(y, a);
      if (!p) continue;
      const isHair = y > hairlineAt(a);
      if (hairState !== null && isHair !== hairState) { seg.push(p); lines.push({ pts: seg, w: hairState ? 0.75 : 1, hair: hairState, row: true }); seg = []; }
      hairState = isHair; seg.push(p);
    }
    if (seg.length > 1) lines.push({ pts: seg, w: hairState ? 0.75 : 1, hair: !!hairState, row: true });
  }
  for (let k = 0; k < 16; k++) {
    const a = -Math.PI + (2 * Math.PI * k) / 16, pts: P3[] = [];
    for (let y = 1.0; y >= -0.88; y -= 0.025) { const p = headPoint(y, a); if (p) pts.push(p); }
    lines.push({ pts, w: 0.35 });
  }
  const hl: P3[] = [];
  for (let k = 0; k <= 40; k++) { const a = -Math.PI * 0.62 + (Math.PI * 1.24 * k) / 40; const p = headPoint(hairlineAt(a), a, 0.01); if (p) hl.push(p); }
  lines.push({ pts: hl, w: 1.1, hair: true });
  for (const side of [-1, 1]) {
    const base = headPoint(0.02, (side * Math.PI) / 2)!, outer: P3[] = [], inner: P3[] = [];
    for (let k = 0; k <= 26; k++) {
      const a = (2 * Math.PI * k) / 26;
      outer.push([base[0] + side * (0.025 + 0.03 * Math.max(0, Math.cos(a))), -0.01 + 0.15 * Math.sin(a), -0.06 + 0.08 * Math.cos(a)]);
      inner.push([base[0] + side * 0.025, -0.02 + 0.08 * Math.sin(a), -0.05 + 0.04 * Math.cos(a)]);
    }
    lines.push({ pts: outer, w: 0.8 }, { pts: inner, w: 0.45 });
  }
  for (let i = 0; i < 6; i++) {
    const y = -0.74 - i * 0.075, ring: P3[] = [];
    for (let k = 0; k <= 48; k++) { const a = -Math.PI + (2 * Math.PI * k) / 48; ring.push([0.31 * Math.sin(a), y, -0.1 + 0.29 * Math.cos(a)]); }
    lines.push({ pts: ring, w: 0.5 * (1 - i / 6), neck: true });
  }
  return lines;
}

/** Short stubble: fixed points on the jaw, chin and upper lip. */
export function buildStubble(): P3[] {
  const out: P3[] = [];
  for (let i = 0; i < 260; i++) {
    const x = (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1 - 0.5;
    const y = -0.4 - ((((Math.sin(i * 78.233) * 12345.678) % 1) + 1) % 1) * 0.5;
    const inMouth = Math.abs(x) < 0.21 && y > -0.58 && y < -0.4;
    if (Math.abs(x) < halfWidth(y) * 0.92 && !inMouth && (y < -0.58 || Math.abs(x) > 0.2 || y > -0.42)) out.push(onFace(x, y, 0.008));
  }
  return out;
}

/** Eyes, brows, nostrils and lips for a smile (-1..1) and a blink (0 open .. 1 closed). */
export function features(s: number, blink: number): Feature[] {
  const out: Feature[] = [];
  const open = Math.max(0, s - 0.45) * 1.8, sad = Math.max(0, -s), happy = Math.max(0, s);
  for (const side of [-1, 1]) {
    const cx = side * 0.26, cy = 0.1 - sad * 0.008, rx = 0.085;
    if (s > 0.85) {
      const arc: P3[] = [], low: P3[] = [];
      for (let k = 0; k <= 18; k++) { const a = (Math.PI * k) / 18; arc.push(onFace(cx - rx * Math.cos(a), cy + 0.038 * Math.sin(a) - 0.012)); }
      for (let k = 0; k <= 12; k++) { const a = (Math.PI * k) / 12; low.push(onFace(cx - rx * 0.8 * Math.cos(a), cy - 0.035 - 0.012 * Math.sin(a))); }
      out.push({ pts: arc, glow: 1.2 }, { pts: low, glow: 0.5 });
    } else {
      const lidUp = (0.045 - sad * 0.012 + happy * 0.004) * (1 - blink), lidLow = 0.03 - happy * 0.008;
      const upper: P3[] = [], lower: P3[] = [];
      for (let k = 0; k <= 20; k++) {
        const tt = k / 20, x = cx - rx + 2 * rx * tt, bump = Math.sin(Math.PI * tt);
        const tilt = side * sad * 0.018 * (tt - 0.5) * (side > 0 ? -1 : 1);
        upper.push(onFace(x, cy + lidUp * bump + tilt));
        lower.push(onFace(x, cy - lidLow * bump + tilt));
      }
      out.push({ pts: upper, glow: 1.2 }, { pts: lower, glow: 0.8 });
      out.push({ pts: upper.map(([x, y]) => onFace(x, y + 0.025 + (1 - blink) * 0.005, 0.02)).slice(3, 18), glow: 0.4 });
      if (blink < 0.6) {
        const iris: P3[] = [], pupil: P3[] = [];
        for (let k = 0; k <= 16; k++) {
          const a = (2 * Math.PI * k) / 16;
          iris.push(onFace(cx + 0.03 * Math.cos(a), cy + Math.min(lidUp, 0.03) * 0.9 * Math.sin(a) - 0.004));
          pupil.push(onFace(cx + 0.011 * Math.cos(a), cy + 0.011 * Math.sin(a) - 0.004, 0.02));
        }
        out.push({ pts: iris, glow: 1.5 }, { pts: pupil, glow: 2, solid: true });
      }
    }
    const inner = 0.245 + sad * 0.08 + happy * 0.02, outer = 0.25 - sad * 0.035 + happy * 0.03;
    for (const off of [0, 0.018]) {
      const brow: P3[] = [];
      for (let k = 0; k <= 12; k++) {
        const tt = k / 12, x = side * (0.12 + tt * 0.3);
        brow.push(onFace(x, inner + (outer - inner) * tt + 0.035 * Math.sin(Math.PI * tt * 0.9) + off * (1 - tt * 0.6)));
      }
      out.push({ pts: brow, glow: off ? 0.6 : 1.2 });
    }
  }
  for (const side of [-1, 1]) {
    const n: P3[] = [];
    for (let k = 0; k <= 10; k++) { const a = (Math.PI * k) / 10; n.push(onFace(side * (0.045 + 0.025 * Math.cos(a)), -0.29 + 0.012 * Math.sin(a), 0.02)); }
    out.push({ pts: n, glow: 0.7 });
  }
  const w = 0.15 + happy * 0.04, base = -0.47;
  const upperLine: P3[] = [], topLip: P3[] = [], lowerLip: P3[] = [];
  for (let k = 0; k <= 24; k++) {
    const x = -w + (2 * w * k) / 24, u = 1 - (x / w) ** 2, yLine = base - s * 0.06 * u;
    upperLine.push(onFace(x, yLine));
    topLip.push(onFace(x * 0.94, yLine + 0.02 * u + 0.006 * Math.cos((Math.PI * x) / 0.04) * Math.max(0, 1 - Math.abs(x) / 0.06)));
    lowerLip.push(onFace(x * 0.85, yLine - (0.03 + open * 0.075) * u));
  }
  out.push({ pts: upperLine, glow: 1.4 }, { pts: topLip, glow: 0.7 }, { pts: lowerLip, glow: 0.9 });
  if (open > 0.2) {
    const teeth: P3[] = [];
    for (let k = 0; k <= 16; k++) { const x = -w * 0.7 + (1.4 * w * k) / 16, u = 1 - (x / (w * 0.7)) ** 2; teeth.push(onFace(x, base - s * 0.06 * (1 - (x / w) ** 2) - 0.022 * u)); }
    out.push({ pts: teeth, glow: 0.8, white: true });
  }
  if (s < -0.85) out.push({ pts: [onFace(-0.3, 0.05), onFace(-0.33, -0.04), onFace(-0.32, -0.13)], glow: 1.3, tear: true });
  return out;
}
