// Things thrown at your face from the viewer's side. Each comes in from
// past a screen edge, close to the camera and big, and flies away from the
// camera in a short arc toward where your face was when it was thrown,
// getting smaller as it goes, tumbling a little, a soft puff trail behind it
// for speed (flight.ts). If your face is still there when it arrives, it
// hits; if you moved, it drops away in front of you and is gone.
//
// They draw over everything (after DepthClear), so the head never hides one
// for any part of its flight. Up to SLOTS fly at once; each slot keeps one
// of every kind and shows the one in flight.
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  AnimationMixer,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LoopRepeat,
  Points,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type AnimationClip,
  type Object3D,
} from "three";
// eslint-disable-next-line import/extensions
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useXRAsset } from "@vincentt-xr/sdk";

import { arcAt, HIT_FRONT, planThrow, type Throw } from "./flight";
import { buildDart, buildPie, buildSnowball, onTop } from "./flyers";
import { live } from "./live";
import { assetFor } from "./Part";
import { FRAME, KINDS, stickPoint, type Kind } from "./props";

/** Projectiles in flight at once. */
const SLOTS = 3;
/** Trail puffs per projectile (one per frame, oldest last). */
const TRAIL = 12;
/** Trail draw order: after the depth clear, under the projectiles. */
const TRAIL_ORDER = 905;

type Launch = {
  kind: Kind;
  /** Follows the face all the way, so it always hits (dev). */
  homing?: boolean;
  /** Seconds from the throw to the face (else a little random). */
  duration?: number;
};

/** A throw hits if it arrives this close to its point on the face (cm). */
const HIT_RADIUS = 6.5;
/** A dodged throw drops away for this long (s), shrinking to nothing. */
const DROP = 0.45;
/** Its fall (world units per s², in cm per head-cm). */
const GRAVITY = 900;

/** Projectiles waiting to fly; Projectiles takes them each frame. */
const queue: Launch[] = [];
export const launch = (l: Launch) => {
  queue.push(l);
};

/** Size of each flyer and how it tumbles. */
const LOOK: Record<
  Kind,
  {
    scale: number;
    trail: string;
    puff: number;
    wobble: number;
    spin: number;
    /**
     * Turned off its flight line (rad), so its shape reads from behind: the
     * pie shows its cream, the dart its side.
     */
    lean: number;
  }
> = {
  pie: {
    scale: 0.8,
    trail: "#fff4e0",
    puff: 15,
    wobble: 0.25,
    spin: 1.2,
    lean: 1.9,
  },
  dart: {
    scale: 1.5,
    trail: "#ffffff",
    puff: 6,
    wobble: 0.1,
    spin: 2.5,
    lean: 1,
  },
  snow: { scale: 1, trail: "#eef6ff", puff: 9, wobble: 1, spin: 5, lean: 0 },
  fish: {
    scale: 1.15,
    trail: "#c6ecff",
    puff: 13,
    wobble: 0.3,
    spin: 1.4,
    lean: 0,
  },
};

const trailVertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / max(0.001, -mv.z);
    vAlpha = aAlpha;
  }
`;
const trailFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    if (a <= 0.0) discard;
    gl_FragColor = vec4(uColor, a * a * vAlpha);
  }
`;

type Slot = {
  group: Group;
  models: Record<Kind, Object3D>;
  trail: Points;
  history: Vector3[];
  filled: number;
  flight: Throw | null;
  /** Where it was thrown from (world): near the camera, past an edge. */
  from: Vector3;
  /** Where it was thrown to (world): the face as it was then. */
  to: Vector3;
  kind: Kind;
  homing: boolean;
  t0: number;
  /** Dodged: when it started dropping (s), its velocity (world/s); −1 = flying. */
  dropped: number;
  fall: Vector3;
  axis: Vector3;
  phase: number;
};

const makeTrail = () => {
  const geo = new BufferGeometry();
  geo.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(TRAIL * 3), 3),
  );
  geo.setAttribute("aSize", new BufferAttribute(new Float32Array(TRAIL), 1));
  geo.setAttribute("aAlpha", new BufferAttribute(new Float32Array(TRAIL), 1));
  const mat = new ShaderMaterial({
    uniforms: { uScale: { value: 1 }, uColor: { value: new Color() } },
    vertexShader: trailVertex,
    fragmentShader: trailFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
  const p = new Points(geo, mat);
  p.frustumCulled = false;
  p.renderOrder = TRAIL_ORDER;
  return p;
};

/** The fish, centred on itself and in centimetres, flopping as it flies. */
const fishFlyer = (
  scene: Object3D,
  clips: AnimationClip[],
  mixers: AnimationMixer[],
) => {
  const root = cloneSkinned(scene);
  root.scale.setScalar(FRAME.scale);
  root.updateMatrixWorld(true);
  const mid = new Box3().setFromObject(root).getCenter(new Vector3());
  root.position.sub(mid);
  const g = new Group();
  g.add(root);
  const mixer = new AnimationMixer(root);
  const idle = clips.find((c) => c.name === "idle");
  if (idle) mixer.clipAction(idle).setLoop(LoopRepeat, Infinity).play();
  mixers.push(mixer);
  return onTop(g);
};

const end = new Vector3();
const lift = new Vector3();
const fromArr = [0, 0, 0];
const endArr = [0, 0, 0];
const liftArr = [0, 0, 0];
const at = [0, 0, 0];
const next0 = [0, 0, 0];
const vel = new Vector3();
const FORWARD = new Vector3(0, 0, 1);
const SIDE = new Vector3(1, 0, 0);
const q = new Quaternion();
const tumble = new Quaternion();

/** Where a kind aims, in world space, on the head as drawn now. */
export const aimPoint = (kind: Kind, out: Vector3) => {
  stickPoint(kind, out);
  const h = live.head;
  return out
    .applyQuaternion(h.quaternion)
    .multiplyScalar(h.scale)
    .add(h.position);
};

export const Projectiles = ({
  onLand,
}: {
  /** A hit arrived (where, in world space): the prop sticks. */
  onLand: (kind: Kind, where: Vector3) => void;
}) => {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const camera = useThree((s) => s.camera);
  const { value: dartGltf } = useXRAsset(assetFor("funny-suction-dart"));
  const { value: fishGltf } = useXRAsset(assetFor("funny-fish-flop"));
  const mixers = useRef<AnimationMixer[]>([]);
  const land = useRef(onLand);
  land.current = onLand;

  const slots = useMemo<Slot[] | null>(() => {
    if (!dartGltf || !fishGltf) return null;
    mixers.current = [];
    return Array.from({ length: SLOTS }, () => {
      const models: Record<Kind, Object3D> = {
        pie: buildPie(),
        dart: buildDart(dartGltf.scene),
        snow: buildSnowball(),
        fish: fishFlyer(fishGltf.scene, fishGltf.animations, mixers.current),
      };
      const group = new Group();
      KINDS.forEach((k) => {
        models[k].visible = false;
        group.add(models[k]);
      });
      group.visible = false;
      return {
        group,
        models,
        trail: makeTrail(),
        history: Array.from({ length: TRAIL }, () => new Vector3()),
        filled: 0,
        flight: null,
        from: new Vector3(),
        to: new Vector3(),
        dropped: -1,
        fall: new Vector3(),
        kind: "pie" as Kind,
        homing: false,
        t0: 0,
        axis: new Vector3(0, 1, 0),
        phase: 0,
      };
    });
  }, [dartGltf, fishGltf]);

  useEffect(
    () => () => mixers.current.forEach((m) => m.stopAllAction()),
    [slots],
  );

  /* eslint-disable no-param-reassign -- pooled objects, updated in place every frame */
  useFrame((state, dt) => {
    if (!slots) return;
    const now = state.clock.elapsedTime;
    mixers.current.forEach((m) => m.update(Math.min(dt, 0.1)));
    // Trail puffs in world units → pixels.
    const proj = camera.projectionMatrix.elements[5];
    const pxScale = (size.height * dpr * proj) / 2;

    // Take waiting launches into free slots.
    while (queue.length && live.head.visible) {
      const free = slots.find((s) => !s.flight);
      if (!free) break;
      const l = queue.shift() as Launch;
      const plan = planThrow(Math.random, l.duration);
      free.flight = plan;
      free.kind = l.kind;
      free.homing = !!l.homing;
      free.t0 = now;
      free.dropped = -1;
      free.filled = 0;
      free.axis.randomDirection();
      free.phase = Math.random() * Math.PI * 2;
      // Toward the face as it is now (a little off), just in front of it.
      aimPoint(l.kind, free.to);
      const sc = live.head.scale;
      free.to.x += plan.scatter[0] * sc;
      free.to.y += plan.scatter[1] * sc;
      free.to.z += HIT_FRONT * sc;
      // Past the screen edge, near the camera: on the ray through that edge
      // point, a share of the way to the face.
      free.from
        .set(plan.edge[0], plan.edge[1], 0.5)
        .unproject(camera)
        .sub(camera.position)
        .normalize()
        .multiplyScalar(plan.near * camera.position.distanceTo(free.to))
        .add(camera.position);
      KINDS.forEach((k) => {
        free.models[k].visible = k === l.kind;
      });
      const m = free.trail.material as ShaderMaterial;
      m.uniforms.uColor.value.set(LOOK[l.kind].trail);
    }

    const s = live.head.scale;
    slots.forEach((slot) => {
      const f = slot.flight;
      const { group, trail } = slot;
      if (!f) {
        group.visible = false;
        trail.visible = false;
        return;
      }
      const look = LOOK[slot.kind];
      const u = (now - slot.t0) / f.duration;
      if (slot.homing) {
        aimPoint(slot.kind, slot.to);
        slot.to.z += HIT_FRONT * s;
      }
      if (u >= 1 && slot.dropped < 0) {
        // Arrived: is the face still there?
        aimPoint(slot.kind, end);
        end.z += HIT_FRONT * s;
        if (slot.homing || end.distanceTo(slot.to) < HIT_RADIUS * s) {
          slot.flight = null;
          group.visible = false;
          trail.visible = false;
          land.current(slot.kind, slot.to);
          return;
        }
        // Dodged: it barely carries on, and drops away in front of you.
        slot.dropped = now;
        lift.set(0, f.arc * s, 0);
        const a = slot.from.toArray(fromArr);
        const b = slot.to.toArray(endArr);
        const l = lift.toArray(liftArr);
        arcAt(a, b, l, 1, at);
        arcAt(a, b, l, 0.98, next0);
        slot.fall
          .set(at[0] - next0[0], at[1] - next0[1], at[2] - next0[2])
          .multiplyScalar(0.2 / (0.02 * f.duration));
      }
      let shrink = 1;
      if (slot.dropped >= 0) {
        const t = now - slot.dropped;
        if (t >= DROP) {
          slot.flight = null;
          group.visible = false;
          trail.visible = false;
          return;
        }
        slot.fall.y -= GRAVITY * s * dt;
        group.position.addScaledVector(slot.fall, dt);
        vel.copy(slot.fall).normalize();
        shrink = 1 - (t / DROP) ** 2;
      } else {
        lift.set(0, f.arc * s, 0);
        const a = slot.from.toArray(fromArr);
        const b = slot.to.toArray(endArr);
        const l = lift.toArray(liftArr);
        arcAt(a, b, l, u, at);
        arcAt(a, b, l, u - 0.02, next0);
        group.position.fromArray(at);
        vel
          .set(at[0] - next0[0], at[1] - next0[1], at[2] - next0[2])
          .normalize();
      }
      // Lead with the hitting side, tumbling a little about the flight.
      q.setFromUnitVectors(FORWARD, vel);
      q.multiply(tumble.setFromAxisAngle(SIDE, look.lean));
      const t = now - slot.t0;
      tumble.setFromAxisAngle(
        slot.axis,
        Math.sin(t * 3 + slot.phase) * look.wobble,
      );
      q.multiply(tumble);
      tumble.setFromAxisAngle(FORWARD, t * look.spin + slot.phase);
      q.multiply(tumble);
      group.quaternion.copy(q);
      group.scale.setScalar(s * look.scale * Math.max(shrink, 1e-3));
      group.visible = true;

      // The trail: this frame's position first, older ones after.
      const { history } = slot;
      const last = history.pop() as Vector3;
      history.unshift(last.copy(group.position));
      slot.filled = Math.min(TRAIL, slot.filled + 1);
      const pos = trail.geometry.getAttribute("position") as BufferAttribute;
      const sz = trail.geometry.getAttribute("aSize") as BufferAttribute;
      const al = trail.geometry.getAttribute("aAlpha") as BufferAttribute;
      for (let i = 0; i < TRAIL; i += 1) {
        const p = history[Math.min(i, slot.filled - 1)];
        pos.setXYZ(i, p.x, p.y, p.z);
        const k = 1 - i / TRAIL;
        sz.setX(i, i < slot.filled ? look.puff * s * (0.35 + 0.65 * k) : 0);
        // The first puff sits inside the projectile; fade in from the second.
        al.setX(i, i === 0 ? 0 : 0.3 * k);
      }
      pos.needsUpdate = true;
      sz.needsUpdate = true;
      al.needsUpdate = true;
      (trail.material as ShaderMaterial).uniforms.uScale.value = pxScale;
      trail.visible = true;
    });
  });
  /* eslint-enable no-param-reassign */

  if (!slots) return null;
  return (
    <>
      {slots.map((slot, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <group key={i}>
          <primitive object={slot.group} />
          <primitive object={slot.trail} />
        </group>
      ))}
    </>
  );
};
