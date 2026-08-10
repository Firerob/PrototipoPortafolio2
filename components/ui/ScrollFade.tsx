'use client';

import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

interface ScrollFadeProps {
  children: ReactNode;
  className?: string;
  /** Travel, in px, that the element rises through as it fades in. */
  y?: number;
}

/**
 * Scroll-distance-linked fade, in and back out.
 *
 * Different from the `Reveal` component next to it, and the difference is the
 * point: Reveal fires once when the element enters and plays on a clock.
 * This one is scrubbed — the opacity IS the scroll position, so scrolling
 * halfway in leaves the heading halfway faded, and scrolling back up un-fades
 * it exactly. Over a live 3D background that continuity is what stops a
 * heading from reading as a card that switched on.
 *
 * ── Two triggers, not one ───────────────────────────────────────────────────
 *
 * The exit is a separate ScrollTrigger with `immediateRender: false`. With one
 * timeline the exit's `from` values get written at refresh time and stomp the
 * entrance — the heading snaps to full opacity the moment it is measured. Same
 * trap CorridorDepth documents.
 *
 * ── Why the exit does not go to 0 ───────────────────────────────────────────
 *
 * It stops at 0.06 and only starts once the element's own bottom has passed
 * the top third of the screen. Fading a heading to nothing while it is still
 * in comfortable reading position is taking content away from the reader; the
 * intent is that it recedes as it leaves, not that it is censored on the way
 * past.
 */
export default function ScrollFade({ children, className = '', y = 50 }: ScrollFadeProps) {
  const host = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      /*
        Reduced motion gets no trigger at all, and the markup below renders at
        full opacity by default — so those viewers simply see the heading. The
        server cannot know the preference, so the styles must be identical and
        only the JS may differ; that is the same contract Reveal and Navbar use.
      */
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const el = host.current;
        if (!el) return;

        gsap.fromTo(
          el,
          { opacity: 0, y },
          {
            opacity: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top 80%',
              end: 'top 30%',
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );

        gsap.fromTo(
          el,
          { opacity: 1 },
          {
            opacity: 0.06,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: {
              trigger: el,
              start: 'bottom 32%',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });
    }, host);

    return () => ctx.revert();
  }, [y]);

  return (
    <div ref={host} className={className}>
      {children}
    </div>
  );
}
