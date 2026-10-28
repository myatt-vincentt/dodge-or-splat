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

/** A cream pie: foil tin, cream dome, dollops, a cherry. */
export const buildPie = () => {
  const pie = new Group();
  const body = new Group();
  // Built with the cream up (+Y), then turned so the cream leads (+Z).
  body.rotation.x = Math.PI / 2;
  pie.add(body);
  body.add(buildTin());
  const cream = standard("#fff8ec", 0.55);
  const dome = new Mesh(new SphereGeometry(1, 36, 18), cream);
  dome.scale.set(10.7, 2.6, 10.7);
  dome.position.y = 2.6;
  body.add(dome);
  const dollop = new SphereGeometry(1, 18, 12);
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2;
    const d = new Mesh(dollop, cream);
    d.scale.set(1.9, 1.5, 1.9);
    d.position.set(Math.cos(a) * 8.2, 4.1, Math.sin(a) * 8.2);
    body.add(d);
  }
  const top = new Mesh(dollop, cream);
  top.scale.set(2.8, 2.2, 2.8);
  top.position.y = 5.4;
  body.add(top);
  const cherry = new Mesh(dollop, standard("#e2263a", 0.25));
  cherry.scale.setScalar(1.3);
  cherry.position.y = 8.2;
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
