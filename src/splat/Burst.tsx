// The moment of a hit, in world space where it landed, drawn over
// everything (after DepthClear) and bursting toward the viewer:
//   pie   — a big burst of glossy cream blobs, and the pie tin dropping away
//   snow  — a powdery puff and a few clumps
//   dart  — a THWACK: a bright flash and a ring of sparks
//   fish  — a wet slap: a splash of water droplets
// Every kind gets a quick flash. Blobs fly out and toward the camera (so
// they grow as they come), fall a little, and shrink away. Strict ease-out.
import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Material,
} from "three";

import { buildTin, onTop } from "./flyers";
import { live } from "./live";
import type { Kind } from "./props";

/** Bursts at once (a new one takes the oldest). */
const POOL = 3;
const BLOBS = 32;
const POWDER = 90;
/**
 * Draw order: over the projectiles, and after the face squash
 * (FaceLiquify, 998), so the squash never smears the burst.
 */
const ORDER = 998.2;
/** The tin's size: the thrown pie's, as it arrives. */
const TIN = 0.36;
/** Flecks in the splat ring at the moment of impact. */
const FLECKS = 30;

type Style = {
  /** Blobs: count, size range (cm), speed range (cm/s), how much toward the camera. */
  blobs: number;
  size: [number, number];
  speed: [number, number];
  toward: number;
  colors: string[];
  /** Glossy cream / see-through water / plain. */
  look: "cream" | "water" | "snow" | "spark";
  /** Seconds the blobs fly. */
  life: number;
  powder: number;
  flash: number;
  tin: boolean;
};

const STYLE: Record<Kind, Style> = {
  pie: {
    blobs: 32,
    size: [0.35, 2.4],
    speed: [40, 100],
    toward: 0.6,
    colors: ["#f2e6d2", "#f8efe1", "#e8d8bf"],
    look: "cream",
    life: 0.9,
    powder: 0,
    flash: 9,
    tin: true,
  },
  snow: {
    blobs: 12,
    size: [0.8, 2],
    speed: [30, 80],
    toward: 1,
    colors: ["#ffffff", "#eef6ff"],
    look: "snow",
    life: 0.8,
    powder: 90,
    flash: 8,
    tin: false,
  },
  dart: {
    blobs: 12,
    size: [0.35, 0.8],
    speed: [50, 110],
    toward: 0.4,
    colors: ["#ffe27a", "#ff8a1f", "#ffffff"],
    look: "spark",
    life: 0.45,
    powder: 0,
    flash: 7,
    tin: false,
  },
  fish: {
    blobs: 28,
    size: [0.35, 1.1],
    speed: [45, 110],
    toward: 1,
    colors: ["#d8f2ff", "#a6dcff", "#ffffff"],
    look: "water",
    life: 0.75,
    powder: 0,
    flash: 7,
    tin: false,
  },
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;

type Event = { kind: Kind; at: number; where: Vector3 };
const events: Event[] = [];
/** A hit just landed here (world): burst. */
export const burst = (kind: Kind, where: Vector3) => {
  events.push({ kind, at: performance.now() / 1000, where: where.clone() });
};

const powderVertex = /* glsl */ `
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
const powderFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.1, d);
    if (a <= 0.0) discard;
    gl_FragColor = vec4(vec3(1.0), a * vAlpha);
  }
`;

type Particle = { v: Vector3; size: number; spin: number };

type One = {
  group: Group;
  flash: Mesh;
  blobs: InstancedMesh;
  powder: Points;
  tin: Group;
  kind: Kind;
  t0: number;
  /** World units per cm at the time of the hit. */
  s: number;
  parts: Particle[];
  dust: Particle[];
  tinV: Vector3;
  tinSpin: Vector3;
  /** The splat ring: flecks round the impact, in the plane facing you. */
  flecks: InstancedMesh;
  fleckAt: { a: number; r: number; size: number }[];
};

const m4 = new Matrix4();
const pos = new Vector3();
const scl = new Vector3();
const turn = new Quaternion();
const col = new Color();
const ax = new Vector3();
const right = new Vector3();
const up = new Vector3();
const spin = new Quaternion();

/** A round but irregular blob, the same for every splatter drop. */
const lumpy = () => {
  const g = new IcosahedronGeometry(1, 2);
  const at = g.getAttribute("position");
  const v = new Vector3();
  for (let i = 0; i < at.count; i += 1) {
    v.fromBufferAttribute(at, i);
    const n = Math.sin(v.x * 3.1 + v.y * 1.7) * Math.cos(v.z * 2.3 - v.x * 1.1);
    v.multiplyScalar(1 + 0.14 * n);
    at.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
};

const materials = () => {
  const cream = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.34 });
  const water = new MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
  });
  const snow = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.95 });
  const spark = new MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
  const all: Record<Style["look"], Material> = { cream, water, snow, spark };
  Object.values(all).forEach((m) => {
    // eslint-disable-next-line no-param-reassign
    m.transparent = true;
    // eslint-disable-next-line no-param-reassign
    m.depthWrite = true;
  });
  return all;
};

export const Burst = () => {
  const size = useThree((st) => st.size);
  const dpr = useThree((st) => st.viewport.dpr);
  const camera = useThree((st) => st.camera);
  const looks = useMemo(materials, []);

  const pool = useMemo<One[]>(() => {
    const blobGeo = lumpy();
    const fleckGeo = new SphereGeometry(1, 10, 6);
    return Array.from({ length: POOL }, () => {
      const group = new Group();
      group.visible = false;
      const flash = new Mesh(
        new CircleGeometry(1, 40),
        new MeshBasicMaterial({
          color: "#ffffff",
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: AdditiveBlending,
          toneMapped: false,
        }),
      );
      flash.renderOrder = ORDER;
      const blobs = new InstancedMesh(blobGeo, looks.cream, BLOBS);
      blobs.instanceMatrix.setUsage(DynamicDrawUsage);
      blobs.renderOrder = ORDER + 1;
      const geo = new BufferGeometry();
      geo.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(POWDER * 3), 3),
      );
      geo.setAttribute(
        "aSize",
        new BufferAttribute(new Float32Array(POWDER), 1),
      );
      geo.setAttribute(
        "aAlpha",
        new BufferAttribute(new Float32Array(POWDER), 1),
      );
      const powder = new Points(
        geo,
        new ShaderMaterial({
          uniforms: { uScale: { value: 1 } },
          vertexShader: powderVertex,
          fragmentShader: powderFragment,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        }),
      );
      powder.renderOrder = ORDER + 2;
      const tin = new Group();
      tin.add(buildTin());
      onTop(tin);
      tin.traverse((o) => {
        // After the face squash too.
        // eslint-disable-next-line no-param-reassign
        o.renderOrder = ORDER - 0.1;
      });
      const flecks = new InstancedMesh(fleckGeo, looks.cream, FLECKS);
      flecks.instanceMatrix.setUsage(DynamicDrawUsage);
      flecks.renderOrder = ORDER + 1;
      [flash, blobs, powder, tin, flecks].forEach((o) => {
        // eslint-disable-next-line no-param-reassign
        o.frustumCulled = false;
        group.add(o);
      });
      return {
        group,
        flash,
        blobs,
        powder,
        tin,
        kind: "pie" as Kind,
        t0: -1,
        s: 1,
        parts: Array.from({ length: BLOBS }, () => ({
          v: new Vector3(),
          size: 0,
          spin: 0,
        })),
        dust: Array.from({ length: POWDER }, () => ({
          v: new Vector3(),
          size: 0,
          spin: 0,
        })),
        tinV: new Vector3(),
        tinSpin: new Vector3(),
        flecks,
        fleckAt: Array.from({ length: FLECKS }, () => ({
          a: 0,
          r: 0,
          size: 0,
        })),
      };
    });
  }, [looks]);

  /* eslint-disable no-param-reassign -- pooled objects, updated in place every frame */
  useFrame(() => {
    const now = performance.now() / 1000;
    while (events.length) {
      const e = events.shift() as Event;
      const one = pool.reduce((a, b) => (b.t0 < a.t0 ? b : a));
      const st = STYLE[e.kind];
      one.kind = e.kind;
      one.t0 = e.at;
      one.s = live.head.scale;
      one.group.position.copy(e.where);
      one.blobs.material = looks[st.look];
      one.parts.forEach((p, i) => {
        const a = Math.random() * Math.PI * 2;
        const out = 0.5 + Math.random() * 0.5;
        p.v
          .set(
            Math.cos(a) * out,
            Math.sin(a) * out * 0.8 + 0.25,
            st.toward * (0.4 + Math.random() * 0.8),
          )
          .normalize()
          .multiplyScalar(
            st.speed[0] + Math.random() * (st.speed[1] - st.speed[0]),
          );
        // Lots of small ones, a few big.
        p.size =
          i < st.blobs
            ? st.size[0] + Math.random() ** 3 * (st.size[1] - st.size[0])
            : 0;
        p.spin = Math.random();
        one.blobs.setColorAt(i, col.set(st.colors[i % st.colors.length]));
      });
      if (one.blobs.instanceColor) one.blobs.instanceColor.needsUpdate = true;
      one.dust.forEach((p, i) => {
        const a = Math.random() * Math.PI * 2;
        p.v
          .set(Math.cos(a), Math.sin(a) * 0.8 + 0.1, 0.3 + Math.random() * 1.2)
          .normalize()
          .multiplyScalar(15 + Math.random() * 55);
        p.size = i < st.powder ? 2 + Math.random() * 4 : 0;
      });
      // The splat ring: flecks thrown out round the impact (cream only).
      one.fleckAt.forEach((f, i) => {
        f.a = (i / FLECKS) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        f.r = 0.75 + Math.random() * 0.5;
        f.size = st.tin ? 0.25 + Math.random() ** 2 * 0.6 : 0;
        one.flecks.setColorAt(i, col.set(st.colors[i % st.colors.length]));
      });
      if (one.flecks.instanceColor) one.flecks.instanceColor.needsUpdate = true;
      // The tin comes off the face and drops away, turning over.
      one.tin.visible = st.tin;
      one.tin.position.set(0, 0, 0);
      one.tin.rotation.set(-Math.PI / 2, 0, 0);
      one.tinV.set((Math.random() - 0.5) * 30, 25, 35);
      one.tinSpin.set(
        2.5 + Math.random() * 2,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 4,
      );
    }

    const pxScale =
      (size.height * dpr * camera.projectionMatrix.elements[5]) / 2;
    pool.forEach((one) => {
      const st = STYLE[one.kind];
      const t = one.t0 < 0 ? Infinity : now - one.t0;
      const end = Math.max(st.life, st.tin ? 1.4 : 0);
      one.group.visible = t < end;
      if (!one.group.visible) return;
      const { s } = one;

      // The flash: a quick bright disc facing the camera.
      const kf = Math.min(1, t / 0.18);
      one.flash.visible = kf < 1;
      one.flash.quaternion.copy(camera.quaternion);
      one.flash.scale.setScalar(st.flash * s * (0.6 + 0.6 * easeOut(kf)));
      (one.flash.material as MeshBasicMaterial).opacity =
        0.75 * (1 - easeOut(kf));

      // Blobs: out and toward the camera, falling a little, shrinking away.
      const k = Math.min(1, t / st.life);
      const fly = easeOut(k);
      one.parts.forEach((p, i) => {
        if (p.size === 0 || k >= 1) {
          one.blobs.setMatrixAt(i, m4.makeScale(0, 0, 0));
          return;
        }
        pos.copy(p.v).multiplyScalar(st.life * fly * 0.6);
        pos.y -= 60 * t * t;
        pos.multiplyScalar(s);
        const r = p.size * s * (1 - k ** 3);
        // Squashed flat as they leave, then a slight stretch along their
        // flight (sparks streak).
        const along = st.look === "spark" ? 3 : 0.55 + 0.65 * fly;
        scl.set(r * (1.25 - 0.2 * fly), r * (1.25 - 0.2 * fly), r * along);
        turn.setFromUnitVectors(ax.set(0, 0, 1), pos.clone().normalize());
        one.blobs.setMatrixAt(i, m4.compose(pos, turn, scl));
      });
      one.blobs.instanceMatrix.needsUpdate = true;

      // The ring spreads fast across the face and shrinks away.
      const kr = Math.min(1, t / 0.35);
      const ring = easeOut(kr);
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      one.fleckAt.forEach((f, i) => {
        if (f.size === 0 || kr >= 1) {
          one.flecks.setMatrixAt(i, m4.makeScale(0, 0, 0));
          return;
        }
        const d = (2 + 13 * ring) * f.r * s;
        pos
          .copy(right)
          .multiplyScalar(Math.cos(f.a) * d)
          .addScaledVector(up, Math.sin(f.a) * d * 0.85);
        const r = f.size * s * (1 - kr ** 2);
        // Flat drops, drawn out round the ring.
        scl.set(r * 1.6, r, r * 0.5);
        turn
          .copy(camera.quaternion)
          .multiply(spin.setFromAxisAngle(ax.set(0, 0, 1), f.a));
        one.flecks.setMatrixAt(i, m4.compose(pos, turn, scl));
      });
      one.flecks.instanceMatrix.needsUpdate = true;

      // Powder: soft white puffs drifting out and fading.
      const pa = one.powder.geometry.getAttribute(
        "position",
      ) as BufferAttribute;
      const ps = one.powder.geometry.getAttribute("aSize") as BufferAttribute;
      const pl = one.powder.geometry.getAttribute("aAlpha") as BufferAttribute;
      one.dust.forEach((p, i) => {
        pos.copy(p.v).multiplyScalar(fly * 0.7);
        pos.y -= 10 * t * t;
        pos.multiplyScalar(s);
        pa.setXYZ(i, pos.x, pos.y, pos.z);
        ps.setX(i, p.size * s * (1 + 1.5 * fly));
        pl.setX(i, p.size > 0 ? 0.55 * (1 - k) : 0);
      });
      pa.needsUpdate = true;
      ps.needsUpdate = true;
      pl.needsUpdate = true;
      (one.powder.material as ShaderMaterial).uniforms.uScale.value = pxScale;

      // The tin falls away under gravity, turning over, and shrinks out.
      if (st.tin) {
        const tt = Math.min(t, 1.4);
        one.tin.position
          .copy(one.tinV)
          .multiplyScalar(tt)
          .add(pos.set(0, -260 * tt * tt, 0))
          .multiplyScalar(s);
        one.tin.rotation.set(
          -Math.PI / 2 + one.tinSpin.x * tt,
          one.tinSpin.y * tt,
          one.tinSpin.z * tt,
        );
        one.tin.scale.setScalar(
          s * TIN * (t > 1.1 ? 1 - easeOut((t - 1.1) / 0.3) : 1),
        );
      }
    });
  });
  /* eslint-enable no-param-reassign */

  return (
    <>
      {pool.map((one, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <primitive key={i} object={one.group} />
      ))}
    </>
  );
};
