// One model stuck on the head: loaded once (shared cache), cloned, recoloured
// by swapping to the file's own materials for the chosen preset, playing the
// loops its author marked autoplay (scenes[0].extras.vincentt_config),
// following the face triggers (rig.ts) and wobbling on a head shake.
//
// Each time it is hit (`hits` counts up) it lands with a squash — flat
// against the head, then easing back to its shape — and plays its own
// one-shot "burst" clip (the splash, the twang, the tail slap) with its idle
// loops faded out, then settles back into them.
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AnimationMixer,
  Box3,
  LoopOnce,
  LoopRepeat,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Color,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
} from "three";
// eslint-disable-next-line import/extensions
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
// eslint-disable-next-line import/extensions
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  defineGltfAsset,
  useXRAsset,
  type XRAssetDefinition,
} from "@vincentt-xr/sdk";

import { modelUrl, type Part as PartSpec } from "./props";
import { live } from "./live";
import { buildRig, type FaceTrigger } from "./rig";

const assets = new Map<string, XRAssetDefinition<GLTF>>();
export const assetFor = (id: string) => {
  let a = assets.get(id);
  if (!a) {
    a = defineGltfAsset(modelUrl(id));
    assets.set(id, a);
  }
  return a;
};

type ClipConfig = { clip: string; loop?: boolean; autoplay?: boolean };
type ItemConfig = {
  presets?: { name?: string; finish?: string }[];
  finishes?: { id: string; map?: Record<string, string> }[];
  animations?: ClipConfig[];
  rig?: { autoplay?: boolean };
  face_triggers?: FaceTrigger[];
  actions?: { clip: string; triggers?: string[] }[];
};

/** Clips that loop while worn. */
const autoplayClips = (cfg: ItemConfig, clips: AnimationClip[]) => {
  if (cfg.animations?.length)
    return cfg.animations
      .filter((a) => a.autoplay)
      .map((a) => clips.find((c) => c.name === a.clip))
      .filter((c): c is AnimationClip => !!c);
  return cfg.rig?.autoplay ? clips : [];
};

/** The one-shot clip a trigger plays (only where the author asked). */
const actionClip = (cfg: ItemConfig, clips: AnimationClip[], on: string) => {
  const a = cfg.actions?.find((x) => x.triggers?.includes(on));
  return a ? clips.find((c) => c.name === a.clip) : undefined;
};

/** Mesh renderOrder: opaque / see-through (the head occluder is -1). */
export const ORDER = [5, 6] as const;

/** `Spooky Night` → `spooky_night`: how a preset names its material variants. */
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

/**
 * The swaps a part gets: its preset's finish, then the preset's colour
 * variant of each material that has one, then its own.
 */
const swapsFor = (cfg: ItemConfig, part: PartSpec, names: string[]) => {
  const preset =
    cfg.presets?.find((p) => p.name === part.preset) ?? cfg.presets?.[0];
  const finish = cfg.finishes?.find((f) => f.id === preset?.finish)?.map ?? {};
  const variant: Record<string, string> = {};
  if (part.preset) {
    const have = new Set(names);
    const tag = `__${slug(part.preset)}`;
    names.forEach((n) => {
      if (!n.includes("__") && have.has(n + tag)) variant[n] = n + tag;
    });
  }
  return { ...finish, ...variant, ...part.materials };
};

const materialNames = (value: GLTF) =>
  ((value.parser.json.materials ?? []) as { name?: string }[]).map(
    (d) => d.name ?? "",
  );

const prepare = (
  root: Object3D,
  swaps: Record<string, string>,
  spare: Map<string, Material>,
  colors?: Record<string, string>,
) => {
  const tinted = new Map<Material, Material>();
  root.traverse((o) => {
    // The finish swatches only preview a file's finishes in its editor.
    if (o.name.includes("finish_swatch")) {
      // eslint-disable-next-line no-param-reassign
      o.visible = false;
      return;
    }
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.frustumCulled = false;
    if (!Array.isArray(m.material)) {
      const to = spare.get(swaps[m.material.name]);
      if (to) m.material = to;
      const tint = colors?.[m.material.name];
      if (tint) {
        // Its own copy, so other parts sharing the material keep theirs.
        let t = tinted.get(m.material);
        if (!t) {
          t = m.material.clone();
          (t as Material & { color?: Color }).color?.set(tint);
          tinted.set(m.material, t);
        }
        m.material = t;
      }
    }
    const mats = (
      Array.isArray(m.material) ? m.material : [m.material]
    ) as Material[];
    const clear = mats.some((x) => x.transparent);
    m.renderOrder = clear ? ORDER[1] : ORDER[0];
    if (clear)
      mats.forEach((x) => {
        // eslint-disable-next-line no-param-reassign
        x.depthWrite = false;
      });
  });
  return root;
};

/** Seconds of the landing squash. */
const SQUASH = 0.4;
/** How flat it lands: depth × (1 − k), width × (1 + k / 2). */
const SQUASH_K = 0.45;
/** Seconds the idle loops take to come back after a burst. */
const SETTLE = 0.35;
/** House motion: strict ease-out, never an overshoot. */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * The spare materials a part swaps to: in the file but on no mesh, so the
 * loader never built them — load them by name.
 */
const useSpareMaterials = (value: GLTF | null | undefined, part: PartSpec) => {
  const [spare, setSpare] = useState<Map<string, Material> | null>(null);
  useEffect(() => {
    if (!value) return undefined;
    let alive = true;
    const cfg = (value.scene.userData?.vincentt_config ?? {}) as ItemConfig;
    const want = new Set(
      Object.values(swapsFor(cfg, part, materialNames(value))),
    );
    const defs = (value.parser.json.materials ?? []) as { name?: string }[];
    const idx = defs
      .map((d, i) => [d.name, i] as const)
      .filter(([n]) => n && want.has(n));
    Promise.all(
      idx.map(([n, i]) =>
        value.parser
          .getDependency("material", i)
          .then((m: Material) => [n as string, m] as const),
      ),
    )
      .then((pairs) => {
        if (alive) setSpare(new Map(pairs));
      })
      .catch(() => {
        if (alive) setSpare(new Map());
      });
    return () => {
      alive = false;
    };
  }, [value, part]);
  return spare;
};

/**
 * Rearranges a prepared model once (with its mixer and clips, to play its
 * own actions); the returned function runs every frame with the clock (s),
 * after the mixer, and again on every hit.
 */
export type Arrange = (
  root: Object3D,
  mixer: AnimationMixer,
  clips: AnimationClip[],
) => { tick?: (t: number) => void; onHit?: (hits: number) => void };

export const Part = ({
  part,
  hits = 1,
  arrange,
}: {
  part: PartSpec;
  /** Times it has been hit: each new hit lands it again. */
  hits?: number;
  arrange?: Arrange;
}) => {
  const { value } = useXRAsset(assetFor(part.id));
  const spare = useSpareMaterials(value, part);
  const holder = useRef<Group>(null);
  const landed = useRef(-1);

  const model = useMemo(() => {
    if (!value || !spare) return null;
    const cfg = (value.scene.userData?.vincentt_config ?? {}) as ItemConfig;
    const root = prepare(
      cloneSkinned(value.scene),
      swapsFor(cfg, part, materialNames(value)),
      spare,
      part.colors,
    );
    const mixer = new AnimationMixer(root);
    const loops = autoplayClips(cfg, value.animations).map((c) =>
      mixer.clipAction(c).setLoop(LoopRepeat, Infinity).play(),
    );
    const own = arrange?.(root, mixer, value.animations) ?? {};
    const centre = new Box3().setFromObject(root).getCenter(new Vector3());
    return {
      root,
      centre,
      mixer,
      loops,
      shake: actionClip(cfg, value.animations, "headShake"),
      burst: actionClip(cfg, value.animations, "tap"),
      rig: buildRig(root, cfg.face_triggers ?? [], mixer, value.animations),
      own,
    };
  }, [value, spare, part, arrange]);

  useEffect(
    () => () => {
      model?.mixer.stopAllAction();
    },
    [model],
  );

  // The burst in flight, and the idle loops' weights to bring back after it.
  const burst = useRef<AnimationAction | null>(null);
  const settle = useRef(-1);

  // Every new hit: land again and play the burst over faded idle loops.
  useEffect(() => {
    if (!model || hits < 1) return;
    landed.current = -1;
    model.own.onHit?.(hits);
    if (!model.burst) return;
    const a = model.mixer.clipAction(model.burst);
    a.setLoop(LoopOnce, 1);
    a.reset().play();
    burst.current = a;
    settle.current = -1;
    model.loops.forEach((l) => l.setEffectiveWeight(0));
  }, [model, hits]);

  const lastShake = useRef(live.shakes);
  useFrame((state, dt) => {
    if (!model || !holder.current) return;
    const now = state.clock.elapsedTime;
    model.rig(live.override ?? live.blendshapes);
    if (live.shakes !== lastShake.current) {
      lastShake.current = live.shakes;
      if (model.shake && !burst.current) {
        const a = model.mixer.clipAction(model.shake);
        a.setLoop(LoopOnce, 1);
        a.reset().play();
      }
    }
    // The burst is over: ease the idle loops back in.
    const b = burst.current;
    if (b && !b.isRunning()) {
      burst.current = null;
      settle.current = now;
    }
    if (settle.current >= 0) {
      const k = Math.min(1, (now - settle.current) / SETTLE);
      model.loops.forEach((l) => l.setEffectiveWeight(easeOut(k)));
      if (k >= 1) settle.current = -1;
    }
    model.mixer.update(Math.min(dt, 0.1));
    model.own.tick?.(now);

    if (landed.current < 0) landed.current = now;
    const k = easeOut(Math.min(1, (now - landed.current) / SQUASH));
    const flat = SQUASH_K * (1 - k);
    const f = part.fit;
    const s = f?.scale ?? 1;
    holder.current.scale.set(
      s * (1 + flat / 2),
      s * (1 + flat / 2),
      s * (1 - flat),
    );
    holder.current.position.set(
      model.centre.x + (f?.x ?? 0) / 100,
      model.centre.y + (f?.y ?? 0) / 100,
      model.centre.z + (f?.z ?? 0) / 100,
    );
  });

  if (!model) return null;
  return (
    <group ref={holder} position={model.centre} scale={0.6}>
      <group position={model.centre.clone().negate()}>
        <primitive object={model.root} />
      </group>
    </group>
  );
};
