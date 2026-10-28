import { describe, expect, it } from "vitest";

import {
  arcAt,
  gapAt,
  GAP,
  HIT_RADIUS,
  judge,
  NEAR_RADIUS,
  pairChanceAt,
  planThrow,
  RAMP,
  SCATTER,
} from "./flight";

// A seeded random source, so the tests repeat exactly.
const rng = (seed: number) => {
  let s = seed;
  return () => {
    // eslint-disable-next-line no-bitwise
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
};

describe("throws", () => {
  it("always start past a screen edge, near the camera", () => {
    const r = rng(7);
    for (let i = 0; i < 500; i += 1) {
      const t = planThrow(r);
      const [x, y] = t.edge;
      expect(Math.max(Math.abs(x), Math.abs(y))).toBeGreaterThan(1.2);
      expect(t.near).toBeGreaterThan(0.5);
      expect(t.near).toBeLessThan(0.7);
    }
  });

  it("come from the sides and bottom far more than from the top", () => {
    const r = rng(11);
    let top = 0;
    for (let i = 0; i < 1100; i += 1) if (planThrow(r).edge[1] > 1.2) top += 1;
    expect(top / 1100).toBeGreaterThan(0.04);
    expect(top / 1100).toBeLessThan(0.16);
  });

  it("land within SCATTER of the aim point and keep a given duration", () => {
    const r = rng(3);
    for (let i = 0; i < 200; i += 1) {
      const t = planThrow(r, { duration: 0.8 });
      expect(Math.abs(t.scatter[0])).toBeLessThanOrEqual(SCATTER);
      expect(Math.abs(t.scatter[1])).toBeLessThanOrEqual(SCATTER);
      expect(t.duration).toBe(0.8);
    }
  });
});

describe("the arc", () => {
  const a = [0, 0, 10];
  const b = [4, 2, 0];
  const lift = [0, 3, 0];
  const out = [0, 0, 0];

  it("starts at the throw and ends at the face", () => {
    expect(arcAt(a, b, lift, 0, out)).toEqual(a);
    expect(arcAt(a, b, lift, 1, out)).toEqual(b);
  });

  it("rises by the lift at its middle", () => {
    arcAt(a, b, lift, 0.5, out);
    expect(out[0]).toBeCloseTo(2);
    expect(out[1]).toBeCloseTo(1 + 3);
    expect(out[2]).toBeCloseTo(5);
  });

  it("only moves away from the camera (depth falls all the way)", () => {
    let last = Infinity;
    for (let u = 0; u <= 1; u += 0.05) {
      const z = arcAt(a, b, lift, u, out)[2];
      expect(z).toBeLessThanOrEqual(last);
      last = z;
    }
  });
});

describe("dodging", () => {
  it("a wobble still hits, a lean dodges, close ones whoosh", () => {
    expect(judge(2)).toBe("hit");
    expect(judge(HIT_RADIUS - 0.1)).toBe("hit");
    expect(judge(HIT_RADIUS + 0.1)).toBe("near");
    expect(judge(NEAR_RADIUS + 0.1)).toBe("miss");
  });

  it("throws from one side when asked, or from a tap", () => {
    const r = rng(5);
    for (let i = 0; i < 100; i += 1) {
      expect(planThrow(r, { side: -1 }).edge[0]).toBeLessThan(0);
      expect(planThrow(r, { side: 1 }).edge[0]).toBeGreaterThan(0);
    }
    expect(planThrow(r, { from: [0.2, -0.5] }).edge).toEqual([0.2, -0.5]);
  });
});

describe("tempo", () => {
  it("starts gentle and builds smoothly to fast over RAMP seconds", () => {
    expect(gapAt(0)).toBeCloseTo(GAP[0]);
    expect(gapAt(RAMP)).toBeCloseTo(GAP[1]);
    expect(gapAt(RAMP * 3)).toBeCloseTo(GAP[1]);
    let last = Infinity;
    for (let t = 0; t <= RAMP; t += 1) {
      expect(gapAt(t)).toBeLessThanOrEqual(last);
      last = gapAt(t);
    }
  });

  it("only pairs throws once it has warmed up", () => {
    expect(pairChanceAt(0)).toBe(0);
    expect(pairChanceAt(10)).toBe(0);
    expect(pairChanceAt(RAMP)).toBeCloseTo(0.35);
  });
});
