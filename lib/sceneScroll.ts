/*
  Post-hero scene state, held outside React.

  Same contract as worksScroll and archiveScroll: ScrollTrigger writes here on
  every scroll frame, useFrame reads it on every render frame, and nothing in
  this module triggers a React render.

  ── Why ONE continuous value instead of four per-section triggers ───────────

  The obvious build is a ScrollTrigger per section, each tweening the camera to
  that section's pose. It does not work: at every boundary two triggers are
  live at once, both writing camera.position, and which one lands last depends
  on creation order. The camera stutters exactly where the viewer is looking
  for continuity.

  So there is one trigger spanning the whole post-hero run, writing one float:

      stage 0.0  index      camera slides off-axis, frames the list
      stage 1.0  news       descends, scene turns blueprint
      stage 2.0  about      pushes in, tight and close
      stage 3.0  contact    pulls back wide, emission field opens

  Fractional values are the real payload — `stage` is 1.63 far more often than
  it is exactly 2, and every consumer interpolates from it. There is no moment
  where the scene "is" in a section; it is always on the way to the next one.
*/

interface SceneScrollState {
  /** Continuous position along the post-hero run, 0 (index) → 3 (contact). */
  stage: number;
  /** 0 before the post-hero world is in play, 1 once it fully owns the frame. */
  presence: number;
}

export const sceneScroll: SceneScrollState = {
  stage: 0,
  presence: 0,
};

export const STAGE_INDEX = 0;
export const STAGE_NEWS = 1;
export const STAGE_ABOUT = 2;
export const STAGE_CONTACT = 3;
export const STAGE_LAST = STAGE_CONTACT;

export function setSceneStage(stage: number): void {
  sceneScroll.stage = Math.min(STAGE_LAST, Math.max(0, stage));
}

export function setScenePresence(presence: number): void {
  sceneScroll.presence = Math.min(1, Math.max(0, presence));
}

export function resetSceneScroll(): void {
  sceneScroll.stage = 0;
  sceneScroll.presence = 0;
}

/**
 * How strongly a given stage is in play, 0..1, peaking at its own index.
 *
 * A triangle rather than a step: at stage 1.4 the news mood is still 60% and
 * the about mood is already 40%, which is what makes materials cross-fade
 * instead of switching. Consumers that need a hard state can round.
 */
export function stageWeight(stage: number, target: number): number {
  return Math.max(0, 1 - Math.abs(stage - target));
}

/** smootherstep — zero velocity AND acceleration at both ends. */
export function smootherstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Frame-rate independent approach factor.
 *
 * MathUtils.lerp(a, b, 0.1) converges twice as fast at 120Hz as at 60Hz — the
 * scene would literally feel different on different monitors. 1 - lambda^dt
 * makes the approach speed a property of time instead of of frame count.
 * Duplicated from HeroScene rather than imported because that one is local to
 * a component file; if a third consumer appears, hoist it here for real.
 */
export const smoothing = (lambda: number, dt: number) => 1 - Math.pow(lambda, dt);

export interface CameraPose {
  /** Camera position. */
  px: number;
  py: number;
  pz: number;
  /** lookAt target. */
  tx: number;
  ty: number;
  tz: number;
  /** Field of view, in degrees. Wide reads as open, narrow as intimate. */
  fov: number;
}

/*
  The four poses.

  Authored against the same world the hero uses, where the prism sits at the
  origin and the archive corridor recedes down -Z. The post-hero camera lives
  further out and off-axis so the hero furniture is behind and beside the
  viewer rather than in front of them — the world continues, but the subject
  has changed.
*/
const POSES: readonly CameraPose[] = [
  // Index — pushed off to the right and rolled slightly, so the field sits in
  // the left gutter and the project list reads against emptier frame.
  { px: 2.9, py: 0.5, pz: 5.4, tx: -1.1, ty: 0.1, tz: -2.0, fov: 42 },
  // News — descending, looking level down the corridor. Blueprint stage.
  { px: 1.6, py: -1.9, pz: 4.2, tx: -0.3, ty: -0.6, tz: -4.5, fov: 46 },
  // About — close and tight. The narrow fov is what makes it read as a push
  // in rather than as the camera simply having moved nearer.
  { px: -1.5, py: -2.6, pz: 2.1, tx: 0.2, ty: -2.2, tz: -1.4, fov: 30 },
  // Contact — pulled back wide, the field opening out around the transmitter.
  { px: 0.2, py: -3.4, pz: 8.6, tx: 0.0, ty: -3.0, tz: -6.0, fov: 62 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The camera pose at a continuous stage position.
 *
 * Piecewise-linear between the four authored poses, with smootherstep on the
 * segment fraction so each arrival and departure has zero velocity — a linear
 * blend reads as the camera being dragged on rails, which is the exact "made
 * by a generator" feel this is meant to avoid.
 */
export function poseAt(stage: number): CameraPose {
  const s = Math.min(STAGE_LAST, Math.max(0, stage));
  const i = Math.min(POSES.length - 2, Math.floor(s));
  const f = smootherstep(s - i);
  const a = POSES[i];
  const b = POSES[i + 1];

  return {
    px: lerp(a.px, b.px, f),
    py: lerp(a.py, b.py, f),
    pz: lerp(a.pz, b.pz, f),
    tx: lerp(a.tx, b.tx, f),
    ty: lerp(a.ty, b.ty, f),
    tz: lerp(a.tz, b.tz, f),
    fov: lerp(a.fov, b.fov, f),
  };
}
