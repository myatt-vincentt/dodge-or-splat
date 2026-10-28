import { AnimationMixer, Group, Mesh, Object3D } from "three";
import { describe, expect, it } from "vitest";

import { buildRig, readInput, strength } from "./rig";

describe("face rig", () => {
  it("mouthSmile is the mean of both sides", () => {
    expect(
      readInput("mouthSmile", { mouthSmileLeft: 0.8, mouthSmileRight: 0.4 }),
    ).toBeCloseTo(0.6);
    expect(readInput("jawOpen", {})).toBe(0);
  });

  it("maps through [from, to] and clamps", () => {
    const t = { input: "jawOpen", map: [0.2, 0.6] as [number, number] };
    expect(strength(t, { jawOpen: 0.1 })).toBe(0);
    expect(strength(t, { jawOpen: 0.4 })).toBeCloseTo(0.5);
    expect(strength(t, { jawOpen: 0.9 })).toBe(1);
  });

  it("moves a node from rest; two sides take the stronger, not the sum", () => {
    const root = new Group();
    const n = new Object3D();
    n.name = "jaw";
    n.position.set(0, 1, 0);
    root.add(n);
    const smile = (input: string) => ({
      input,
      map: [0, 1] as [number, number],
      node: "jaw",
      translate: [0, 0, 0.01] as [number, number, number],
    });
    const update = buildRig(
      root,
      [smile("mouthSmileLeft"), smile("mouthSmileRight")],
      new AnimationMixer(root),
      [],
    );
    update({ mouthSmileLeft: 1, mouthSmileRight: 1 });
    expect(n.position.z).toBeCloseTo(0.01);
    expect(n.position.y).toBeCloseTo(1);
    update({});
    expect(n.position.z).toBeCloseTo(0); // back to rest, no drift
  });

  it("drives a morph target by name", () => {
    const root = new Group();
    const m = new Mesh();
    m.morphTargetDictionary = { jawDrop: 0 };
    m.morphTargetInfluences = [0];
    root.add(m);
    const update = buildRig(
      root,
      [{ input: "jawOpen", morph: "jawDrop", map: [0, 0.5] }],
      new AnimationMixer(root),
      [],
    );
    update({ jawOpen: 0.25 });
    expect(m.morphTargetInfluences[0]).toBeCloseTo(0.5);
  });

  it("scales a node between [from, to]", () => {
    const root = new Group();
    const n = new Object3D();
    n.name = "glint";
    root.add(n);
    const update = buildRig(
      root,
      [{ input: "mouthSmileLeft", node: "glint", scale: [0.01, 1] }],
      new AnimationMixer(root),
      [],
    );
    update({});
    expect(n.scale.x).toBeCloseTo(0.01);
    update({ mouthSmileLeft: 1 });
    expect(n.scale.x).toBeCloseTo(1);
  });
});
