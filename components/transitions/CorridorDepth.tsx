'use client';

import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

interface CorridorDepthProps {
  children: ReactNode;
  className?: string;
}

/**
 * Puts a section into the same corridor the rest of the page lives in.
 *
 * The page has one spatial idea running through it — the prism orbit, the
 * archive camera flight and the Deep Index all express distance along Z. Below
 * the index that idea used to stop dead: News, About and Contact were flat
 * boxes stacked with a hairline between them, so the second half of the site
 * felt like a different website.
 *
 * This restores it with the cheapest possible reading of depth: a section
 * arrives from slightly further away (smaller, dimmer, lower) and departs by
 * receding again. Two scrubbed tweens, no pin, no per-frame layout.
 *
 * Deliberately NOT using `filter: blur()`, which is how the index rows express
 * the same distance. Blurring a row-sized element is cheap; blurring a
 * full-viewport section repaints the entire area on every scroll frame, and
 * that cost lands on exactly the low-end hardware the motion database warns
 * about. Transform and opacity are compositor-only, so the effect is free.
 *
 * Departure is intentionally shallow (0.34, not 0). Fading content out while
 * someone may still be reading the tail of a section is taking it away from
 * them; the intent is to push it back in space, not to hide it.
 */
export default function CorridorDepth({ children, className = '' }: CorridorDepthProps) {
  const host = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const el = host.current;
        const inner = el?.firstElementChild as HTMLElement | null;
        if (!el || !inner) return;

        gsap.fromTo(
          inner,
          { yPercent: 2.2, scale: 0.978, opacity: 0.32 },
          {
            yPercent: 0,
            scale: 1,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              // Settled by the time the section's top is 62% up the screen —
              // i.e. before any of it is in comfortable reading position.
              end: 'top 62%',
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          },
        );

        gsap.fromTo(
          inner,
          { yPercent: 0, scale: 1, opacity: 1 },
          {
            yPercent: -1.8,
            scale: 0.982,
            opacity: 0.34,
            ease: 'none',
            /*
              Without this the departure tween's `from` values are written at
              refresh time and immediately overwrite the arrival tween's — the
              section would snap to full opacity the moment it was measured.
            */
            immediateRender: false,
            scrollTrigger: {
              trigger: el,
              // Only bites once the section's bottom edge is halfway up the
              // screen, so it never dims content still being read.
              start: 'bottom 50%',
              end: 'bottom top',
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          },
        );
      });
    }, host);

    return () => ctx.revert();
  }, []);

  /*
    Two elements, not one: the outer is the ScrollTrigger's measuring stick and
    must never move, while the inner is the thing that moves. Animating the
    trigger itself makes its own start/end positions a function of its
    animation, which oscillates.

    Note on the inner wrapper's fractional opacity: it forms an isolated
    blending group, so ProjectRow's `mix-blend-difference` title now composites
    against this group rather than the page. That is still correct — the
    holographic preview it inverts against is inside the same group — but a
    wrapper added ABOVE this one with its own opacity or filter would break it.
  */
  return (
    <div ref={host} className={className}>
      <div className="will-change-[transform,opacity]">{children}</div>
    </div>
  );
}
