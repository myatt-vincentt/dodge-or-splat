// Dev only: 1–4 throw a pie, a suction dart, a snowball or a fish that
// follows your face and always hits (5: a random one that also raises the
// bonk bump), 0 clears your face, P pauses / resumes the throws.
// window.__splat exposes the live readings, the counts (stats: thrown,
// hits, near, misses, breathers) and the same actions for debugging.
// Scene.tsx lazy-imports this behind an inline NODE_ENV check, so it never
// reaches production.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";

import { director } from "./director";
import { hits } from "./hits";
import { live } from "./live";
import { aimPoint, launch } from "./Projectiles";
import { KINDS, type Kind } from "./props";

const DevKeys = () => {
  const scene = useThree((st) => st.scene);
  useEffect(() => {
    const throwAt = (kind: Kind, bonk = false, duration = 0.9) => {
      director.forceBonk = director.forceBonk || bonk;
      director.throw({ kind, homing: true, duration });
    };
    (window as unknown as Record<string, unknown>).__splat = {
      live,
      scene,
      hits,
      director,
      stats: director.stats,
      throwAt,
      launch,
      /** Where a kind would land now (world). */
      aim: (kind: Kind) => aimPoint(kind, new Vector3()),
      /** Land a hit at once, without the flight. */
      hit: (kind: Kind, bonk = false) =>
        director.land(kind, aimPoint(kind, new Vector3()), bonk),
    };
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (e.key === "0") hits.clear();
      else if (e.key === "p") director.on = !director.on;
      else if (n >= 1 && n <= 4) throwAt(KINDS[n - 1]);
      else if (n === 5)
        throwAt(KINDS[Math.floor(Math.random() * KINDS.length)], true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scene]);
  return null;
};

export default DevKeys;
