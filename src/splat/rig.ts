// Face-driven touches, read from each model's own spec
// (scenes[0].extras.vincentt_config.face_triggers): a blendshape, mapped
// through `map: [from, to]` to 0–1, then
//   node + translate / rotate / scale   → that node moves from its rest pose
//   morph                               → that morph target's weight
//   clip + speed                        → a looping clip's speed
//   clip_weights { clip: [w0, w1] }     → a looping clip's weight
// Several triggers on the same thing (smile left / right) take the stronger.
// `mouthSmile` is the mean of the two sides.
import {
  LoopRepeat,
  Quaternion,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type AnimationMixer,
  type Mesh,
  type Object3D,
} from "three";

export type FaceTrigger = {
  input: string;
  map?: [number, number];
  node?: string;
  translate?: [number, number, number];
  rotate?: { axis: [number, number, number]; deg: number };
  scale?: [number, number];
  morph?: string;
  clip?: string;
  speed?: [number, number];
  clip_weights?: Record<string, [number, number]>;
};

export type Blendshapes = Readonly<Record<string, number | undefined>>;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const readInput = (input: string, b: Blendshapes) => {
  if (input === "mouthSmile")
    return ((b.mouthSmileLeft ?? 0) + (b.mouthSmileRight ?? 0)) / 2;
  return b[input] ?? 0;
};

/** The trigger's 0–1 strength for these blendshapes. */
export const strength = (t: FaceTrigger, b: Blendshapes) => {
  const [lo, hi] = t.map ?? [0, 1];
  return clamp01((readInput(t.input, b) - lo) / (hi - lo || 1));
};

type NodeEffect = {
  node: Object3D;
  rest: { p: Vector3; q: Quaternion; s: Vector3 };
  /** One entry per distinct effect; triggers sharing it take the max. */
  effects: { key: string; trigger: FaceTrigger; triggers: FaceTrigger[] }[];
};

const q = new Quaternion();
const axis = new Vector3();
const v = new Vector3();

/** Build the drivers for one model; returns the per-frame update. */
export const buildRig = (
  root: Object3D,
  triggers: FaceTrigger[],
  mixer: AnimationMixer,
  clips: AnimationClip[],
) => {
  const nodes = new Map<string, NodeEffect>();
  const morphs = new Map<string, FaceTrigger[]>();
  const speeds: { action: AnimationAction; t: FaceTrigger }[] = [];
  const weights = new Map<
    AnimationAction,
    { t: FaceTrigger; w: [number, number] }[]
  >();
  const meshes: Mesh[] = [];
  root.traverse((o) => {
    if ((o as Mesh).isMesh && (o as Mesh).morphTargetDictionary)
      meshes.push(o as Mesh);
  });

  const loop = (name: string) => {
    const clip = clips.find((c) => c.name === name);
    if (!clip) return null;
    const a = mixer.clipAction(clip);
    if (!a.isRunning()) a.setLoop(LoopRepeat, Infinity).play();
    return a;
  };

  triggers.forEach((t) => {
    if (t.node && (t.translate || t.rotate || t.scale)) {
      const node = root.getObjectByName(t.node);
      if (!node) return;
      let ne = nodes.get(t.node);
      if (!ne) {
        ne = {
          node,
          rest: {
            p: node.position.clone(),
            q: node.quaternion.clone(),
            s: node.scale.clone(),
          },
          effects: [],
        };
        nodes.set(t.node, ne);
      }
      const key = JSON.stringify([t.translate, t.rotate, t.scale]);
      const same = ne.effects.find((e) => e.key === key);
      if (same) same.triggers.push(t);
      else ne.effects.push({ key, trigger: t, triggers: [t] });
    }
    if (t.morph) morphs.set(t.morph, [...(morphs.get(t.morph) ?? []), t]);
    if (t.clip && t.speed) {
      const a = loop(t.clip);
      if (a) speeds.push({ action: a, t });
    }
    if (t.clip_weights)
      Object.entries(t.clip_weights).forEach(([name, w]) => {
        const a = loop(name);
        if (!a) return;
        a.setEffectiveWeight(w[0]);
        weights.set(a, [...(weights.get(a) ?? []), { t, w }]);
      });
  });

  const max = (ts: FaceTrigger[], b: Blendshapes) =>
    ts.reduce((m, t) => Math.max(m, strength(t, b)), 0);

  return (b: Blendshapes) => {
    nodes.forEach(({ node, rest, effects }) => {
      node.position.copy(rest.p);
      node.quaternion.copy(rest.q);
      node.scale.copy(rest.s);
      effects.forEach((e) => {
        const { trigger } = e;
        const k = max(e.triggers, b);
        if (trigger.translate)
          node.position.add(v.fromArray(trigger.translate).multiplyScalar(k));
        if (trigger.rotate) {
          axis.fromArray(trigger.rotate.axis).normalize();
          q.setFromAxisAngle(axis, (trigger.rotate.deg * Math.PI * k) / 180);
          node.quaternion.multiply(q);
        }
        if (trigger.scale)
          node.scale.multiplyScalar(
            lerp(trigger.scale[0], trigger.scale[1], k),
          );
      });
    });
    morphs.forEach((ts, name) => {
      const k = max(ts, b);
      meshes.forEach((m) => {
        const i = m.morphTargetDictionary?.[name];
        const inf = m.morphTargetInfluences;
        if (i !== undefined && inf) inf[i] = k;
      });
    });
    speeds.forEach(({ action, t }) => {
      const [s0, s1] = t.speed as [number, number];
      action.setEffectiveTimeScale(lerp(s0, s1, strength(t, b)));
    });
    weights.forEach((list, action) => {
      const w = list.reduce(
        (m, { t, w: [w0, w1] }) => Math.max(m, lerp(w0, w1, strength(t, b))),
        0,
      );
      action.setEffectiveWeight(w);
    });
  };
};
