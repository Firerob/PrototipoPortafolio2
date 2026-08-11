/*
  ── Responsive scaling for the 3D scene ─────────────────────────────────────

  The hero camera has a fixed fov (38) at a fixed distance, so the visible
  HEIGHT at z=0 is a constant 4.13 world units on every device. Only the WIDTH
  changes, and it changes with the aspect ratio alone:

      desktop 16:9      7.35 units
      laptop  16:10     6.61
      tablet  3:4       2.87
      iPhone 14 portrait 1.91
      iPhone 14 landscape 8.94

  Measured against that, the scene as authored does not fit a phone: the
  prism is 2.36 units across, which is 124% of an iPhone 14's visible width —
  it literally hangs off both edges. The backdrop word at fontSize 3.4 is
  about 5.3x the screen, so a viewer sees roughly one letter.

  ── Why scale the objects and not the camera ────────────────────────────────

  The brief suggests moving the camera or widening the fov on narrow screens.
  That would work in isolation and is wrong for this scene specifically:
  CameraRig is the single authority over camera.position, and every pose it
  interpolates is tuned to exact distances — the archive dive flies THROUGH
  the prism at z 0.55, a number chosen against the prism's own 1.18 radius.
  Moving the camera per device would desynchronise that flight and add a
  second writer to the property this codebase repeatedly documents as
  single-writer-only. Scaling the objects leaves every authored camera number
  intact.

  ── Why this needs no reload on rotation ────────────────────────────────────

  Nothing here is measured once. R3F recomputes `viewport` whenever the canvas
  resizes, and an orientation change is a resize — so `state.viewport.width`
  read inside useFrame is simply a different number on the next frame, and the
  scale follows it continuously. There is no media query to re-evaluate, no
  listener to attach and no breakpoint to cross: portrait 1.91 and landscape
  8.94 are just two points on the same curve.
*/

/** Visible width at z=0 on the 16:9 desktop the scene was composed against. */
export const DESIGN_VIEWPORT_WIDTH = 7.35;

/**
 * Straight proportional fit, capped at 1.
 *
 * Preserves an object's size RELATIVE to the frame exactly. Right for things
 * whose relationship to the edges is the point — the backdrop word is
 * authored to bleed past both sides by about 40%, and this keeps that bleed
 * identical on a phone instead of turning it into a single letter.
 *
 * Capped so an ultrawide monitor does not inflate the scene past its
 * authored size.
 */
export function fitFactor(viewportWidth: number): number {
  return Math.min(1, viewportWidth / DESIGN_VIEWPORT_WIDTH);
}

/**
 * Softened fit, for the subject rather than the backdrop.
 *
 * Pure proportional scaling would put the prism at the same 32% of screen
 * width everywhere, which is correct arithmetic and a poor composition: a
 * phone has no side content competing for attention, so the hero object can
 * and should hold more of the frame. The 0.75 exponent shrinks less
 * aggressively than linear — an iPhone 14 lands at 0.36 rather than 0.26,
 * putting the prism at ~44% of the width instead of 32%. Still comfortably
 * inside the edges, which the 124% it started at was not.
 */
export function softFitFactor(viewportWidth: number): number {
  return Math.min(1, Math.pow(Math.max(viewportWidth, 0.001) / DESIGN_VIEWPORT_WIDTH, 0.75));
}

/**
 * True for a portrait-ish frame, from the viewport itself rather than from a
 * CSS breakpoint — so it is measured in the same space the objects live in
 * and updates on rotation with everything else.
 */
export function isNarrowViewport(viewportWidth: number, viewportHeight: number): boolean {
  return viewportWidth < viewportHeight;
}
