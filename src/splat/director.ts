// The throws never stop. They start gentle — one every couple of seconds —
// and build over the first 40 s of play to about one a second, sometimes
// two at once from opposite sides (flight.ts). Each aims at where your face
// is when it is thrown: stay put and it hits, lean or duck and it misses.
// Take a few in a row and you get a short breather. Mostly pies.
// Endless — no lives, no score, no end.
import type { Vector3 } from "three";

import { burst } from "./Burst";
import {
  BREATHER,
  gapAt,
  pairChanceAt,
  type ThrowOptions,
  type Verdict,
} from "./flight";
import { hits } from "./hits";
import { live } from "./live";
import { launch } from "./Projectiles";
import { BUMP_CHANCE, KINDS, type Kind } from "./props";

/** How often each kind is thrown (weights). */
const MIX: Record<Kind, number> = { pie: 5, dart: 1.6, snow: 1.7, fish: 1.7 };
const MIX_TOTAL = KINDS.reduce((a, k) => a + MIX[k], 0);

const pickKind = () => {
  let r = Math.random() * MIX_TOTAL;
  return KINDS.find((k) => {
    r -= MIX[k];
    return r < 0;
  }) as Kind;
};

/** Dev only: ?demo=0 starts with the throws paused (the dev keys still throw). */
const throwsOff = () =>
  process.env.NODE_ENV !== "production" &&
  new URLSearchParams(window.location.search).get("demo") === "0";

let next = -1;
let lastFrame = -1;
/** Hits since the last miss. */
let inARow = 0;

export const director = {
  on: !throwsOff(),
  /** Seconds of play so far (with a face in view): the tempo follows it. */
  play: 0,
  /** The next hit also raises the bonk bump (dev). */
  forceBonk: false,
  /** Counts, for checking the balance. */
  stats: { thrown: 0, hits: 0, near: 0, misses: 0, breathers: 0 },
  /** Listeners for a dodge (the start hint goes away on the first). */
  onDodge: new Set<() => void>(),

  throw(l: ThrowOptions & { kind: Kind; homing?: boolean }) {
    director.stats.thrown += 1;
    launch(l);
  },

  /** A throw hit: the burst, and it sticks (sometimes with a bump). */
  land(kind: Kind, where: Vector3, bonk?: boolean) {
    const b = bonk ?? (director.forceBonk || Math.random() < BUMP_CHANCE);
    director.forceBonk = false;
    director.stats.hits += 1;
    burst(kind, where);
    hits.hit(kind, b);
    inARow += 1;
    if (inARow >= BREATHER.after) {
      // A short breather before the next one.
      inARow = 0;
      director.stats.breathers += 1;
      next = Math.max(next, performance.now() / 1000 + BREATHER.seconds);
    }
  },

  /** A throw was dodged. */
  miss(_kind: Kind, verdict: Verdict) {
    inARow = 0;
    if (verdict === "near") director.stats.near += 1;
    else director.stats.misses += 1;
    director.onDodge.forEach((f) => f());
  },

  /** A tap on the screen: a pie from there, straight at the face. */
  tap(ndc: [number, number]) {
    if (!live.head.visible) return;
    director.throw({ kind: "pie", from: ndc, duration: 0.85 });
  },

  /** Every frame: the play clock and the next throw. */
  step(now: number) {
    const dt = lastFrame < 0 ? 0 : Math.min(0.1, now - lastFrame);
    lastFrame = now;
    if (!director.on || !live.head.visible) {
      next = -1;
      return;
    }
    director.play += dt;
    if (next < 0) next = now + 1.2;
    if (now < next) return;
    next = now + gapAt(director.play);
    const side = Math.random() < 0.5 ? -1 : 1;
    director.throw({ kind: pickKind(), side });
    // Sometimes a second one at once, from the other side.
    if (Math.random() < pairChanceAt(director.play))
      director.throw({ kind: pickKind(), side: side === 1 ? -1 : 1 });
  },
};
