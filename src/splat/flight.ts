// How a throw travels — pure, unit-tested (flight.test.ts).
//
// Things are thrown AT you from the viewer's side, like someone standing
// behind the phone. A throw starts off the screen near the camera, past one
// of its edges (left, right, a bottom corner, now and then the top), and
// flies away from the camera in a short arc toward where your face was when
// it was thrown, getting smaller as it goes. Move your head and it misses:
// it drops away in front of you — never behind your head.
//
// Here a throw is a plan in screen and head terms; Projectiles.tsx turns it
// into world positions and evaluates the arc with `arcAt`.
export type Throw = {
  /** Where it enters: a point past the screen edge, in NDC (−1 … 1 inside). */
  edge: [number, number];
  /** Start distance from the camera, as a share of the camera-to-face distance. */
  near: number;
  /** Off the aim point, so not every throw is dead on (cm: sideways, up). */
  scatter: [number, number];
  /** Seconds from the throw to the hit. */
  duration: number;
  /** Rise of the arc at its middle (cm). */
  arc: number;
};

/** A hit ends this far in front of the point it hits (cm). */
export const HIT_FRONT = 2;

/** A random source in [0, 1). */
export type Random = () => number;

/** The edges a throw comes from, with how often (weights). */
const EDGES: { w: number; at: (r: number) => [number, number] }[] = [
  // Left and right: lower two thirds of the side.
  { w: 3, at: (r) => [-1.35, -1 + 1.4 * r] },
  { w: 3, at: (r) => [1.35, -1 + 1.4 * r] },
  // Bottom corners.
  { w: 2, at: (r) => [-1.3 + 0.5 * r, -1.3] },
  { w: 2, at: (r) => [1.3 - 0.5 * r, -1.3] },
  // Now and then from the top.
  { w: 1, at: (r) => [-0.8 + 1.6 * r, 1.3] },
];
const TOTAL = EDGES.reduce((a, e) => a + e.w, 0);

/** How far off the aim point a throw may land (cm). */
export const SCATTER = 2;

export type ThrowOptions = {
  /** Seconds from the throw to the face (else a little random). */
  duration?: number;
  /** Only from this side of the screen: −1 left, +1 right. */
  side?: -1 | 1;
  /** From exactly here instead (NDC), e.g. where the screen was tapped. */
  from?: [number, number];
};

export const planThrow = (
  random: Random = Math.random,
  { duration, side, from }: ThrowOptions = {},
): Throw => {
  let pick = random() * TOTAL;
  const edge = EDGES.find((e) => {
    pick -= e.w;
    return pick < 0;
  }) as (typeof EDGES)[number];
  const at = from ? [...from] : edge.at(random());
  if (side && !from && Math.sign(at[0]) !== side) at[0] = -at[0];
  return {
    edge: at as [number, number],
    near: 0.55 + random() * 0.1,
    scatter: [(random() - 0.5) * 2 * SCATTER, (random() - 0.5) * 2 * SCATTER],
    duration: duration ?? 0.9 + random() * 0.35,
    arc: 6 + random() * 8,
  };
};

/**
 * A point on the arc from `a` to `b` at progress u (0 … 1), lifted by `lift`
 * at the middle (a quadratic Bézier), written into `out` (x, y, z arrays).
 * Linear in u, so the speed is even and the shrinking is perspective's.
 */
export const arcAt = (
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  lift: ArrayLike<number>,
  u: number,
  out: number[],
) => {
  const k = Math.min(1, Math.max(0, u));
  const m = 2 * k * (1 - k);
  for (let i = 0; i < 3; i += 1) {
    const c = (a[i] + b[i]) / 2 + 2 * lift[i];
    // eslint-disable-next-line no-param-reassign
    out[i] = (1 - k) ** 2 * a[i] + m * c + k * k * b[i];
  }
  return out;
};

/** A throw hits within this distance of its point on the face (cm). */
export const HIT_RADIUS = 5;
/** A miss within this distance is a near miss: a whoosh past the face (cm). */
export const NEAR_RADIUS = 14;

export type Verdict = "hit" | "near" | "miss";

/**
 * How far the face's point ended up from where the throw was aimed (cm):
 * a lean or a step dodges, a wobble does not.
 */
export const judge = (cm: number): Verdict => {
  if (cm < HIT_RADIUS) return "hit";
  return cm < NEAR_RADIUS ? "near" : "miss";
};

/** The tempo builds over this many seconds of play. */
export const RAMP = 40;
/** Seconds between throws at the start, and once it has built up. */
export const GAP: [number, number] = [1.8, 0.8];

const smooth = (t: number) => {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
};

/** Seconds to the next throw, after `t` seconds of play. */
export const gapAt = (t: number) =>
  GAP[0] + (GAP[1] - GAP[0]) * smooth(t / RAMP);

/** The chance a throw comes with a second one from the other side. */
export const pairChanceAt = (t: number) =>
  0.35 * smooth((t - 12) / (RAMP - 12));

/** Hits in a row before a breather, and how long the breather is (s). */
export const BREATHER = { after: 3, seconds: 3 };
