/*
  Scroll progress for the works orbit, held outside React.

  ScrollTrigger writes `progress` on every scroll frame and useFrame reads it
  on every render frame. Routing that through useState would re-render the
  page tree ~60 times a second. Only `activeIndex` crosses back into React,
  and only when the whole number changes.
*/

interface WorksScrollState {
  /** 0 at the top of the pinned section, 1 at its end. */
  progress: number;
  activeIndex: number;
  count: number;
}

export const worksScroll: WorksScrollState = {
  progress: 0,
  activeIndex: 0,
  count: 0,
};

/*
  ── Scroll budget, in viewport heights ──────────────────────────────────────

  These are the single source of truth for how long the pinned section runs.
  ProjectsOrbit derives its ScrollTrigger `end` from them and OrbitCards
  derives its assembly/orbit split from the same numbers, so the pin length
  and the animation phases can never disagree.

  Making the budget PER CARD is the actual fix for "the pin is too short":
  add a seventh project and the pin grows by PER_CARD_VH automatically. A
  fixed `+=3000` silently starves every card added after the number was tuned.
*/
export const ASSEMBLY_VH = 0.9;
export const PER_CARD_VH = 0.62;

/** Total pinned scroll distance in pixels for the current viewport. */
export function worksScrollLength(count: number, viewportHeight: number): number {
  return viewportHeight * (ASSEMBLY_VH + PER_CARD_VH * Math.max(count, 1));
}

/**
 * Fraction of the pinned range spent flying the cards in, before the ring
 * starts rotating. Derived from the same budget as the pin length, so the
 * fly-in always occupies exactly ASSEMBLY_VH viewport heights no matter how
 * many projects exist.
 */
export function assemblyFraction(count: number): number {
  return ASSEMBLY_VH / (ASSEMBLY_VH + PER_CARD_VH * Math.max(count, 1));
}

/**
 * Progress through the orbit phase alone: 0 when the ring starts turning,
 * 1 at the end of the pin. Both the 3D ring and the caption read this, which
 * is what keeps the visible front card and the caption in lockstep.
 */
export function orbitPhase(progress: number, count: number): number {
  const assembly = assemblyFraction(count);
  return Math.min(1, Math.max(0, (progress - assembly) / (1 - assembly)));
}

type IndexListener = (index: number) => void;
const listeners = new Set<IndexListener>();

export function setWorksCount(count: number): void {
  worksScroll.count = count;
}

export function setWorksProgress(progress: number): void {
  worksScroll.progress = Math.min(1, Math.max(0, progress));

  const count = worksScroll.count;
  if (count === 0) return;

  /*
    Which card is "current".

    Derived from the SAME orbitPhase() the ring rotation uses, so the caption
    always names the card actually facing the camera. The previous version
    used its own hand-tuned `settle = 0.45` constant and a floor() bucket,
    which drifted out of sync with the ring in two ways at once: it sat on
    card 1 for the first 54% of the scroll (measured: 1950px of 3600px with
    the counter frozen at 01/06), and it counted upward while the ring was
    actually bringing cards to the front in reverse order.

    OrbitCards places card i at the front when orbitPhase == i/(count-1), so
    rounding that expression back out is exact by construction.
  */
  const next =
    count === 1 ? 0 : Math.round(orbitPhase(worksScroll.progress, count) * (count - 1));

  if (next === worksScroll.activeIndex) return;
  worksScroll.activeIndex = next;
  for (const listener of listeners) listener(next);
}

export function subscribeActiveIndex(listener: IndexListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetWorksScroll(): void {
  worksScroll.progress = 0;
  worksScroll.activeIndex = 0;
}
