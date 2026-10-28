// What a pie or a snowball leaves on the face itself: a layer on the live
// face mesh (FaceAtlasLayer), so it moves with every expression.
//
// Pie: a thick, glossy, lumpy coat of cream from the forehead to the chin
// and over the cheeks. It slaps on from the middle in a blink, holds, then
// slowly slides down the face — leaving streaks behind it and dripping off
// the chin — and melts away. A few dollops stay on the cheeks and in the
// hair until it clears. A quick squash of the face (FaceLiquify) sells the
// hit.
//
// Snow: powdery patches over the forehead, nose and cheeks that turn wet
// and glossy as they melt, then are gone.
//
// Both are drawn by one shader: coverage from the rest face (canonical cm)
// with noise for lumpy edges, a bumpy normal for the shine, a soft shadow
// just outside the edge so the layer looks raised.
import { useCallback, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Matrix4,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector3,
  type Group,
  type InstancedMesh,
} from "three";
import {
  FaceAtlasLayer,
  FACE_ATLAS_TRIANGLES,
  FaceLiquify,
  MAKEUP_BLENDING,
  MAKEUP_RENDER_ORDER,
  type FaceAtlasMaterialContext,
  type FaceLiquifyCustomWarps,
} from "@vincentt-xr/sdk/face-effects";

import { ageOf, useOnFace } from "./hits";
import { live } from "./live";

const vertexShader = /* glsl */ `
  attribute vec3 restPosition;
  attribute float edge;
  varying vec3 vRest;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vEdge;
  void main() {
    vRest = restPosition;
    vEdge = edge;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uPresence;
  uniform float uSpread;
  uniform float uSlide;
  uniform float uMelt;
  uniform float uWet;
  uniform float uSeed;
  uniform float uSnow;
  varying vec3 vRest;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vEdge;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return v;
  }

  // Coverage at a rest-face point (cm): 1 inside the layer, 0 outside;
  // r is how far out, 1 at the edge.
  float field(vec2 q) {
    if (uSnow > 0.5) {
      // Snow: clumps over the forehead, nose and cheeks, skin between.
      vec2 d = (q - vec2(0.0, 2.5)) / vec2(6.5, 8.5);
      float clumps = fbm(q * 0.38 + uSeed);
      return max(length(d), 1.0 + (0.5 - clumps) * 5.0);
    }
    // Cream: forehead to chin, over the cheeks, a big lumpy edge that
    // stops short of the face's outline, so you see it sit on the skin.
    vec2 d = q - vec2(0.0, 0.0);
    float ry = d.y < 0.0 ? 10.2 : 8.6;
    return length(vec2(d.x / 6.3, d.y / ry)) + (fbm(q * 0.28 + uSeed) - 0.5) * 0.55;
  }

  void main() {
    vec2 p = vRest.xy;
    // Sliding down: what is here now was higher up.
    vec2 q = p + vec2(0.0, uSlide);
    // Streaks: in some columns, cream lags behind the slide.
    float lag = smoothstep(0.62, 0.8, noise(vec2(p.x * 1.1 + uSeed, 3.0)));
    vec2 q2 = p + vec2(0.0, uSlide * (1.0 - 0.85 * lag));
    float r = field(q);
    float r2 = field(q2);
    float cover = 1.0 - smoothstep(uSpread - 0.05, uSpread, r);
    float streak = (1.0 - smoothstep(uSpread - 0.05, uSpread, r2)) * lag * 0.95;
    streak *= step(0.01, uSlide);
    float c = max(cover, streak) * step(0.001, uSpread);
    // Melting away: noisy holes that grow.
    float m = fbm(p * 0.55 + uSeed * 3.0);
    c *= smoothstep(uMelt - 0.06, uMelt + 0.06, m);
    // Soft at the face's outline.
    c *= smoothstep(0.0, 0.5, vEdge);

    // A bumpy surface for the shine: the slope of the lumps.
    float e = 0.18;
    float s = uSnow > 0.5 ? 1.6 : 0.6;
    float h = fbm(q * s + uSeed);
    float hx = fbm((q + vec2(e, 0.0)) * s + uSeed);
    float hy = fbm((q + vec2(0.0, e)) * s + uSeed);
    float bump = uSnow > 0.5 ? 2.0 : 7.0;
    // Thick cream fills the face's dips: mostly its own lumps, a little face.
    vec3 face = normalize(mix(vNormal, vec3(0.0, 0.0, 1.0), uSnow > 0.5 ? 0.3 : 0.65));
    vec3 n = normalize(face + vec3(h - hx, h - hy, 0.0) * bump / e * 0.18);
    // Thick in the middle, thinner toward its edge.
    float thick = 1.0 - smoothstep(uSpread - 0.35, uSpread - 0.02, r);
    vec3 l = normalize(vec3(-0.25, 0.5, 0.85));
    vec3 v = normalize(vView);
    float diff = 0.55 + 0.5 * max(dot(n, l), 0.0);
    float gloss = uSnow > 0.5 ? mix(6.0, 50.0, uWet) : 70.0;
    float specK = uSnow > 0.5 ? mix(0.08, 0.7, uWet) : 1.0;
    float spec = pow(max(dot(n, normalize(l + v)), 0.0), gloss) * specK;
    // A broad soft sheen as well, so the cream reads wet and glossy.
    spec += pow(max(dot(n, normalize(l + v)), 0.0), 8.0) * (uSnow > 0.5 ? 0.0 : 0.12);
    vec3 base = uSnow > 0.5 ? vec3(0.95, 0.97, 1.0) : vec3(0.98, 0.93, 0.84);
    vec3 col = base * diff * (0.78 + 0.22 * thick);
    if (uSnow > 0.5) {
      // Glints in the powder, fewer as it melts.
      float g = step(0.985, hash(floor(p * 9.0) + uSeed)) * (1.0 - uWet);
      col += g * 0.5;
      // Wet snow lets some skin through.
      c *= 1.0 - 0.45 * uWet;
    }
    col += spec;
    // A soft shadow just outside the edge, so it sits on top of the skin.
    float shadow = (1.0 - cover) * (1.0 - smoothstep(uSpread, uSpread + 0.1, r));
    shadow *= smoothstep(uMelt - 0.06, uMelt + 0.06, m) * 0.35 * (1.0 - uSnow);
    float a = (c + shadow * (1.0 - c)) * uPresence;
    vec3 rgb = linearToOutputTexel(vec4(col, 1.0)).rgb * c * uPresence;
    gl_FragColor = vec4(rgb, a);
  }
`;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** 0 before `a`, 1 after `b`, strict ease-out between. */
const phase = (t: number, a: number, b: number) =>
  easeOut(clamp01((t - a) / (b - a)));

/** The pie's timeline (s since the hit). */
export const PIE = {
  spread: 0.12,
  slide: [1.3, 5.2] as const,
  /** How far it slides (cm). */
  slideCm: 9,
  melt: [4.9, 6.4] as const,
  drips: [1.8, 5.2] as const,
};
const SNOW = {
  spread: 0.1,
  wet: [1.2, 3.2] as const,
  melt: [2.4, 5.2] as const,
};

type Uniforms = {
  uSpread: { value: number };
  uSlide: { value: number };
  uMelt: { value: number };
  uWet: { value: number };
  uSeed: { value: number };
  uSnow: { value: number };
};

const makeUniforms = (snow: boolean): Uniforms => ({
  uSpread: { value: 0 },
  uSlide: { value: 0 },
  uMelt: { value: -0.2 },
  uWet: { value: 0 },
  uSeed: { value: 0 },
  uSnow: { value: snow ? 1 : 0 },
});

/** Every triangle of the face, the eye and mouth fills and nostrils too. */
const ALL = Array.from(
  { length: FACE_ATLAS_TRIANGLES.length / 3 },
  (_, i) => i,
);

const Layer = ({ uniforms, order }: { uniforms: Uniforms; order: number }) => {
  const material = useCallback(
    (ctx: FaceAtlasMaterialContext) =>
      new ShaderMaterial({
        ...MAKEUP_BLENDING,
        depthWrite: false,
        uniforms: { ...ctx.uniforms, ...uniforms },
        vertexShader,
        fragmentShader,
      }),
    [uniforms],
  );
  return (
    <FaceAtlasLayer triangles={ALL} renderOrder={order} material={material} />
  );
};

/** The squash on a pie hit: the face pinched in and knocked down a touch. */
const SQUASH: FaceLiquifyCustomWarps = {
  squash: { kind: "pinch", at: "faceCenter", radius: 2.4, strength: 0.75 },
  knock: {
    kind: "push",
    at: "faceCenter",
    radius: 2.6,
    strength: 0.45,
    direction: [0, -1],
  },
};
/** Seconds: in, then back out (strict ease-out). */
const SQUASH_IN = 0.05;
const SQUASH_OUT = 0.4;

export const FaceMess = () => {
  const on = useOnFace();
  const pie = useMemo(() => makeUniforms(false), []);
  const snow = useMemo(() => makeUniforms(true), []);
  const squash = useRef(0);
  const seenPie = useRef(-1);
  const seenSnow = useRef(-1);

  useFrame(() => {
    // Pie
    const ph = on.pie;
    if (ph && ph.id !== seenPie.current) {
      seenPie.current = ph.id;
      pie.uSeed.value = Math.random() * 50;
    }
    if (ph) {
      const t = ageOf(ph);
      pie.uSpread.value = 1.02 * phase(t, 0, PIE.spread);
      // Slow at first, faster as it goes, like something heavy giving way.
      const k = clamp01((t - PIE.slide[0]) / (PIE.slide[1] - PIE.slide[0]));
      pie.uSlide.value = PIE.slideCm * k * k;
      pie.uMelt.value =
        -0.2 + 1.3 * clamp01((t - PIE.melt[0]) / (PIE.melt[1] - PIE.melt[0]));
      squash.current =
        t < SQUASH_IN
          ? t / SQUASH_IN
          : 1 - phase(t, SQUASH_IN, SQUASH_IN + SQUASH_OUT);
    } else {
      pie.uSpread.value = 0;
      squash.current = 0;
    }
    // Snow
    const sh = on.snow;
    if (sh && sh.id !== seenSnow.current) {
      seenSnow.current = sh.id;
      snow.uSeed.value = Math.random() * 50;
    }
    if (sh) {
      const t = ageOf(sh);
      snow.uSpread.value = 1 * phase(t, 0, SNOW.spread);
      snow.uWet.value = phase(t, SNOW.wet[0], SNOW.wet[1]);
      snow.uMelt.value = -0.2 + 1.3 * phase(t, SNOW.melt[0], SNOW.melt[1]);
    } else snow.uSpread.value = 0;
  });

  return (
    <>
      <Layer uniforms={snow} order={MAKEUP_RENDER_ORDER.design} />
      <Layer uniforms={pie} order={MAKEUP_RENDER_ORDER.design + 0.01} />
      <FaceLiquify warps={SQUASH} weight={squash} />
    </>
  );
};

/** Dollops left behind: cheeks and hair (canonical cm, radius cm). */
const DOLLOPS: [number, number, number, number][] = [
  [-6.2, -2.2, 3.0, 0.9],
  [6.4, -3.2, 2.4, 0.7],
  [-4.5, 11.6, 2.6, 1.1],
  [3.2, 12.8, 1.4, 0.9],
];

const cream = new MeshStandardMaterial({ color: "#f3e6cf", roughness: 0.14 });

/**
 * The pie's leftovers on the head (inside FilteredHead, canonical cm): a
 * few glossy dollops on the cheeks and in the hair, shrinking away as the
 * cream melts.
 */
export const Dollops = () => {
  const on = useOnFace();
  const group = useRef<Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const h = on.pie;
    const t = h ? ageOf(h) : Infinity;
    const grow = phase(t, 0.02, 0.18);
    const gone = phase(t, PIE.melt[0] + 0.3, PIE.melt[1]);
    g.visible = !!h && gone < 1;
    g.children.forEach((c, i) => {
      const r = DOLLOPS[i][3] * grow * (1 - gone);
      c.scale.set(r, r * 0.62, r * 0.8);
    });
  });
  return (
    <group ref={group}>
      {DOLLOPS.map(([x, y, z], i) => (
        // A soft heap with a smaller blob slumped on top.
        // eslint-disable-next-line react/no-array-index-key
        <group key={i} position={[x, y, z]}>
          <mesh material={cream} renderOrder={5}>
            <sphereGeometry args={[1, 18, 12]} />
          </mesh>
          <mesh
            material={cream}
            renderOrder={5}
            position={[0.35, 0.75, 0.2]}
            scale={0.55}
          >
            <sphereGeometry args={[1, 14, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Drips at once, and how often one falls (s). */
const DRIPS = 6;
const DRIP_EVERY = 0.45;
const DRIP_FALL = 0.9;
/** The bottom of the chin (canonical cm). */
const CHIN = new Vector3(0, -10.4, 3.4);
const tmp = new Vector3();
const mat = new Matrix4();

/**
 * Cream dripping off the chin while the pie slides (world space, drawn
 * over everything): a drop gathers under the chin, stretches, and falls.
 */
export const Drips = () => {
  const on = useOnFace();
  const mesh = useRef<InstancedMesh>(null);
  const drops = useMemo(
    () =>
      Array.from({ length: DRIPS }, () => ({
        t0: -1,
        x: 0,
        start: new Vector3(),
        s: 1,
      })),
    [],
  );
  const last = useRef(-1);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const now = performance.now() / 1000;
    const h = on.pie;
    const t = h ? ageOf(h) : Infinity;
    const { head } = live;
    if (
      h &&
      t > PIE.drips[0] &&
      t < PIE.drips[1] &&
      now - last.current > DRIP_EVERY
    ) {
      last.current = now;
      const d = drops.reduce((a, b) => (b.t0 < a.t0 ? b : a));
      d.t0 = now;
      d.x = (Math.random() - 0.5) * 3.5;
      d.s = head.scale;
      tmp.set(CHIN.x + d.x, CHIN.y, CHIN.z);
      d.start
        .copy(tmp)
        .applyQuaternion(head.quaternion)
        .multiplyScalar(head.scale)
        .add(head.position);
    }
    drops.forEach((d, i) => {
      const a = d.t0 < 0 ? Infinity : now - d.t0;
      if (a > DRIP_FALL) {
        mat.makeScale(0, 0, 0);
      } else {
        // Gathers (first third), then falls and stretches.
        const gather = clamp01(a / 0.3);
        const fall = Math.max(0, a - 0.3);
        const r =
          d.s * (0.5 + 0.5 * easeOut(gather)) * (1 - clamp01((a - 0.7) / 0.2));
        mat.makeScale(r, r * (1.3 + 3 * fall), r);
        mat.setPosition(
          d.start.x,
          d.start.y - d.s * (0.6 + 420 * fall * fall),
          d.start.z,
        );
      }
      m.setMatrixAt(i, mat);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, DRIPS]}
      frustumCulled={false}
      renderOrder={906}
    >
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial
        color="#f3e6cf"
        roughness={0.14}
        transparent
        depthWrite
      />
    </instancedMesh>
  );
};
