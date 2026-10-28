import { Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { HeadFilter, type HeadPose } from "./headFilter";

const pose = (x: number, y = 0, z = -50, yaw = 0, scale = 0.1): HeadPose => ({
  position: new Vector3(x, y, z),
  quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
  scale,
});

// A seeded noise source, so the tests repeat exactly.
const rng = (seed: number) => {
  let s = seed;
  return () => {
    // eslint-disable-next-line no-bitwise
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32 - 0.5;
  };
};

const out = (): HeadPose => pose(0);

/** The SDK's per-frame smoothing (EMA 0.5 on the held fit), for comparison. */
const driveEma = (seconds: number, fit: (t: number) => HeadPose) => {
  const xs: number[] = [];
  let next = 0;
  let held = 0;
  let x: number | null = null;
  for (let i = 0; i <= seconds * 60; i += 1) {
    const t = i / 60;
    if (t >= next) {
      held = fit(t).position.x;
      next += 1 / 15;
    }
    x = x === null ? held : x + (held - x) * 0.5;
    xs.push(x);
  }
  return xs;
};
const sd = (a: number[]) => {
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
};

/**
 * Runs a 15 Hz tracker and a 60 Hz renderer for `seconds`; `fit(t)` is the
 * tracker's reading. Returns the drawn x per frame.
 */
const drive = (
  f: HeadFilter,
  seconds: number,
  fit: (t: number) => HeadPose,
) => {
  const xs: number[] = [];
  let next = 0;
  for (let i = 0; i <= seconds * 60; i += 1) {
    const t = i / 60;
    if (t >= next) {
      f.update(t, fit(t));
      next += 1 / 15;
    }
    xs.push(f.sample(t, out())!.position.x);
  }
  return xs;
};

describe("head filter", () => {
  it("starts exactly on the first fit", () => {
    const f = new HeadFilter();
    f.update(0, pose(1, 2, -40, 0.3));
    const o = f.sample(0, out())!;
    expect(o.position.x).toBeCloseTo(1);
    expect(o.position.z).toBeCloseTo(-40);
    expect(o.quaternion.angleTo(pose(0, 0, 0, 0.3).quaternion)).toBeLessThan(
      1e-6,
    );
  });

  it("is calmer than the SDK's smoothing on a still head", () => {
    const noise = () => {
      const n = rng(7);
      return () => pose(n() * 0.02); // ±1 mm at scale 0.1
    };
    const xs = drive(new HeadFilter(), 4, noise());
    const ema = driveEma(4, noise());
    expect(sd(xs.slice(60))).toBeLessThan(sd(ema.slice(60)) / 1.5);
  });

  it("draws a steady move with less 15 Hz staircase than the SDK's smoothing", () => {
    const move = (t: number) => pose(3 * t); // 30 cm/s
    const range = (xs: number[]) => {
      const steps = xs.slice(61).map((x, i) => x - xs[60 + i]);
      return Math.max(...steps) - Math.min(...steps);
    };
    const held = 3 / 15; // the raw fit's jump each sample
    expect(range(drive(new HeadFilter(), 2, move))).toBeLessThan(held / 2);
    expect(range(drive(new HeadFilter(), 2, move))).toBeLessThan(
      range(driveEma(2, move)),
    );
  });

  it("keeps up with a steady move", () => {
    const xs = drive(new HeadFilter(), 2, (t) => pose(3 * t));
    // Once settled, behind by less than 100 ms of motion (the tracker's own
    // hold between 15 Hz fits is 33 ms of that on average).
    expect(3 * 2 - xs[xs.length - 1]).toBeLessThan(3 * 0.1);
  });

  it("settles on a turn with little overshoot, and stays there", () => {
    const f = new HeadFilter();
    let maxAngle = 0;
    for (let i = 0; i <= 120; i += 1) {
      const t = i / 60;
      // A 0.4 rad turn over 0.3 s, read at 15 Hz.
      if (i % 4 === 0) f.update(t, pose(0, 0, -50, 0.4 * Math.min(1, t / 0.3)));
      const q = f.sample(t, out())!.quaternion;
      maxAngle = Math.max(maxAngle, 2 * Math.acos(Math.min(1, Math.abs(q.w))));
    }
    expect(maxAngle).toBeLessThan(0.4 * 1.08);
    const q = f.sample(2, out())!.quaternion;
    expect(q.angleTo(pose(0, 0, -50, 0.4).quaternion)).toBeLessThan(0.01);
  });

  it("doesn't drift when the fit stops changing (a held face)", () => {
    const f = new HeadFilter();
    // Moving fast, then the same fit repeats (no new samples).
    drive(f, 1, (t) => pose(3 * t));
    const x = drive(f, 1, () => pose(3)).slice(-1)[0];
    expect(x).toBeCloseTo(3, 2);
  });

  it("snaps on a big jump (someone else, or re-entering)", () => {
    const f = new HeadFilter();
    drive(f, 1, () => pose(0));
    f.update(1.1, pose(5)); // 50 cm at scale 0.1
    expect(f.sample(1.1, out())!.position.x).toBeCloseTo(5);
  });

  it("ignores repeats of the same fit (not a new sample)", () => {
    const f = new HeadFilter();
    expect(f.update(0, pose(0))).toBe(true);
    expect(f.update(0.016, pose(0))).toBe(false);
  });
});
