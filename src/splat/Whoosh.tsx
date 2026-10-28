// A near miss: a quick whoosh of speed streaks beside your face, on the
// side the throw went past, running out the way it went and fading
// (strict ease-out). World space, drawn over everything.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";

/** Whooshes at once, and streaks in each. */
const POOL = 2;
const STREAKS = 6;
/** Seconds a whoosh lasts. */
const LIFE = 0.38;
/** Over the projectiles and the face squash. */
const ORDER = 998.3;

const easeOut = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// A thin bright line, soft across, fading toward its tail.
const fragmentShader = /* glsl */ `
  uniform float uAlpha;
  varying vec2 vUv;
  void main() {
    float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float along = smoothstep(0.0, 0.7, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
    float a = smoothstep(0.0, 0.6, across) * along * uAlpha;
    gl_FragColor = vec4(vec3(1.0), a);
  }
`;

type Event = { from: Vector3; face: Vector3; s: number; at: number };
const events: Event[] = [];

/** A throw went close past the face: whoosh between it and the face. */
export const whoosh = (where: Vector3, face: Vector3, s: number) => {
  events.push({
    from: where.clone(),
    face: face.clone(),
    s,
    at: performance.now() / 1000,
  });
};

type One = {
  group: Group;
  streaks: Mesh[];
  /** Each streak's offset across the pass (cm) and length (cm). */
  lanes: { across: number; length: number; delay: number }[];
  t0: number;
  s: number;
};

const dir = new Vector3();

export const Whoosh = () => {
  const pool = useMemo<One[]>(() => {
    const plane = new PlaneGeometry(1, 1);
    // Left edge at the origin, so a streak grows out from its start.
    plane.translate(0.5, 0, 0);
    return Array.from({ length: POOL }, () => {
      const group = new Group();
      group.visible = false;
      const streaks = Array.from({ length: STREAKS }, () => {
        const m = new Mesh(
          plane,
          new ShaderMaterial({
            uniforms: { uAlpha: { value: 0 } },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthTest: false,
            depthWrite: false,
          }),
        );
        m.renderOrder = ORDER;
        m.frustumCulled = false;
        group.add(m);
        return m;
      });
      return {
        group,
        streaks,
        lanes: streaks.map(() => ({ across: 0, length: 0, delay: 0 })),
        t0: -1,
        s: 1,
      };
    });
  }, []);

  useFrame(() => {
    const now = performance.now() / 1000;
    while (events.length) {
      const e = events.shift() as Event;
      const one = pool.reduce((a, b) => (b.t0 < a.t0 ? b : a));
      one.t0 = e.at;
      one.s = e.s;
      // From beside the face toward where the throw went, in the screen.
      dir.copy(e.from).sub(e.face);
      dir.z = 0;
      if (dir.lengthSq() < 1e-9) dir.set(1, 0, 0);
      dir.normalize();
      one.group.position
        .copy(e.face)
        .addScaledVector(dir, 5 * e.s)
        .setZ(Math.max(e.face.z, e.from.z) + 4 * e.s);
      one.group.rotation.set(0, 0, Math.atan2(dir.y, dir.x));
      one.lanes.forEach((l) => {
        /* eslint-disable no-param-reassign -- this whoosh's own lanes */
        l.across = (Math.random() - 0.5) * 11;
        l.length = 9 + Math.random() * 9;
        l.delay = Math.random() * 0.06;
        /* eslint-enable no-param-reassign */
      });
    }
    pool.forEach((one) => {
      const t = one.t0 < 0 ? Infinity : now - one.t0;
      /* eslint-disable no-param-reassign -- pooled, updated every frame */
      one.group.visible = t < LIFE;
      /* eslint-enable no-param-reassign */
      if (!one.group.visible) return;
      one.streaks.forEach((m, i) => {
        const l = one.lanes[i];
        const k = easeOut((t - l.delay) / (LIFE - l.delay));
        m.position.set(k * 10 * one.s, l.across * one.s, 0);
        m.scale.set(l.length * one.s * (1 - 0.4 * k), 0.55 * one.s, 1);
        const mat = m.material as ShaderMaterial;
        mat.uniforms.uAlpha.value = t < l.delay ? 0 : 0.95 * (1 - k);
      });
    });
  });

  return (
    <>
      {pool.map((one, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <primitive key={i} object={one.group} />
      ))}
    </>
  );
};
