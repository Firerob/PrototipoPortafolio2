'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { owner } from '@/content/site';

/*
  ssr:false is mandatory — R3F touches WebGLRenderingContext at module scope
  and would throw during the server render. It also keeps three + drei out of
  the initial bundle so the HUD paints before any 3D work begins.

  This wrapper exists because `dynamic(..., { ssr: false })` is not allowed in
  a Server Component, and app/page.jsx is one.
*/
const BackdropCanvas = dynamic(() => import('./BackdropCanvas'), { ssr: false });

interface HeroCanvasProps {
  word?: string;
  font?: string;
  /** Where the stage becomes visible. */
  startTrigger?: string;
  /** Where it stops being visible; rendering parks past this point. */
  endTrigger?: string;
}

/**
 * Fixed, click-through 3D stage for the whole page.
 *
 * Layer order, bottom to top:
 *   -z-10  FluidBackground  (fixed)
 *    z-0   this canvas      (fixed)
 *    z-10  page content     (scrolls over both)
 *
 * `pointer-events: none` is what lets content above scroll and receive clicks
 * normally. It is also the reason the scene tracks the window rather than
 * R3F's `state.pointer`: with events disabled the canvas receives none, and
 * `state.pointer` would sit at (0,0) forever. See PointerProvider.
 */
export default function HeroCanvas({
  word = owner.heroWord,
  font,
  startTrigger = '#top',
  endTrigger = '#works',
}: HeroCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const reducedMotion = prefersReduced === true;

  // Starts true so the first paint renders rather than showing an empty hero.
  const [active, setActive] = useState(true);

  useIsomorphicLayoutEffect(() => {
    const node = host.current;
    if (!node) return;

    // gsap.context scopes every animation and ScrollTrigger created inside it,
    // so one revert() on unmount cleans up all of them — the standard React
    // teardown for GSAP.
    const ctx = gsap.context(() => {
      /*
        Park the renderer once the whole showcase has scrolled past.

        No opacity or scale tween on this element: the orbiting cards live in
        the same canvas, so fading the host would fade them too — exactly when
        they are arriving. The "scene recedes" beat is done in-scene by
        shrinking the prism (see Prism.jsx).

        The active window deliberately spans from the hero's top to the END of
        the works section, because the orbit plays out during the works pin. A
        trigger on the hero alone would park the canvas mid-animation.
      */
      /*
        Elements resolved by hand, NOT passed as selector strings.

        gsap.context(fn, node) scopes every selector lookup inside fn to `node`
        — and `node` here is the fixed canvas div. '#works' lives outside it,
        so GSAP logged "Element not found: #works" and the trigger silently
        fell back to a broken range. Resolving against the document first side-
        steps the scope entirely.
      */
      const startEl = document.querySelector(startTrigger);
      const endEl = document.querySelector(endTrigger);
      if (!startEl || !endEl) return;

      ScrollTrigger.create({
        trigger: startEl,
        start: 'top bottom',
        endTrigger: endEl,
        end: 'bottom top',
        onToggle: (self) => setActive(self.isActive),
      });
    }, node);

    return () => ctx.revert();
  }, [startTrigger, endTrigger, reducedMotion]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 will-change-[transform,opacity]"
    >
      <BackdropCanvas
        word={word}
        reducedMotion={reducedMotion}
        font={font}
        active={active}
      />
    </div>
  );
}
