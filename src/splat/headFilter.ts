// The head pose filter — pure, unit-tested (headFilter.test.ts).
//
// The SDK's canonical head fit arrives once per face result (15–30 a second,
// fewer than the frames drawn) and carries a little landmark noise. Drawn
// as-is, accessories step at each result and shimmer at rest. This draws a
// critically damped spring chasing the fit, every frame, its stiffness
// following the head's speed (One Euro's idea): soft at rest, so the shimmer
// melts away; stiff in a fast turn, so the pieces keep up. A spring's output
// is smooth in position AND velocity, so no frame jumps, and it is the same
// at any frame rate (the SDK's per-frame smoothing is not).
import { Quaternion, Vector3 } from "three";

export type HeadFilterConfig = {
  /** Spring stiffness at rest and at full speed (rad/s). */
  wMin: number;
  wMax: number;
  /** Stiffness added per cm/s of crown speed. */
  wPerSpeed: number;
  /** Time constant of the speed estimate (s). */
  speedTau: number;
  /** Speed below this (cm/s) is tracker noise, not motion. */
  noiseSpeed: number;
  /** A jump bigger than this (cm) between fits snaps instead of easing. */
  snapCm: number;
};

export const HEAD_FILTER: HeadFilterConfig = {
  wMin: 24,
  wMax: 70,
  wPerSpeed: 4,
  speedTau: 0.08,
  noiseSpeed: 2,
  snapCm: 20,
};

export type HeadPose = {
  /** World units. */
  position: Vector3;
  quaternion: Quaternion;
  /** World units per canonical centimetre. */
  scale: number;
};

/** The crown (top of the head), canonical cm: speed is measured there. */
const CROWN = new Vector3(0, 13.26, -3.76);

const tq = new Quaternion();
const tv = new Vector3();

/** Rotation from a to b as an axis × angle vector (radians). */
const rotVec = (a: Quaternion, b: Quaternion, out: Vector3) => {
  tq.copy(a).invert().premultiply(b); // b · a⁻¹
  if (tq.w < 0) tq.set(-tq.x, -tq.y, -tq.z, -tq.w);
  const w = Math.min(1, tq.w);
  const angle = 2 * Math.acos(w);
  const s = Math.sqrt(1 - w * w);
  if (s < 1e-6) return out.set(0, 0, 0);
  return out.set(tq.x / s, tq.y / s, tq.z / s).multiplyScalar(angle);
};

/** q turned by the rotation vector v (radians), in place. */
const turn = (q: Quaternion, v: Vector3) => {
  const angle = v.length();
  if (angle < 1e-9) return q;
  tv.copy(v).divideScalar(angle);
  return q.premultiply(tq.setFromAxisAngle(tv, angle));
};

const crownOf = (p: HeadPose, out: Vector3) =>
  out
    .copy(CROWN)
    .applyQuaternion(p.quaternion)
    .multiplyScalar(p.scale)
    .add(p.position);

const copyPose = (from: HeadPose, to: HeadPose) => {
  to.position.copy(from.position);
  to.quaternion.copy(from.quaternion);
  // eslint-disable-next-line no-param-reassign
  to.scale = from.scale;
  return to;
};

const newPose = (): HeadPose => ({
  position: new Vector3(),
  quaternion: new Quaternion(),
  scale: 1,
});

export class HeadFilter {
  private cfg: HeadFilterConfig;

  private ready = false;

  /** The last fit, its time, and the one before's. */
  private cur = newPose();

  private tCur = 0;

  private tPrev = 0;

  private hasPrev = false;

  /** Crown speed, cm/s (eased), and the last fit-to-fit reading. */
  private speed = 0;

  private rawSpeed = 0;

  /** The spring: pose, linear and angular velocity, last frame time. */
  private out = newPose();

  private v = new Vector3();

  private w = new Vector3();

  private tFrame = 0;

  private pull = new Vector3();

  private spin = new Vector3();

  constructor(cfg: HeadFilterConfig = HEAD_FILTER) {
    this.cfg = cfg;
  }

  reset() {
    this.ready = false;
    this.hasPrev = false;
  }

  /**
   * Feed the latest fit (call every frame; it only counts as a new sample
   * when the fit changed). `t` in seconds. Returns whether it was new.
   */
  update(t: number, fit: HeadPose) {
    const { cur } = this;
    if (
      this.ready &&
      fit.scale === cur.scale &&
      fit.position.equals(cur.position) &&
      fit.quaternion.equals(cur.quaternion)
    )
      return false;

    const jumpCm = this.ready
      ? crownOf(fit, new Vector3()).distanceTo(crownOf(cur, new Vector3())) /
        fit.scale
      : Infinity;
    if (!this.ready || jumpCm > this.cfg.snapCm || t - this.tCur > 0.5) {
      // First fit, a new person, or back after a gap: snap there.
      copyPose(fit, cur);
      copyPose(fit, this.out);
      this.v.set(0, 0, 0);
      this.w.set(0, 0, 0);
      this.speed = 0;
      this.rawSpeed = 0;
      this.hasPrev = false;
      this.tCur = t;
      this.tFrame = t;
      this.ready = true;
      return true;
    }
    this.tPrev = this.tCur;
    copyPose(fit, cur);
    this.tCur = t;
    this.hasPrev = t > this.tPrev;
    this.rawSpeed = this.hasPrev ? jumpCm / (t - this.tPrev) : 0;
    return true;
  }

  /** The pose to draw at time `t` (s). Call once per frame. */
  sample(t: number, out: HeadPose): HeadPose | null {
    if (!this.ready) return null;
    const { cfg, pull, spin } = this;
    const target = this.cur;
    const dt = Math.min(Math.max(0, t - this.tFrame), 0.1);
    this.tFrame = t;
    // No new fit for a while (the face is held, or the head stopped dead):
    // no speed.
    const span = this.tCur - this.tPrev;
    const fresh = this.hasPrev && t - this.tCur <= 1.5 * span;
    this.speed +=
      ((fresh ? this.rawSpeed : 0) - this.speed) *
      (1 - Math.exp(-dt / cfg.speedTau));
    const moving = Math.max(0, this.speed - cfg.noiseSpeed);

    // The spring, in small steps so a slow frame stays stable.
    const W = Math.min(cfg.wMax, cfg.wMin + cfg.wPerSpeed * moving);
    const steps = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / steps;
    for (let i = 0; i < steps; i += 1) {
      pull
        .copy(target.position)
        .sub(this.out.position)
        .multiplyScalar(W * W)
        .addScaledVector(this.v, -2 * W);
      this.v.addScaledVector(pull, h);
      this.out.position.addScaledVector(this.v, h);
      rotVec(this.out.quaternion, target.quaternion, spin)
        .multiplyScalar(W * W)
        .addScaledVector(this.w, -2 * W);
      this.w.addScaledVector(spin, h);
      turn(this.out.quaternion, spin.copy(this.w).multiplyScalar(h));
    }
    this.out.quaternion.normalize();
    this.out.scale +=
      (target.scale - this.out.scale) * (1 - Math.exp((-dt * W) / 2));
    return copyPose(this.out, out);
  }
}
