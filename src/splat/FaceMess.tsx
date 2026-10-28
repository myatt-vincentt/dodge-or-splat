// What a pie or a snowball leaves on the face itself: a layer on the live
// face mesh (FaceAtlasLayer), so it moves with every expression.
//
// Pie: a thick, glossy, lumpy coat of whipped cream from the forehead to
// the chin and over the cheeks, with a soft broken-up edge. It slaps on in a
// blink with drips already running from the jaw and chin, holds, then
// slides down as one soft mass, thinning out from the top, dripping off the
// chin, until it is gone. A few dollops stay on the cheeks and in the hair
// until it clears. A quick squash of the face (FaceLiquify) sells the hit.
//
// Snow: powdery clumps over the forehead, nose and cheeks that turn wet and
// glossy as they melt, then are gone.
//
// Neither layer is drawn while its hit is off, so the face is untouched
// before a hit and after it clears.
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

const NOISE = /* glsl */ `
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
`;

/**
 * Whipped cream. Coverage comes from the rest face (canonical cm): a big
 * soft mass from the forehead to the chin, its outline broken up by lumps
 * and loose blobs, thinner and see-through toward its edge; drips running
 * down from the jaw and chin; the whole mass sliding down as one, thinning
 * out from the top until it is gone. A warm off-white, shaded by its own
 * lumps, with a sharp shine and a soft sheen.
 */
const creamShader = /* glsl */ `
  uniform float uPresence;
  uniform float uSpread;
  uniform float uSlide;
  uniform float uDrip;
  uniform float uThin;
  uniform float uSeed;
  varying vec3 vRest;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vEdge;
  ${NOISE}

  // How far out a rest-face point is: 1 at the cream's edge.
  float field(vec2 q) {
    vec2 d = q - vec2(0.0, 0.5);
    float ry = d.y < 0.0 ? 10.4 : 8.4;
    float r = length(vec2(d.x / 6.4, d.y / ry));
    r += (fbm(q * 0.26 + uSeed) - 0.5) * 0.5;
    // Small lumps all along the outline.
    r += (noise(q * 1.25 + uSeed * 2.0) - 0.5) * 0.2;
    return r;
  }

  void main() {
    if (uSpread <= 0.0) discard;
    vec2 p = vRest.xy;
    vec2 q = p + vec2(0.0, uSlide);
    float r = field(q);
    float body = 1.0 - smoothstep(uSpread - 0.14, uSpread + 0.02, r);
    // Loose blobs just past the edge.
    float blob = smoothstep(0.64, 0.72, noise(q * 0.8 + uSeed * 3.0));
    blob *= 1.0 - smoothstep(uSpread, uSpread + 0.3, r);
    // Drips: soft columns that run down from the bottom of the mass.
    float col = noise(vec2(p.x * 1.3 + uSeed, 7.0));
    float dm = smoothstep(0.55, 0.78, col);
    float len = uDrip * (1.5 + 7.0 * col);
    float rd = field(q + vec2(0.0, len * dm));
    float drip = (1.0 - smoothstep(uSpread - 0.1, uSpread + 0.02, rd)) * dm;
    drip *= step(p.y, 1.0);
    // How thick it is here: full in the middle, thin at the edge and drips.
    float thick = 1.0 - smoothstep(uSpread - 0.5, uSpread - 0.05, r);
    float cover = max(body, max(blob * 0.9, drip * 0.85));
    float alpha = cover * mix(0.5, 1.0, max(thick, blob * 0.6));
    // Thinning from the top as it clears: a soft front moving down.
    float front = 14.0 - 27.0 * uThin * uThin;
    alpha *= smoothstep(front + 4.0, front - 2.0, p.y);
    alpha *= 1.0 - 0.5 * uThin * uThin;
    // Soft at the face's outline.
    alpha *= smoothstep(0.0, 0.6, vEdge);

    // Its own lumps shade it: mostly them, a little of the face under it.
    float e = 0.18;
    float h = fbm(q * 0.6 + uSeed);
    float hx = fbm((q + vec2(e, 0.0)) * 0.6 + uSeed);
    float hy = fbm((q + vec2(0.0, e)) * 0.6 + uSeed);
    vec3 face = normalize(mix(vNormal, vec3(0.0, 0.0, 1.0), 0.65));
    vec3 n = normalize(face + vec3(h - hx, h - hy, 0.0) * 7.0);
    vec3 l = normalize(vec3(-0.25, 0.5, 0.85));
    vec3 v = normalize(vView);
    vec3 hv = normalize(l + v);
    float diff = 0.6 + 0.45 * max(dot(n, l), 0.0);
    float spec = pow(max(dot(n, hv), 0.0), 70.0) * 0.9;
    spec += pow(max(dot(n, hv), 0.0), 8.0) * 0.1;
    vec3 base = vec3(0.97, 0.92, 0.83);
    vec3 col3 = base * diff * (0.82 + 0.18 * thick) + spec * min(1.0, alpha * 1.4);
    float a = alpha * uPresence;
    gl_FragColor = vec4(linearToOutputTexel(vec4(col3, 1.0)).rgb * a, a);
  }
`;

/** Snow: powdery clumps over the forehead, nose and cheeks, melting wet. */
const snowShader = /* glsl */ `
  uniform float uPresence;
  uniform float uSpread;
  uniform float uWet;
  uniform float uThin;
  uniform float uSeed;
  varying vec3 vRest;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vEdge;
  ${NOISE}

  void main() {
    if (uSpread <= 0.0) discard;
    vec2 p = vRest.xy;
    vec2 d = (p - vec2(0.0, 2.5)) / vec2(6.5, 8.5);
    float clumps = fbm(p * 0.38 + uSeed);
    // Melting: the clumps shrink back to their densest middles.
    float r = max(length(d), 1.0 + (0.5 + 0.25 * uThin - clumps) * 5.0);
    float c = 1.0 - smoothstep(uSpread - 0.08, uSpread, r);
    c *= smoothstep(0.0, 0.6, vEdge);
    c *= (1.0 - 0.45 * uWet) * (1.0 - uThin);
    float e = 0.18;
    float h = fbm(p * 1.6 + uSeed);
    float hx = fbm((p + vec2(e, 0.0)) * 1.6 + uSeed);
    float hy = fbm((p + vec2(0.0, e)) * 1.6 + uSeed);
    vec3 face = normalize(mix(vNormal, vec3(0.0, 0.0, 1.0), 0.3));
    vec3 n = normalize(face + vec3(h - hx, h - hy, 0.0) * 2.0);
    vec3 l = normalize(vec3(-0.25, 0.5, 0.85));
    vec3 hv = normalize(l + normalize(vView));
    float diff = 0.6 + 0.45 * max(dot(n, l), 0.0);
    float spec = pow(max(dot(n, hv), 0.0), mix(6.0, 50.0, uWet)) * mix(0.08, 0.7, uWet);
    vec3 col = vec3(0.95, 0.97, 1.0) * diff + spec;
    // Glints in the powder, fewer as it melts.
    col += step(0.985, hash(floor(p * 9.0) + uSeed)) * (1.0 - uWet) * 0.5;
    float a = c * uPresence;
    gl_FragColor = vec4(linearToOutputTexel(vec4(col, 1.0)).rgb * a, a);
  }
`;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** 0 before `a`, 1 after `b`, strict ease-out between. */
const phase = (t: number, a: number, b: number) =>
  easeOut(clamp01((t - a) / (b - a)));
/** 0 before `a`, 1 after `b`, even in between. */
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** The pie's timeline (s since the hit). */
export const PIE = {
  spread: 0.12,
  /** Drips grow from the jaw and chin. */
  drip: [0.25, 2.6] as const,
  /** The mass slides down, slowly at first (cm by the end). */
  slide: [1.6, 6.2] as const,
  slideCm: 15,
  /** It thins out from the top until it is gone. */
  thin: [3.4, 6.4] as const,
  /** Drops falling off the chin. */
  drops: [0.5, 5.6] as const,
};
const SNOW = {
  spread: 0.1,
  wet: [1.2, 3.2] as const,
  thin: [2.6, 5.3] as const,
};

type Uniforms = Record<
  "uSpread" | "uSlide" | "uDrip" | "uThin" | "uWet" | "uSeed",
  { value: number }
>;

const makeUniforms = (): Uniforms => ({
  uSpread: { value: 0 },
  uSlide: { value: 0 },
  uDrip: { value: 0 },
  uThin: { value: 0 },
  uWet: { value: 0 },
  uSeed: { value: 0 },
});

/** Every triangle of the face, the eye and mouth fills and nostrils too. */
const ALL = Array.from(
  { length: FACE_ATLAS_TRIANGLES.length / 3 },
  (_, i) => i,
);

const Layer = ({
  uniforms,
  shader,
  order,
  visible,
}: {
  uniforms: Uniforms;
  shader: string;
  order: number;
  /** Only drawn while its hit is on: nothing on the face otherwise. */
  visible: boolean;
}) => {
  const material = useCallback(
    (ctx: FaceAtlasMaterialContext) =>
      new ShaderMaterial({
        ...MAKEUP_BLENDING,
        depthWrite: false,
        uniforms: { ...ctx.uniforms, ...uniforms },
        vertexShader,
        fragmentShader: shader,
      }),
    [uniforms, shader],
  );
  return (
    <FaceAtlasLayer
      triangles={ALL}
      renderOrder={order}
      material={material}
      visible={visible}
    />
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
  const pie = useMemo(makeUniforms, []);
  const snow = useMemo(makeUniforms, []);
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
      pie.uDrip.value = phase(t, PIE.drip[0], PIE.drip[1]);
      // Slow at first, faster as it goes, like something heavy giving way.
      pie.uSlide.value = PIE.slideCm * ramp(t, PIE.slide[0], PIE.slide[1]) ** 2;
      pie.uThin.value = ramp(t, PIE.thin[0], PIE.thin[1]);
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
      snow.uSpread.value = phase(t, 0, SNOW.spread);
      snow.uWet.value = phase(t, SNOW.wet[0], SNOW.wet[1]);
      snow.uThin.value = ramp(t, SNOW.thin[0], SNOW.thin[1]);
    } else snow.uSpread.value = 0;
  });

  return (
    <>
      <Layer
        uniforms={snow}
        shader={snowShader}
        order={MAKEUP_RENDER_ORDER.design}
        visible={!!on.snow}
      />
      <Layer
        uniforms={pie}
        shader={creamShader}
        order={MAKEUP_RENDER_ORDER.design + 0.01}
        visible={!!on.pie}
      />
      <FaceLiquify warps={SQUASH} weight={squash} active={!!on.pie} />
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
    const gone = phase(t, PIE.thin[1] - 0.9, PIE.thin[1]);
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
      t > PIE.drops[0] &&
      t < PIE.drops[1] &&
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
