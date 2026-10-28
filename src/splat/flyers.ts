// The flying versions, in canonical centimetres, facing +Z (the side that
// hits you leads): a cream pie and a snowball built here; the suction dart
// and the fish taken from the same models that stick on your head.
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TubeGeometry,
  Curve,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from "three";

import { FRAME } from "./props";

/** Projectile draw order: after the depth clear, so nothing hides them. */
export const FLYER_ORDER = 910;

const standard = (color: string, roughness: number, metalness = 0) =>
  new MeshStandardMaterial({ color, roughness, metalness });

/** Every mesh drawn over everything (see FLYER_ORDER), with its own materials. */
export const onTop = (root: Object3D) => {
  const copies = new Map<Material, Material>();
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.frustumCulled = false;
    m.renderOrder = FLYER_ORDER;
    const one = (x: Material) => {
      let c = copies.get(x);
      if (!c) {
        c = x.clone();
        // The see-through queue, so it draws after the depth clear; still
        // solid and depth-tested against itself.
        c.transparent = true;
        c.depthWrite = true;
        copies.set(x, c);
      }
      return c;
    };
    m.material = Array.isArray(m.material)
      ? m.material.map(one)
      : one(m.material);
  });
  return root;
};

/** The foil pie tin, about 23 cm across, opening up (+Y). */
export const buildTin = () =>
  new Mesh(
    new LatheGeometry(
      [
        [0, 0],
        [8.6, 0],
        [10.9, 2.4],
        [11.6, 2.7],
        [11.6, 3.0],
        [10.7, 3.0],
      ].map(([x, y]) => new Vector2(x, y)),
      40,
    ),
    Object.assign(standard("#c9ced6", 0.32, 0.85), { side: DoubleSide }),
  );

/** A soft rope of whipped cream piped round and up into a peak. */
class Swirl extends Curve<Vector3> {
  public constructor() {
    super();
  }

  // eslint-disable-next-line class-methods-use-this
  getPoint(t: number, out = new Vector3()) {
    const turns = 2.6;
    const a = t * turns * Math.PI * 2;
    const r = 7.2 * (1 - t) ** 0.8 + 0.4;
    return out.set(Math.cos(a) * r, 3.4 + t * 5.2, Math.sin(a) * r);
  }
}

/**
 * A cream pie, built with the cream up (+Y) and turned so the cream faces
 * +Z: foil tin, a cream bed, a piped whipped-cream swirl with ridges, a
 * ring of rosettes and a glossy cherry on top.
 */
export const buildPie = () => {
  const pie = new Group();
  const body = new Group();
  body.rotation.x = Math.PI / 2;
  pie.add(body);
  body.add(buildTin());
  const cream = standard("#f7eedf", 0.32);
  const bed = new Mesh(new SphereGeometry(1, 36, 18), cream);
  bed.scale.set(10.8, 1.6, 10.8);
  bed.position.y = 2.7;
  body.add(bed);
  // The piped swirl: a fat tube whose thickness pulses, so it looks ridged.
  const path = new Swirl();
  const swirl = new TubeGeometry(path, 220, 1.9, 10, false);
  const pos = swirl.getAttribute("position");
  const v = new Vector3();
  const axis = new Vector3();
  for (let k = 0; k < pos.count; k += 1) {
    v.fromBufferAttribute(pos, k);
    const along = Math.floor(k / 11) / 220;
    const c = path.getPoint(along);
    axis.copy(v).sub(c);
    // Ridges round the rope, and a little taper at its tip.
    const ridge = 1 + 0.18 * Math.cos(Math.atan2(axis.y, axis.x) * 6);
    axis.multiplyScalar(ridge * (1 - 0.55 * along ** 3));
    v.copy(c).add(axis);
    pos.setXYZ(k, v.x, v.y, v.z);
  }
  swirl.computeVertexNormals();
  body.add(new Mesh(swirl, cream));
  const rosette = new SphereGeometry(1, 16, 10);
  for (let k = 0; k < 10; k += 1) {
    const a = (k / 10) * Math.PI * 2;
    const d = new Mesh(rosette, cream);
    d.scale.set(1.6, 1.3, 1.6);
    d.position.set(Math.cos(a) * 9.4, 3.6, Math.sin(a) * 9.4);
    body.add(d);
  }
  const cherry = new Mesh(
    new SphereGeometry(1.6, 20, 14),
    standard("#d81f35", 0.15),
  );
  cherry.position.y = 9.8;
  body.add(cherry);
  return onTop(pie);
};

/** Small hash noise, so the snowball is lumpy the same way every time. */
const lump = (p: Vector3) => {
  const s = Math.sin(p.x * 1.7 + p.y * 3.1) * Math.cos(p.z * 2.3 - p.y * 1.3);
  return s + 0.5 * Math.sin(p.x * 4.1 - p.z * 3.7 + p.y * 2.9);
};

/** A packed snowball, about 10 cm across, lumpy and soft. */
export const buildSnowball = () => {
  const geo: BufferGeometry = new IcosahedronGeometry(5, 5);
  const pos = geo.getAttribute("position");
  const v = new Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const r = 5 + 0.32 * lump(v);
    v.setLength(r);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mat = standard("#f6f9ff", 0.9);
  mat.emissive = new Color("#9db8d9");
  mat.emissiveIntensity = 0.12;
  const ball = new Group();
  ball.add(new Mesh(geo, mat));
  return onTop(ball);
};

/**
 * One dart out of the stuck model's own: its holder node, cup at the
 * origin, the shaft along its local Z (pointing back, so the cup leads).
 */
export const buildDart = (source: Object3D) => {
  const hold = source.getObjectByName("funny_dart_hold");
  const dart = new Group();
  if (!hold) return dart;
  const inner = hold.clone(true);
  inner.position.set(0, 0, 0);
  inner.quaternion.identity();
  // Shaft pointing away from the face (−Z), so the cup leads.
  inner.rotation.y = Math.PI;
  inner.scale.multiplyScalar(FRAME.scale);
  dart.add(inner);
  return onTop(dart);
};
