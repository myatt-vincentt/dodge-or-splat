// The only hint, wordless: at the start, a small ghost head (the SDK's hint
// face, soft white and see-through, with a faint glow so it reads on any
// background) low in the middle of the screen, below your face. A little
// see-through pie flies at it; it leans out of the way and the pie whooshes
// past, one side then the other. It fades in once your face is found and
// goes away for good after your first dodge (strict ease-out).
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  Vector3,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
} from "three";
// eslint-disable-next-line import/extensions
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
// eslint-disable-next-line import/extensions
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  FaceExpressionHint,
  type FaceExpressionHintProps,
} from "@vincentt-xr/sdk/instructions";

import { director } from "./director";
import { buildPie } from "./flyers";
import { live } from "./live";

const FACE_URL = "/models/face-v1.glb";

const HINT = {
  /** Head height on screen (CSS px), and its middle above the bottom edge. */
  px: 60,
  above: 150,
  /** How far from the camera it is drawn (world): in front of everything. */
  distance: 1.6,
  /** Seconds per pass (one side), after the face is found before it shows. */
  pass: 1.6,
  delay: 0.8,
  fade: 0.35,
  /** Over everything else in the scene. */
  order: 1000,
};

/** Ghost style: see-through white, no dark band, a faint white glow. */
const LOOK: FaceExpressionHintProps["look"] = {
  ghost: { core: 0.42, rim: 0.8, whiten: 0.75 },
  halo: false,
  glow: { size: 1.5, idle: 0.16, full: 0.26 },
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;
/** 0 → 1 → 0 over a pass, smooth. */
const bell = (t: number) => Math.sin(Math.PI * clamp01(t)) ** 2;

const ray = new Vector3();

export const Hint = () => {
  const camera = useThree((st) => st.camera);
  const face = useLoader(GLTFLoader, FACE_URL, (l) =>
    l.setMeshoptDecoder(MeshoptDecoder),
  );
  const root = useRef<Group>(null);
  const lean = useRef<Group>(null);
  const pieHolder = useRef<Group>(null);
  const size = useThree((st) => st.size);
  // A small see-through pie (its own materials, faded with the hint).
  const pie = useMemo(() => {
    const p: Object3D = buildPie();
    const mats: Material[] = [];
    p.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.renderOrder = HINT.order + 3;
      const c = (m.material as Material).clone();
      c.transparent = true;
      c.depthWrite = false;
      m.material = c;
      mats.push(c);
    });
    return { root: p, mats };
  }, []);
  const seen = useRef(-1);
  const gone = useRef(-1);

  useEffect(() => {
    const done = () => {
      if (gone.current < 0) gone.current = performance.now() / 1000;
    };
    director.onDodge.add(done);
    return () => {
      director.onDodge.delete(done);
    };
  }, []);

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const now = performance.now() / 1000;
    if (seen.current < 0 && live.head.visible) seen.current = now;
    const shown =
      seen.current < 0
        ? 0
        : easeOut((now - seen.current - HINT.delay) / HINT.fade);
    const left =
      gone.current < 0 ? 1 : 1 - easeOut((now - gone.current) / HINT.fade);
    const k = shown * left;
    g.visible = k > 0.01;
    if (!g.visible) return;
    // Pinned low in the middle of the screen, facing the camera, sized in
    // screen pixels.
    const tan = Math.tan(
      ((camera as { fov?: number }).fov ?? 45) * (Math.PI / 360),
    );
    const perPx = (2 * HINT.distance * tan) / size.height;
    const y = -1 + (2 * HINT.above) / size.height;
    ray.set(0, y, 0.5).unproject(camera).sub(camera.position);
    g.position
      .copy(camera.position)
      .addScaledVector(ray.normalize(), HINT.distance);
    g.quaternion.copy(camera.quaternion);
    g.scale.setScalar(Math.max(1e-4, HINT.px * perPx * k));
    pie.mats.forEach((m) => {
      // eslint-disable-next-line no-param-reassign
      m.opacity = 0.6 * k;
    });
    // One pass: the pie comes at the head, the head leans away, the pie
    // goes past on the other side. Then the same from the other side.
    const t = (now - seen.current) / HINT.pass;
    const side = Math.floor(t) % 2 === 0 ? 1 : -1;
    const u = t - Math.floor(t);
    // In head heights.
    const r = 0.9;
    const away = bell((u - 0.15) / 0.75);
    if (lean.current) {
      lean.current.position.x = -side * 0.32 * r * away;
      lean.current.rotation.z = side * 0.35 * away;
    }
    const ph = pieHolder.current;
    if (ph) {
      // From near the camera (big) to past the head (small), then gone.
      const p = clamp01(u / 0.8);
      ph.position.set(
        side * r * (0.75 - 0.6 * p),
        r * (-0.15 + 0.1 * p),
        r * (0.9 - 1.6 * p),
      );
      ph.scale.setScalar(
        0.018 * (1.2 - 0.6 * p) * (1 - clamp01((u - 0.7) / 0.1)) * k,
      );
      ph.rotation.set(0.9, 0, u * 4);
    }
  });

  return (
    <group ref={root} visible={false}>
      <group ref={lean}>
        <FaceExpressionHint
          expression="surprised"
          model={face.scene}
          height={1}
          orbit={0}
          look={LOOK}
          renderOrder={HINT.order + 2}
        />
      </group>
      <group ref={pieHolder}>
        <primitive object={pie.root} />
      </group>
    </group>
  );
};
