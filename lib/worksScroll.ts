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

type IndexListener = (index: number) => void;
const listeners = new Set<IndexListener>();

export function setWorksCount(count: number): void {
  worksScroll.count = count;
}

export function setWorksProgress(progress: number): void {
  worksScroll.progress = Math.min(1, Math.max(0, progress));

  if (worksScroll.count === 0) return;

  /*
    Which card is "current".

    The orbit assembles over the first ~45% of the scroll, so the readout maps
    the remaining travel across the deck. Without the offset the details panel
    would race through every project while the cards are still flying in.
  */
  const settle = 0.45;
  const t = Math.max(0, worksScroll.progress - settle) / (1 - settle);
  const next = Math.min(worksScroll.count - 1, Math.floor(t * worksScroll.count));

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
