/*
  The wave curtain geometry, shared by both crossings.

  It lived inside WaveTransition until the page needed a second wave — the one
  that closes the light archive room back to void on the way into the index.
  Two hand-copied crest functions would drift apart the first time either was
  tuned, and the whole point of the second wave is that it reads as the SAME
  liquid front arriving from the other side.
*/

/** Viewport-space units. `preserveAspectRatio="none"` stretches them to fit,
 *  so every number here is resolution-independent. */
export const VW = 100;
export const VH = 100;

/** How deep the crest dips, in viewBox units. */
export const AMPLITUDE = 9;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * Crest height at `t`.
 *
 * The wave flattens as it settles at either end — a front that stays equally
 * wavy at rest looks like a decoration rather than a liquid in motion.
 */
function crestAmplitude(t: number): number {
  return AMPLITUDE * Math.sin(Math.PI * clamp01(t));
}

/**
 * Curtain falling from the top: filled from above the screen down to a wavy
 * leading edge. `t` runs 0 (fully above) → 1 (fully covering).
 *
 * Two cubic segments make the S-curve. A single quadratic reads as a bulge,
 * and a polygon clip-path can only draw straight chords between its points, so
 * it cannot make a smooth crest without dozens of vertices.
 */
export function waveDown(t: number): string {
  // Travel a little past both ends so the crest is fully off-screen at t=0 and
  // the trailing flat edge is off-screen at t=1.
  const y = -AMPLITUDE * 2 + t * (VH + AMPLITUDE * 4);
  const amp = crestAmplitude(t);

  return [
    `M 0 ${(-VH).toFixed(2)}`,
    `L ${VW} ${(-VH).toFixed(2)}`,
    `L ${VW} ${y.toFixed(3)}`,
    `C ${(VW * 0.72).toFixed(2)} ${(y + amp).toFixed(3)}`,
    `  ${(VW * 0.6).toFixed(2)} ${(y - amp).toFixed(3)}`,
    `  ${(VW * 0.44).toFixed(2)} ${(y + amp * 0.35).toFixed(3)}`,
    `C ${(VW * 0.28).toFixed(2)} ${(y + amp * 1.15).toFixed(3)}`,
    `  ${(VW * 0.14).toFixed(2)} ${(y - amp * 0.85).toFixed(3)}`,
    `  0 ${(y + amp * 0.25).toFixed(3)}`,
    'Z',
  ].join(' ');
}

/**
 * The same front, rising from the bottom: filled from a wavy top edge down
 * past the bottom of the screen. `t` runs 0 (fully below) → 1 (fully
 * covering).
 *
 * The control points are the identical sequence read left-to-right instead of
 * right-to-left, so the two waves are mirror images of one silhouette rather
 * than two curves that merely look similar.
 */
export function waveUp(t: number): string {
  const y = VH + AMPLITUDE * 2 - t * (VH + AMPLITUDE * 4);
  const amp = crestAmplitude(t);

  return [
    `M 0 ${(y + amp * 0.25).toFixed(3)}`,
    `C ${(VW * 0.14).toFixed(2)} ${(y - amp * 0.85).toFixed(3)}`,
    `  ${(VW * 0.28).toFixed(2)} ${(y + amp * 1.15).toFixed(3)}`,
    `  ${(VW * 0.44).toFixed(2)} ${(y + amp * 0.35).toFixed(3)}`,
    `C ${(VW * 0.6).toFixed(2)} ${(y - amp).toFixed(3)}`,
    `  ${(VW * 0.72).toFixed(2)} ${(y + amp).toFixed(3)}`,
    `  ${VW} ${y.toFixed(3)}`,
    `L ${VW} ${(VH * 2).toFixed(2)}`,
    `L 0 ${(VH * 2).toFixed(2)}`,
    'Z',
  ].join(' ');
}
