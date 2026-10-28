// What flies at you and where each hit lands. The props that stick on the
// head are vincentt.studio head accessories (public/models/vincentt-*.glb),
// authored in metres in the "Complete 3D Reference - Spark AR" face frame
// (origin at the front of the face, +Y up, +Z out of the face) — see FRAME.
import { Euler, Vector3 } from "three";
import {
  HEAD_ATTACHMENT_POINTS,
  getHeadAttachmentPoint,
  type HeadAttachmentPoint,
} from "@vincentt-xr/sdk/face-effects";

export type Kind = "pie" | "dart" | "snow" | "fish";

export const KINDS: readonly Kind[] = ["pie", "dart", "snow", "fish"];

export type Part = {
  /** File name in public/models without `vincentt-` / `.glb`. */
  id: string;
  /**
   * One of the file's own presets, by name: its finish, and its colour
   * variant of every material that has one (`mat_x` → `mat_x__<preset>`).
   * The first preset when unset.
   */
  preset?: string;
  /** Material swaps by name, to another material in the same file. */
  materials?: Record<string, string>;
  /** Tints by material name (on this part's own copy of the material). */
  colors?: Record<string, string>;
  /** Fine placement: `x` / `y` / `z` canonical cm, `scale` about its middle. */
  fit?: { x?: number; y?: number; z?: number; scale?: number };
};

export type Stick = {
  /** The model that sticks on the head (the pie is all on the face). */
  part?: Part;
  /**
   * Where it lands, on the front of the head: the throw flies into this
   * point and the splash bursts here, toward the viewer.
   */
  point: HeadAttachmentPoint;
  /** Nudge from the point (canonical cm), where the splash bursts. */
  aim?: [number, number, number];
  /**
   * The whole piece turned about the middle of the skull (radians, x then
   * z), so pieces that would all sit on the crown spread over the head.
   */
  tilt?: [number, number];
};

export const STICK: Readonly<Record<Kind, Stick>> = {
  pie: {
    point: "noseBridge",
    aim: [0, -1.5, 0],
  },
  dart: {
    part: { id: "funny-suction-dart" },
    point: "forehead",
    aim: [-1.7, 4.6, -1.2],
    tilt: [0.1, -0.42],
  },
  snow: {
    part: { id: "funny-snow-pile" },
    point: "forehead",
    aim: [0, 2.5, -0.5],
    tilt: [-0.3, 0],
  },
  fish: {
    part: { id: "funny-fish-flop" },
    point: "forehead",
    aim: [-2.5, 2.5, -0.8],
    tilt: [0, 0.5],
  },
};

/** The bonk bump any hit can add. */
export const BUMP: Part = { id: "funny-bonk-bump", preset: "Cartoon Pink" };

/** Where the bump sits: turned to one side of the top of the head, clear of the pie. */
export const BUMP_TILT: [number, number] = [-0.05, -0.55];

/** The bump's spot on the scalp before the turn (canonical cm). */
export const BUMP_SPOT: [number, number, number] = [0.95, 12.1, 0.9];

/** How often a hit also raises a bonk bump. */
export const BUMP_CHANCE = 0.3;

const skull = new Vector3();
const turn = new Euler();
const nudge = new Vector3();

/**
 * Where a kind lands, canonical cm: its point and nudge, turned with the
 * piece about the middle of the skull.
 */
export const stickPoint = (kind: Kind, out: Vector3) => {
  const s = STICK[kind];
  getHeadAttachmentPoint(s.point, out);
  if (s.aim) out.add(nudge.fromArray(s.aim));
  if (!s.tilt) return out;
  skull.fromArray(HEAD_ATTACHMENT_POINTS.headCenter);
  turn.set(s.tilt[0], 0, s.tilt[1]);
  return out.sub(skull).applyEuler(turn).add(skull);
};

export const modelUrl = (id: string) => `/models/vincentt-${id}.glb`;

/** The SDK's v3 head occluder, hosted here until the SDK CDN serves it. */
export const OCCLUDER_URL = "/models/head-occluder-v3.glb";

/** The SDK's neck-and-shoulders bust occluder (same story). */
export const NECK_OCCLUDER_URL = "/models/neck-occluder-bust-v1.glb";

/**
 * The models' frame → the SDK's canonical head frame (centimetres): ×100,
 * then the same shift the SDK used to move the Spark AR reference into the
 * canonical frame (chins and nose tips aligned).
 */
export const FRAME = {
  scale: 100,
  position: [0, -1.03, 7.3] as const,
};
