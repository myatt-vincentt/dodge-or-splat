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
import { createPortal, useFrame } from "@react-three/fiber";
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
  useFaceAtlasSurface,
  type FaceLiquifyCustomWarps,
} from "@vincentt-xr/sdk/face-effects";

import { ageOf, useOnFace } from "./hits";

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
    // Big irregular lobes round the outline (by angle), so no two sides
    // match.
    float ang = atan(d.y, d.x);
    r += (noise(vec2(ang * 1.6 + uSeed, uSeed)) - 0.5) * 0.5;
    r += (fbm(q * 0.26 + uSeed) - 0.5) * 0.4;
    // Small lumps all along the outline.
    r += (noise(q * 1.25 + uSeed * 2.0) - 0.5) * 0.22;
    // Gaps at the temples and along the jaw, where the cream missed.
    vec2 tl = vec2(abs(q.x) - 6.2, q.y - 4.5);
    vec2 jw = vec2(abs(q.x) - 5.0, q.y + 7.5);
    float gap = max(
      1.0 - length(tl / vec2(1.8, 2.6)) + (noise(q * 0.9 + uSeed) - 0.5),
      1.0 - length(jw / vec2(2.0, 1.6)) + (noise(q * 0.9 - uSeed) - 0.5));
    r += max(gap, 0.0) * 0.9;
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
    drip *= smoothstep(3.0, -1.0, p.y);
    // How thick it is here: thin at the edge and drips, and piled up
    // unevenly in the middle.
    float thick = 1.0 - smoothstep(uSpread - 0.5, uSpread - 0.05, r);
    float pile = fbm(q * 0.18 + uSeed * 1.7);
    thick *= 0.55 + 0.9 * pile;
    float cover = max(body, max(blob * 0.9, drip * 0.85));
    float alpha = cover * mix(0.5, 1.0, clamp(max(thick, blob * 0.6), 0.0, 1.0));
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
    float diff = 0.55 + 0.5 * max(dot(n, l), 0.0);
    float spec = pow(max(dot(n, hv), 0.0), 70.0) * 0.9;
    spec += pow(max(dot(n, hv), 0.0), 8.0) * 0.1;
    // Piled-up cream sits in its own soft shade at the dips between heaps.
    float heap = smoothstep(0.25, 0.75, pile);
    vec3 base = mix(vec3(0.9, 0.84, 0.74), vec3(0.99, 0.95, 0.87), heap);
    vec3 col3 = base * diff * (0.78 + 0.22 * clamp(thick, 0.0, 1.0));
    col3 += spec * min(1.0, alpha * 1.4) * (0.6 + 0.4 * heap);
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

/** Dollops left in the hair (canonical cm, radius cm). */
const DOLLOPS: [number, number, number, number][] = [
  [-4.5, 11.6, 2.6, 1.1],
  [3.2, 12.8, 1.4, 0.9],
];

const cream = new MeshStandardMaterial({ color: "#f3e6cf", roughness: 0.14 });

/**
 * The pie's leftovers in the hair (inside FilteredHead, canonical cm): a
 * few glossy dollops, shrinking away as the cream clears.
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

const mat = new Matrix4();

/** Drips at once, and how often one starts. */
const DRIPS = 6;
const DRIP_EVERY = 0.45;
/** Seconds a drop hangs from the chin, then falls (fast) and is gone. */
const DRIP_HANG = 0.55;
const DRIP_FALL = 0.22;
/** Face landmarks along the bottom of the chin and jaw, where drops hang. */
const CHIN_MARKS = [152, 148, 377, 176, 400, 149, 378];
/** Cheek landmarks (each side) for the dollops left on the cheeks. */
const CHEEK_MARKS: [number, number][] = [
  [205, 0.9],
  [425, 0.75],
];
const cheekCream = new MeshStandardMaterial({
  color: "#f3e6cf",
  roughness: 0.14,
});

/**
 * On the live face mesh itself (the face layer's own pose group, canonical
 * cm), so they sit exactly on the cream: drops hanging from the chin and
 * jaw — swelling and stretching, then letting go to fall fast and vanish —
 * and the dollops left on the cheeks.
 */
export const OnFace = () => {
  const handle = useFaceAtlasSurface();
  const on = useOnFace();
  const mesh = useRef<InstancedMesh>(null);
  const cheeks = useRef<Group>(null);
  const drops = useMemo(
    () =>
      Array.from({ length: DRIPS }, () => ({
        t0: -1,
        mark: 152,
        at: new Vector3(),
      })),
    [],
  );
  const last = useRef(-1);
  useFrame(() => {
    const m = mesh.current;
    if (!m || !handle) return;
    const points = handle.geometry.getAttribute("position");
    const now = performance.now() / 1000;
    const h = on.pie;
    const t = h ? ageOf(h) : Infinity;
    if (
      h &&
      t > PIE.drops[0] &&
      t < PIE.drops[1] &&
      now - last.current > DRIP_EVERY
    ) {
      last.current = now;
      const d = drops.reduce((a, b) => (b.t0 < a.t0 ? b : a));
      d.t0 = now;
      d.mark = CHIN_MARKS[Math.floor(Math.random() * CHIN_MARKS.length)];
    }
    drops.forEach((d, i) => {
      const a = d.t0 < 0 ? Infinity : now - d.t0;
      if (!h || a > DRIP_HANG + DRIP_FALL) {
        mat.makeScale(0, 0, 0);
        m.setMatrixAt(i, mat);
        return;
      }
      // Hangs from its point on the chin while it swells and stretches.
      if (a <= DRIP_HANG) d.at.fromBufferAttribute(points, d.mark);
      const hang = clamp01(a / DRIP_HANG);
      const fall = Math.max(0, a - DRIP_HANG);
      const r = (0.22 + 0.22 * easeOut(hang)) * (1 - clamp01(fall / DRIP_FALL));
      const stretch = 1.4 + 1.4 * hang + 6 * fall;
      mat.makeScale(r, r * stretch, r);
      mat.setPosition(
        d.at.x,
        d.at.y - r * stretch * 0.75 - 900 * fall * fall,
        d.at.z + 0.2,
      );
      m.setMatrixAt(i, mat);
    });
    m.instanceMatrix.needsUpdate = true;

    // The cheek dollops ride their cheek points, shrinking as it clears.
    const g = cheeks.current;
    if (!g) return;
    const grow = phase(t, 0.02, 0.18);
    const gone = phase(t, PIE.thin[1] - 0.9, PIE.thin[1]);
    g.visible = !!h && gone < 1;
    g.children.forEach((c, i) => {
      const [mark, size] = CHEEK_MARKS[i];
      c.position.fromBufferAttribute(points, mark);
      const r = size * grow * (1 - gone);
      c.scale.set(r, r * 0.62, r * 0.8);
      // eslint-disable-next-line no-param-reassign -- this dollop's own mesh
      c.position.z += 0.4;
    });
  });
  if (!handle) return null;
  return createPortal(
    <>
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
      <group ref={cheeks}>
        {CHEEK_MARKS.map(([mark]) => (
          <mesh key={mark} material={cheekCream} renderOrder={5}>
            <sphereGeometry args={[1, 18, 12]} />
          </mesh>
        ))}
      </group>
    </>,
    handle.group,
  );
};
