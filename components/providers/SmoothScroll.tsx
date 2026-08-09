'use client';

import { useEffect, type ReactNode } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/*
  Package note: the brief asked for @studio-freight/react-lenis. That scope is
  deprecated and frozen at 0.0.47 — the project moved to the plain `lenis`
  package, which ships the React binding at `lenis/react`. Same authors, same
  component, maintained.
*/

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Wires Lenis and ScrollTrigger onto ONE clock.
 *
 * This is the part that is usually got wrong. Left alone, Lenis runs its own
 * requestAnimationFrame loop and GSAP runs another. Two loops means
 * ScrollTrigger reads scroll positions Lenis has not committed yet, and pinned
 * sections jitter by a frame. The fix is three-fold:
 *
 *   1. autoRaf: false          — Lenis stops driving itself
 *   2. gsap.ticker.add(raf)    — GSAP's ticker drives Lenis instead
 *   3. lenis.on('scroll', ScrollTrigger.update) — every Lenis frame refreshes
 *                                                 ScrollTrigger immediately
 *
 * lagSmoothing(0) disables GSAP's frame-skip recovery: it is designed for
 * time-based tweens, and on a scrubbed timeline it makes the scroll jump.
 */
function LenisGsapBridge() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Measurements taken before Lenis took over the scroll are stale.
    ScrollTrigger.refresh();

    return () => {
      lenis.off('scroll', onScroll);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, [lenis]);

  /*
    Anchor links.

    Lenis owns the scroll position, so a native #hash jump teleports past it
    and leaves Lenis and the browser disagreeing about where the page is.
    Routing clicks through lenis.scrollTo keeps them in sync — and makes the
    nav links glide like everything else.
  */
  useEffect(() => {
    if (!lenis) return;

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement)?.closest?.('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: 0 });
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [lenis]);

  return null;
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        // Driven by the GSAP ticker in LenisGsapBridge, not by Lenis itself.
        autoRaf: false,
        // Inertia. lerp is frame-rate corrected internally by Lenis, so this
        // behaves the same at 60 and 144Hz.
        lerp: 0.09,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
        // Touch devices already have native inertial scrolling that feels
        // better than anything synthesised on top of it.
        syncTouch: false,
      }}
    >
      <LenisGsapBridge />
      {children}
    </ReactLenis>
  );
}
