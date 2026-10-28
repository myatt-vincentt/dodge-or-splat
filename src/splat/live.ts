// Live readings, written every frame (no re-renders).
import { Quaternion, Vector3 } from "three";

export const live = {
  blendshapes: {} as Readonly<Record<string, number | undefined>>,
  /** A face is being tracked (FilteredHead). */
  tracked: false,
  /**
   * The filtered head as drawn this frame (FilteredHead): world position,
   * rotation, and world units per canonical centimetre.
   */
  head: {
    position: new Vector3(),
    quaternion: new Quaternion(),
    scale: 1,
    visible: false,
  },
  /** Bumps on each head shake: the pieces play their wobble. */
  shakes: 0,
  /** Dev only (window.__splat): stands in for the face's readings. */
  override: null as Readonly<Record<string, number | undefined>> | null,
};
