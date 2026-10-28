// The head the accessories sit on: the SDK's canonical head fit, filtered.
//
// useCanonicalHeadFit solves the head pose from the face landmarks; we read
// its raw result (no SDK smoothing) and run it through HeadFilter (a
// speed-adaptive spring, headFilter.ts), so the head is steady at rest and
// moves smoothly between tracker results instead of stepping. The filtered
// pose drives one group, drawn straight into the scene (a portal, so no
// tracker group's own per-frame transform can sneak in a step), holding BOTH
// the depth-only v3 head occluder and the items: they can't drift apart.
// Children are in canonical centimetres.
//
// The neck bust is the SDK's NeckOccluder (its own fit, with the neck bend
// that keeps the shoulders level); it only hides what hangs behind the neck.
import { useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  type Group,
} from "three";
import { defineGltfAsset, useXRAsset } from "@vincentt-xr/sdk";
import {
  NeckOccluder,
  useCanonicalHeadFit,
} from "@vincentt-xr/sdk/face-effects";
import { FaceTracker } from "@vincentt-xr/sdk/tracking";

import { NECK_OCCLUDER_URL, OCCLUDER_URL } from "./props";
import { HeadFilter, type HeadPose } from "./headFilter";
import { live } from "./live";

/** Face inference rate: the filter fills the frames between. */
export const FACE_FPS = 20;

const occluderAsset = defineGltfAsset(OCCLUDER_URL);

/** The SDK's head-occluder draw order: before every accessory. */
const OCCLUDER_ORDER = -1;

/** Dev only: ?occ draws the occluders, to check the fit. */
export const showOccluders = () =>
  process.env.NODE_ENV !== "production" &&
  new URLSearchParams(window.location.search).has("occ");

/** The v3 head as a depth-only mesh (or a see-through one with ?occ). */
const HeadOccluderMesh = () => {
  const { value } = useXRAsset(occluderAsset);
  const object = useMemo(() => {
    if (!value) return null;
    const root = value.scene.clone();
    const debug = showOccluders();
    const material = new MeshBasicMaterial({
      color: 0xe6e6e6,
      colorWrite: debug,
      depthWrite: true,
      transparent: debug,
      opacity: debug ? 0.45 : 1,
    });
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.material = material;
      m.renderOrder = OCCLUDER_ORDER;
      m.frustumCulled = false;
    });
    return root;
  }, [value]);
  return object ? <primitive object={object} /> : null;
};

/** Reads the raw fit inside the FaceTracker and filters it. */
const FitSource = ({
  filter,
  onTracked,
}: {
  filter: HeadFilter;
  onTracked: (tracked: boolean) => void;
}) => {
  const target = useRef<Group>(null);
  const pose = useRef<HeadPose>({
    position: new Vector3(),
    quaternion: new Quaternion(),
    scale: 1,
  });
  useCanonicalHeadFit(target, {
    smoothing: 1,
    onFit: (fit) => {
      const p = pose.current;
      p.position.copy(fit.translation);
      p.quaternion.copy(fit.quaternion);
      p.scale = fit.scale;
      filter.update(performance.now() / 1000, p);
    },
    onTrackingChange: (tracked) => {
      if (!tracked) filter.reset();
      live.tracked = tracked;
      onTracked(tracked);
    },
  });
  // The hook needs an object to drive; this one is never seen.
  return <group ref={target} name="splat-raw" visible={false} />;
};

export const FilteredHead = ({
  children,
  onFace,
}: {
  children: ReactNode;
  /** Content inside the face tracker itself (the live face, unfiltered). */
  onFace?: ReactNode;
}) => {
  const scene = useThree((s) => s.scene);
  const filter = useMemo(() => new HeadFilter(), []);
  const head = useRef<Group>(null);
  const [tracked, setTracked] = useState(false);
  const out = useRef<HeadPose>({
    position: new Vector3(),
    quaternion: new Quaternion(),
    scale: 1,
  });

  // After the fit (its frame callback is registered first, inside the
  // tracker) and before drawing.
  useFrame(() => {
    const g = head.current;
    if (!g) return;
    const p = tracked
      ? filter.sample(performance.now() / 1000, out.current)
      : null;
    g.visible = !!p;
    live.head.visible = !!p;
    if (!p) return;
    g.position.copy(p.position);
    g.quaternion.copy(p.quaternion);
    g.scale.setScalar(p.scale);
    live.head.position.copy(p.position);
    live.head.quaternion.copy(p.quaternion);
    live.head.scale = p.scale;
  });

  return (
    <>
      <FaceTracker numFaces={1} targetFps={FACE_FPS}>
        <FitSource filter={filter} onTracked={setTracked} />
        <NeckOccluder
          url={NECK_OCCLUDER_URL}
          showDebugMaterial={showOccluders()}
          opacity={0.45}
        />
        {onFace}
      </FaceTracker>
      {createPortal(
        <group ref={head} visible={false}>
          <HeadOccluderMesh />
          {children}
        </group>,
        scene,
      )}
    </>
  );
};
