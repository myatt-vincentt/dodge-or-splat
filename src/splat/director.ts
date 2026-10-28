// The throws never stop: something flies at your face every second or so,
// aimed at where your face is when it is thrown. Stay put and it hits; move
// and it misses. Endless — no lives, no score, no end.
import type { Vector3 } from "three";

import { burst } from "./Burst";
import { hits } from "./hits";
import { live } from "./live";
import { launch } from "./Projectiles";
import { BUMP_CHANCE, KINDS, type Kind } from "./props";

/** Seconds between throws, shortest to longest. */
const GAP: [number, number] = [0.9, 1.8];

/** Dev only: ?demo=0 stops the throws (the dev keys still throw). */
const throwsOff = () =>
  process.env.NODE_ENV !== "production" &&
  new URLSearchParams(window.location.search).get("demo") === "0";

let next = -1;
let last: Kind | null = null;

export const director = {
  on: !throwsOff(),
  /** The next hit also raises the bonk bump (dev). */
  forceBonk: false,
  /** A throw hit: the burst, and it sticks (sometimes with a bump). */
  land(kind: Kind, where: Vector3, bonk?: boolean) {
    const b = bonk ?? (director.forceBonk || Math.random() < BUMP_CHANCE);
    director.forceBonk = false;
    burst(kind, where);
    hits.hit(kind, b);
  },
  /** Every frame: the next throw, once the face is in view. */
  step(now: number) {
    if (!director.on || !live.head.visible) {
      next = -1;
      return;
    }
    if (next < 0) next = now + 1;
    if (now < next) return;
    next = now + GAP[0] + Math.random() * (GAP[1] - GAP[0]);
    // Never the same thing twice in a row.
    const pick = KINDS.filter((k) => k !== last);
    const kind = pick[Math.floor(Math.random() * pick.length)];
    last = kind;
    launch({ kind });
  },
};
