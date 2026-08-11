'use client';

import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  resetSceneColor,
  sceneColor,
  setSceneColor,
  smootherstep,
  STOP_LAST,
  toRgbTriplet,
} from '@/lib/palette';
import { sceneScroll } from '@/lib/sceneScroll';

/**
 * The single authority for what colour the page currently is.
 *
 * Writes both sides from one computation each frame: CSS custom properties on
 * :root for the DOM, and the `sceneColor` store for WebGL. Two independent
 * drivers would drift — the canvas and the page would be a frame or a stop
 * apart during a transition, which is precisely the sort of mismatch that
 * reads as a bug rather than as a mood.
 *
 * ── Where the position comes from ───────────────────────────────────────────
 *
 * No new ScrollTrigger. sceneScroll already publishes everything needed:
 * `presence` ramps 0→1 as the post-hero world arrives, and `stage` runs 0→3
 * across Index → News → About → Contact. Summing them gives one continuous
 * 0→4 that lands exactly on the five palette stops, and it inherits the
 * existing trigger's measurement order for free. Adding a second trigger over
 * the same range is the documented cause of stutter in this codebase.
 *
 * ── Why CSS variables are written only when they change ─────────────────────
 *
 * Setting a custom property on the root element invalidates style for every
 * element that consumes it, and here that is most of the page. At 8 bits per
 * channel the interpolated hex is identical across many consecutive frames,
 * and while the viewer is not scrolling it never changes at all — so the
 * string comparison below turns a per-frame style invalidation into an
 * occasional one. The idle breath deliberately does NOT touch CSS for the
 * same reason; it only modulates 3D light intensity, where it is free.
 */
export default function ColorMorph() {
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced === true;

  useEffect(() => {
    const root = document.documentElement;
    const t0 = performance.now();

    // Last values actually committed to CSS, so unchanged frames cost nothing.
    let lastBg = '';
    let lastAccent = '';
    let lastAccentSoft = '';

    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);

      /*
        presence is smootherstepped rather than used raw so the hero → index
        colour handover eases in and out; `stage` is already continuous and
        carries its own easing through poseAt's consumers.
      */
      const pos = Math.min(
        STOP_LAST,
        smootherstep(sceneScroll.presence) + sceneScroll.stage,
      );

      // Breath is frozen at 1 under reduced motion: an oscillating light is
      // still motion even when nothing is moving on screen.
      const time = reduced ? 0 : (performance.now() - t0) / 1000;
      setSceneColor(pos, time);

      const { bg, accent, accentSoft } = sceneColor.current;

      /*
        Each colour is published twice: as hex for solid uses, and as bare
        channels for anything that needs its own alpha. The section scrims are
        the reason — they sit over most of the page at 86% and previously used
        a hardcoded rgba(), so no amount of morphing underneath them was ever
        visible. `rgba(var(--x), 0.86)` is not valid CSS; `rgb(var(--x-rgb) /
        0.86)` is.
      */
      if (bg !== lastBg) {
        lastBg = bg;
        root.style.setProperty('--bg-dynamic', bg);
        root.style.setProperty('--bg-dynamic-rgb', toRgbTriplet(bg));
      }
      if (accent !== lastAccent) {
        lastAccent = accent;
        root.style.setProperty('--accent-dynamic', accent);
        root.style.setProperty('--accent-dynamic-rgb', toRgbTriplet(accent));
      }
      if (accentSoft !== lastAccentSoft) {
        lastAccentSoft = accentSoft;
        root.style.setProperty('--accent-soft-dynamic', accentSoft);
        root.style.setProperty('--accent-soft-dynamic-rgb', toRgbTriplet(accentSoft));
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resetSceneColor();
      // Hand the page back to the static tokens rather than leaving it pinned
      // to whatever colour it happened to be on unmount.
      for (const name of [
        '--bg-dynamic',
        '--bg-dynamic-rgb',
        '--accent-dynamic',
        '--accent-dynamic-rgb',
        '--accent-soft-dynamic',
        '--accent-soft-dynamic-rgb',
      ]) {
        root.style.removeProperty(name);
      }
    };
  }, [reduced]);

  return null;
}
