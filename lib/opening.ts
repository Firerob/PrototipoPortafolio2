/*
  Opening cinematic state, held outside React.

  Same contract as worksScroll / archiveScroll / sceneScroll: the DOM side
  (CinematicGenesisOpening) writes, the WebGL side reads inside useFrame, and
  the per-frame values never pass through React. One GSAP timeline tweens this
  plain object; sixty setState calls a second during the sequence would
  re-render the whole canvas subtree.

  ── The sequence ────────────────────────────────────────────────────────────

    singularity   black screen, one spark tracking the cursor on a lerp
    ignition      the spark detonates; a radial front reveals the geometry
                  as wireframe only
    bake          override drops, real materials appear, bokeh slams in
    calibrating   the lens resolves and the HUD opens to the corners
    live          overlay unmounted, composer unmounted, scroll released

  React only needs `phase`, which changes five times in the life of the page,
  so that one goes through a subscription.
*/

export type OpeningPhase =
  | 'singularity'
  | 'ignition'
  | 'bake'
  | 'calibrating'
  | 'live';

interface OpeningState {
  /** Spark brightness, 0..1. */
  spark: number;
  /** Spark position in 0..1 screen space. Seeds the shockwave's centre. */
  sparkX: number;
  sparkY: number;
  /**
   * Shockwave radius, 0..1, where 1 covers the furthest corner.
   * Read by the wireframe override shader as its reveal front.
   */
  wave: number;
  /** 0 = perfectly sharp, 1 = maximum bokeh. Read by CalibrationEffects. */
  defocus: number;
  /** Breathing offset while assets load, so a slow connection is never frozen. */
  pulse: number;
  phase: OpeningPhase;
}

export const opening: OpeningState = {
  spark: 0,
  sparkX: 0.5,
  sparkY: 0.5,
  wave: 0,
  defocus: 0,
  pulse: 0,
  phase: 'singularity',
};

type PhaseListener = (phase: OpeningPhase) => void;
const listeners = new Set<PhaseListener>();

export function setOpeningPhase(phase: OpeningPhase): void {
  if (opening.phase === phase) return;
  opening.phase = phase;
  for (const listener of listeners) listener(phase);
}

export function subscribeOpeningPhase(listener: PhaseListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Land in the finished state immediately.
 *
 * Used by the reduced-motion branch and as the failsafe if anything throws
 * while the overlay is up. A decorative opening must never be able to leave
 * someone looking at a black screen with the scroll locked, so every exit path
 * from the sequence routes through here.
 */
export function forceOpeningComplete(): void {
  opening.spark = 0;
  opening.wave = 1;
  opening.defocus = 0;
  opening.pulse = 0;
  setOpeningPhase('live');
}

export function resetOpening(): void {
  opening.spark = 0;
  opening.sparkX = 0.5;
  opening.sparkY = 0.5;
  opening.wave = 0;
  opening.defocus = 0;
  opening.pulse = 0;
  opening.phase = 'singularity';
}

/** Phases during which the scene renders as wireframe only. */
export function isWireframePhase(phase: OpeningPhase): boolean {
  return phase === 'singularity' || phase === 'ignition';
}
