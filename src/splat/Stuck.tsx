// What sticks to your head for a while, in canonical centimetres (inside
// FilteredHead). Each lands with its own moment and then leaves its own way,
// so the face never gets buried:
//   dart — THWACK: it twangs and wobbles on the forehead, then pops off
//   snow — a snow pile on the head that sags as it melts, then sinks away
//   fish — a wet slap; it flops, then slides off the side of your head
//   bump — a cartoon bonk bump that swells, then goes down
// The pie and the snow on the face itself are FaceMess.tsx.
//
// The pieces are authored to sit on the head; `tilt` turns one about the
// middle of the skull so pieces that would share a spot spread out.
import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { LoopOnce, type Group, type Mesh } from "three";
import { HEAD_ATTACHMENT_POINTS } from "@vincentt-xr/sdk/face-effects";

import { Bump } from "./Bump";
import { ageOf, LIFE, useOnFace, type Hit } from "./hits";
import { Part, type Arrange } from "./Part";
import { BUMP, BUMP_TILT, FRAME, STICK, type Part as PartSpec } from "./props";

const SKULL = HEAD_ATTACHMENT_POINTS.headCenter;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;
/** Falling things speed up (gravity), so their way off eases in. */
const easeIn = (t: number) => clamp01(t) ** 2;

/** Seconds since this arrange's first frame. */
const clock = () => {
  let t0 = -1;
  return (t: number) => {
    if (t0 < 0) t0 = t;
    return t - t0;
  };
};

/** Plays a model's clip once, `after` seconds in. */
const playOnce =
  (clip: string, after: number): Arrange =>
  (_root, mixer, clips) => {
    const age = clock();
    const c = clips.find((x) => x.name === clip);
    let done = false;
    return {
      tick: (t) => {
        if (done || !c || age(t) < after) return;
        done = true;
        mixer.clipAction(c).setLoop(LoopOnce, 1).reset().play();
      },
    };
  };

/**
 * The bonk model: only its dizzy birds and stars, which circle on each
 * bonk. Its own lump is a skin-tone patch made for a bare scalp, so the
 * bump is our own (Bump.tsx).
 */
const birdsOnly: Arrange = (root) => {
  const lump = root.getObjectByName("funny_bonk_bump_mesh");
  if (lump) lump.visible = false;
  return {};
};

/** Seconds the snow pile takes to sag as it melts. */
const MELT: [number, number] = [1.6, 4.4];

/** The snow pile: just the snow (no snowman), sagging as it melts. */
const snowMelt: Arrange = (root) => {
  const age = clock();
  const figure = root.getObjectByName("funny_snow_look_snowman");
  if (figure) figure.scale.setScalar(0);
  const meshes: Mesh[] = [];
  root.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh && m.morphTargetDictionary?.melt !== undefined) meshes.push(m);
  });
  return {
    tick: (t) => {
      const k = clamp01((age(t) - MELT[0]) / (MELT[1] - MELT[0]));
      meshes.forEach((m) => {
        const i = m.morphTargetDictionary?.melt as number;
        const inf = m.morphTargetInfluences;
        if (inf) inf[i] = Math.max(inf[i], k);
      });
    },
  };
};

type Kind3 = "dart" | "snow" | "fish";

const ARRANGE: Record<Kind3, Arrange> = {
  // After the twang, a big boing.
  dart: playOnce("wobble", 0.5),
  snow: snowMelt,
  // After the slap, a wild flop.
  fish: playOnce("wobble", 0.9),
};

/** How each piece leaves at the end of its life, over its last `time` s. */
type Exit = {
  time: number;
  /** cm, in the head's axes. */
  move: [number, number, number];
  /** radians. */
  turn: [number, number, number];
  /** Sinks flat instead of moving off. */
  sink?: boolean;
};
const EXIT: Record<Kind3, Exit> = {
  // Pops off: out toward you and up, flipping over.
  dart: { time: 0.5, move: [2, 7, 14], turn: [-1.6, 0, 0.8] },
  // Sinks into nothing.
  snow: { time: 0.9, move: [0, -2.5, 0], turn: [0, 0, 0], sink: true },
  // Slides off the side of your head and drops.
  fish: { time: 1.2, move: [-14, -26, 3], turn: [0, 0, 1.1] },
};

/** Where each piece turns as it leaves (canonical cm, before its tilt). */
const SPOT: Record<Kind3, [number, number, number]> = {
  dart: [-1.7, 11.2, 3.8],
  snow: [0, 12.5, -3],
  fish: [-1, 13, -3],
};

/** Turned about the middle of the skull; children in canonical cm. */
const Turned = ({
  tilt,
  children,
}: {
  tilt?: [number, number];
  children: ReactNode;
}) => (
  <group position={SKULL as unknown as [number, number, number]}>
    <group rotation={[tilt?.[0] ?? 0, 0, tilt?.[1] ?? 0]}>
      <group position={[-SKULL[0], -SKULL[1], -SKULL[2]]}>{children}</group>
    </group>
  </group>
);

/** The way off at the end of a hit's life, about the piece's spot. */
const Leaving = ({
  hit,
  life,
  exit,
  spot,
  children,
}: {
  hit: Hit;
  life: number;
  exit: Exit;
  spot: [number, number, number];
  children: ReactNode;
}) => {
  const outer = useRef<Group>(null);
  useFrame(() => {
    const g = outer.current;
    if (!g) return;
    const k = clamp01((ageOf(hit) - (life - exit.time - 0.1)) / exit.time);
    const m = exit.sink ? easeOut(k) : easeIn(k);
    g.position.set(
      spot[0] + exit.move[0] * m,
      spot[1] + exit.move[1] * m,
      spot[2] + exit.move[2] * m,
    );
    g.rotation.set(exit.turn[0] * m, exit.turn[1] * m, exit.turn[2] * m);
    if (exit.sink) g.scale.set(1 - m, 1 - 0.9 * m, 1 - m);
    else g.scale.setScalar(1 - 0.35 * m);
    g.visible = k < 1;
  });
  return (
    <group ref={outer} position={spot}>
      <group position={[-spot[0], -spot[1], -spot[2]]}>{children}</group>
    </group>
  );
};

const Piece = ({ kind, hit }: { kind: Kind3; hit: Hit }) => (
  <Turned tilt={STICK[kind].tilt}>
    <Leaving hit={hit} life={LIFE[kind]} exit={EXIT[kind]} spot={SPOT[kind]}>
      <group scale={FRAME.scale} position={FRAME.position}>
        <Part part={STICK[kind].part as PartSpec} arrange={ARRANGE[kind]} />
      </group>
    </Leaving>
  </Turned>
);

export const Stuck = () => {
  const on = useOnFace();
  return (
    <>
      {(["dart", "snow", "fish"] as const).map((k) => {
        const hit = on[k];
        return hit ? <Piece key={`${k}-${hit.id}`} kind={k} hit={hit} /> : null;
      })}
      {on.bump ? (
        <Turned key={`bump-${on.bump.id}`} tilt={BUMP_TILT}>
          <group scale={FRAME.scale} position={FRAME.position}>
            <Part part={BUMP} arrange={birdsOnly} />
          </group>
          <Bump hit={on.bump} life={LIFE.bump} />
        </Turned>
      ) : null}
    </>
  );
};
