// The cartoon bonk bump: a glossy pink goose egg rising out of your hair,
// in canonical centimetres. It swells up on the bonk (strict ease-out) and
// goes down again at the end of its life. The dizzy birds and stars round
// it are the bonk model's own (Stuck.tsx).
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Quaternion, Vector3, type Group } from "three";
import { HEAD_ATTACHMENT_POINTS } from "@vincentt-xr/sdk/face-effects";

import { ageOf, type Hit } from "./hits";
import { BUMP_SPOT } from "./props";

/** Seconds to swell, and to go down at the end. */
const SWELL = 0.4;
const DOWN = 0.5;
/** The egg, cm: radius, and how much taller than wide. */
const RADIUS = 2.2;
const TALL = 1.15;
/** Above the scalp (cm): hair lifts it, so it sits on the hair. */
const HAIR = 1.2;

const easeOut = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

export const Bump = ({ hit, life }: { hit: Hit; life: number }) => {
  const egg = useRef<Group>(null);
  // Standing out of the scalp, along the line from the middle of the skull.
  const { position, quaternion } = useMemo(() => {
    const spot = new Vector3(...BUMP_SPOT);
    const up = spot
      .clone()
      .sub(new Vector3(...HEAD_ATTACHMENT_POINTS.headCenter))
      .normalize();
    return {
      position: spot.addScaledVector(up, HAIR),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), up),
    };
  }, []);

  useFrame(() => {
    const g = egg.current;
    if (!g) return;
    const t = ageOf(hit);
    const s = easeOut(t / SWELL) * (1 - easeOut((t - (life - DOWN)) / DOWN));
    g.visible = s > 0.01;
    g.scale.set(s, s * TALL, s);
  });

  return (
    <group position={position} quaternion={quaternion}>
      <group ref={egg} scale={0}>
        <mesh renderOrder={5} position={[0, RADIUS * 0.15, 0]}>
          <sphereGeometry args={[RADIUS, 32, 20]} />
          <meshStandardMaterial
            color="#ff8fa6"
            roughness={0.32}
            emissive="#ff6f8e"
            emissiveIntensity={0.18}
          />
        </mesh>
        {/* A soft shine, up and toward the camera. */}
        <mesh
          renderOrder={6}
          position={[-RADIUS * 0.35, RADIUS * 0.85, RADIUS * 0.55]}
          scale={[0.55, 0.32, 0.3]}
        >
          <sphereGeometry args={[1, 16, 10]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
        </mesh>
      </group>
    </group>
  );
};
