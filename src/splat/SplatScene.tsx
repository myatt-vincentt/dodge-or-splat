// Dodge or Splat: funny things are thrown at your face, endlessly — mostly
// cream pies, and suction darts, snowballs and fish — faster and faster
// (director.ts). Lean or duck and they whoosh past (Whoosh.tsx); stay put
// and they hit, hard (Burst.tsx), and stay a while: cream and snow on the
// face itself (FaceMess.tsx), the rest on the filtered head (Stuck.tsx;
// FilteredHead.tsx is the SDK's canonical head fit through a spring, with
// the depth-only head occluder in the same group), until they slide off,
// melt or pop off. Tap the screen to throw a pie yourself. Throws fly in
// world space (Projectiles.tsx) and draw over everything. A wordless hint
// shows how to dodge until you first do (Hint.tsx).
import { Suspense, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PMREMGenerator, type Mesh } from "three";
// eslint-disable-next-line import/extensions
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useFaceInfo, useGesture } from "@vincentt-xr/sdk/tracking";

import { director } from "./director";
import { FACE_FPS, FilteredHead } from "./FilteredHead";
import { live } from "./live";
import { Projectiles } from "./Projectiles";
import { Burst } from "./Burst";
import { Dollops, FaceMess, OnFace } from "./FaceMess";
import { Hint } from "./Hint";
import { Stuck } from "./Stuck";
import { Whoosh } from "./Whoosh";

/** The blendshapes the pieces' face_triggers read (see rig.ts). */
const FACE_INPUTS = [
  "jawOpen",
  "mouthSmileLeft",
  "mouthSmileRight",
  "browInnerUp",
  "browDownLeft",
  "browDownRight",
];
/** Per-second easing of the readings (higher = snappier, noisier). */
const FACE_EASE = 14;

/** Copies the face's blendshapes into `live` and counts head shakes. */
const FaceSignals = () => {
  // Same options as FilteredHead's FaceTracker: the first consumer of the
  // shared face model sets its face count and rate.
  const face = useFaceInfo({ active: true, numFaces: 1, targetFps: FACE_FPS });
  const raw = useRef<Readonly<Record<string, number | undefined>>>({});
  raw.current = face?.blendshapes ?? {};
  // Raw blendshapes flicker a few percent frame to frame; ease toward them.
  const smooth = useRef<Record<string, number>>({});
  useFrame((_st, dt) => {
    const k = 1 - Math.exp(-FACE_EASE * Math.min(dt, 0.1));
    const out = smooth.current;
    FACE_INPUTS.forEach((name) => {
      const v = raw.current[name] ?? 0;
      out[name] = (out[name] ?? v) + (v - (out[name] ?? v)) * k;
    });
    live.blendshapes = out;
  }, -1);
  useGesture("headShake", {
    onBegin: () => {
      live.shakes += 1;
    },
  });
  return null;
};

/** Soft studio reflections, so the props read on camera. */
const useStudioLight = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const before = scene.environment;
    scene.environment = tex;
    return () => {
      scene.environment = before;
      tex.dispose();
    };
  }, [gl, scene]);
};

/**
 * Clears the depth buffer once the head, its occluder and the stuck props
 * are drawn, so the projectiles and splashes after it draw over all of them.
 * (Everything after it is in the see-through queue, which draws last.)
 */
const DepthClear = () => {
  const ref = useRef<Mesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    m.onBeforeRender = (renderer) => {
      // The last see-through prop left depth writes off; a clear needs them.
      renderer.state.buffers.depth.setMask(true);
      renderer.clearDepth();
    };
  }, []);
  return (
    <mesh ref={ref} renderOrder={900} frustumCulled={false}>
      <planeGeometry args={[1e-4, 1e-4]} />
      <meshBasicMaterial
        transparent
        colorWrite={false}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
};

const Director = () => {
  useFrame(() => director.step(performance.now() / 1000));
  return null;
};

/**
 * Tap the picture to throw a pie at the face from there, so whoever holds
 * the phone can play the thrower. (Taps on controls over it don't count.)
 */
const TapToThrow = () => {
  const canvas = useThree((st) => st.gl.domElement);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      director.tap([
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -(((e.clientY - r.top) / r.height) * 2 - 1),
      ]);
    };
    canvas.addEventListener("pointerdown", onDown);
    return () => canvas.removeEventListener("pointerdown", onDown);
  }, [canvas]);
  return null;
};

export const SplatScene = () => {
  useStudioLight();
  return (
    <>
      <FaceSignals />
      <FilteredHead
        onFace={
          <>
            <FaceMess />
            <OnFace />
          </>
        }
      >
        <Stuck />
        <Dollops />
      </FilteredHead>
      <DepthClear />
      <Projectiles
        onLand={(kind, where) => director.land(kind, where)}
        onMiss={(kind, verdict) => director.miss(kind, verdict)}
      />
      <Burst />
      <Whoosh />
      <TapToThrow />
      <Suspense fallback={null}>
        <Hint />
      </Suspense>
      <Director />
    </>
  );
};
