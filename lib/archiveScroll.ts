/*
  Scroll state for the hero → archive transition, held outside React.

  Same contract as worksScroll: ScrollTrigger writes here on every scroll
  frame, useFrame reads it on every render frame, and nothing in this module
  triggers a React render. The one value React needs (`theme`) is published
  through a subscription that only fires when it actually flips.
*/

interface ArchiveScrollState {
  /** 0 before the transition starts, 1 once the camera is fully inside. */
  progress: number;
  /** Which side of the wave we are on. Drives the DOM theme swap. */
  theme: 'dark' | 'light';
  /**
   * 0 while the light room is still on screen, 1 once IndexArrival's mirrored
   * wave has closed it. Fades the fixed curtain out from underneath the rest
   * of the page — see WaveTransition.
   */
  exit: number;
}

export const archiveScroll: ArchiveScrollState = {
  progress: 0,
  theme: 'dark',
  exit: 0,
};

/*
  ── Timeline map ────────────────────────────────────────────────────────────

  One shared source for the three overlapping beats the brief asks for, so the
  wave, the camera and the gallery read the same numbers instead of each
  carrying its own hand-tuned constants:

      wave    0.00 → 0.40   curtain sweeps down, theme flips
      camera  0.30 → 0.70   camera flies through the prism
      gallery 0.60 → 1.00   tilted video planes enter and recede

  Deliberately overlapping — the camera starts moving while the wave is still
  travelling, which is what makes it read as one continuous move rather than
  three queued animations.
*/
export const WAVE_RANGE = [0.0, 0.4] as const;
export const CAMERA_RANGE = [0.3, 0.7] as const;
export const GALLERY_RANGE = [0.6, 1.0] as const;

/** Normalised 0..1 progress through one of the ranges above. */
export function phaseOf(progress: number, range: readonly [number, number]): number {
  const [start, end] = range;
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

/** smootherstep — zero velocity AND acceleration at both ends. */
export function smootherstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

type ThemeListener = (theme: 'dark' | 'light') => void;
const listeners = new Set<ThemeListener>();

export function setArchiveProgress(progress: number): void {
  archiveScroll.progress = Math.min(1, Math.max(0, progress));

  /*
    The theme flips when the wave crest passes the middle of the viewport, not
    at the start or end of the sweep — that is the moment the light side covers
    more of the screen than the dark side, so the swap is invisible.
  */
  const next = phaseOf(archiveScroll.progress, WAVE_RANGE) > 0.5 ? 'light' : 'dark';
  if (next === archiveScroll.theme) return;
  archiveScroll.theme = next;
  for (const listener of listeners) listener(next);
}

/** Written by IndexArrival's ScrollTrigger. Read-only everywhere else. */
export function setArchiveExit(exit: number): void {
  archiveScroll.exit = Math.min(1, Math.max(0, exit));
}

export function subscribeTheme(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetArchiveScroll(): void {
  archiveScroll.progress = 0;
  archiveScroll.theme = 'dark';
  archiveScroll.exit = 0;
}
