'use client';

import { useSyncExternalStore } from 'react';

/*
  Two signals, not one: a narrow viewport catches phones and small tablets in
  portrait, `(pointer: coarse) and (hover: none)` catches a touch-primary
  device at any width (a tablet held landscape, a foldable) that a
  width-only check would miss and treat as desktop.

  matchMedia's own `change` event, not a `resize` listener plus a width
  comparison: rotating the device or entering split-screen fires this exactly
  once, whereas `resize` fires continuously through the transition — the
  wrong signal to gate GPU quality on.
*/
const QUERY = '(max-width: 767px), (pointer: coarse) and (hover: none)';

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

// Desktop is the safe default for the one frame between server markup and
// hydration reading the real media query — a false negative here costs a
// slightly heavier first frame, not a broken layout.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * True on phones, small tablets, and any touch-primary device without a
 * hover-capable pointer — the device class this codebase downgrades DPR,
 * post-processing, and parallax response for.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
