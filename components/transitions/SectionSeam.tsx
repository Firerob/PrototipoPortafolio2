'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ScrambleText from '@/components/about/ScrambleText';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

interface SectionSeamProps {
  /** Two-digit number of the section being left. */
  fromIndex: string;
  fromLabel: string;
  /** Two-digit number of the section being entered. */
  toIndex: string;
  toLabel: string;
}

/**
 * The boundary between two DOM sections, drawn instead of asserted.
 *
 * What was here before was `border-t border-hairline` — a static 1px line that
 * says two boxes are stacked, which is true and tells the viewer nothing. This
 * replaces it with the handoff itself: a rule that draws left to right under a
 * travelling spark, the outgoing chapter number sliding out as the incoming
 * one decodes in, and a connector that threads down into the eyebrow of the
 * section below.
 *
 * One component for all three crossings rather than three bespoke ones. The
 * seams are a *system* — if 03→04 and 04→05 behaved differently the page would
 * read as inconsistent rather than as rich, and consistency is the whole point
 * of a repeated element.
 *
 * Scrubbed, never pinned. The scroll position drives the drawing directly, so
 * the seam is a thing the viewer is moving past rather than a cutscene played
 * at them — and scrolling back up un-draws it exactly.
 */
export default function SectionSeam({
  fromIndex,
  fromLabel,
  toIndex,
  toLabel,
}: SectionSeamProps) {
  const host = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      /*
        Everything below is inside the no-preference branch, and the markup
        renders in its finished state by default. Under reduced motion the
        effect simply never runs and the seam is a drawn rule with both labels
        visible — still a better boundary than a bare border, with no motion.
      */
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const el = host.current;
        const track = el?.querySelector<HTMLElement>('[data-track]');
        if (!el || !track) return;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            // Starts as the seam clears the fold and finishes well before it
            // leaves, so the drawing is complete while it is still central and
            // readable — a seam that finishes off-screen was never seen.
            start: 'top 92%',
            end: 'bottom 45%',
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
          /*
            Every duration and position below is explicit. GSAP's 0.5s default
            silently stretched the timeline to 1.32 units and put the spark's
            fade-out *after* it had already stopped moving, which read as the
            light switching off in place. On a scrubbed timeline the numbers
            are a storyboard, not timings — they have to be written down.
          */
          defaults: { ease: 'none', duration: 0.45 },
        });

        tl
          // The rule and the spark share one 0→0.8 window: the spark is the
          // pen, so it must sit exactly on the leading edge the whole way.
          .fromTo('[data-rule]', { scaleX: 0 }, { scaleX: 1, duration: 0.8 }, 0)
          // Function-based so the travel is re-measured on resize rather than
          // baked in at first paint.
          .fromTo('[data-spark]', { x: 0 }, { x: () => track.clientWidth, duration: 0.8 }, 0)
          .fromTo('[data-spark]', { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0)
          .to('[data-spark]', { opacity: 0, duration: 0.22 }, 0.62)
          .fromTo('[data-from]', { opacity: 1, x: 0 }, { opacity: 0.18, x: -16 }, 0)
          .fromTo('[data-to]', { opacity: 0, x: 16 }, { opacity: 1, x: 0 }, 0.42)
          .fromTo('[data-connector]', { scaleY: 0 }, { scaleY: 1, duration: 0.32 }, 0.6)
          // Bloom up and back down, so the accent is a pulse the seam passes
          // through rather than a glow it leaves switched on.
          .fromTo('[data-bloom]', { opacity: 0 }, { opacity: 1, duration: 0.38 }, 0.08)
          .to('[data-bloom]', { opacity: 0, duration: 0.42 }, 0.55);
      });
    }, host);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={host}
      // Not a <section>: it carries no content of its own, and an extra
      // landmark between every pair of real sections is noise in a rotor.
      aria-hidden="true"
      className="relative h-[24vh] min-h-[150px] overflow-hidden"
    >
      {/* Accent bloom, sized in vw so it stays a wide low wash rather than a
          circle on ultrawide displays. */}
      <div
        data-bloom
        className="pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[70vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-accent/25 opacity-0 blur-[90px]"
      />

      <div className="absolute inset-x-0 top-1/2 mx-auto max-w-[1600px] -translate-y-1/2 px-5 sm:px-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <span
            data-from
            className="whitespace-nowrap font-mono text-[0.6rem] uppercase tracking-[0.28em] text-text-muted"
          >
            <span className="text-text-muted/60">{fromIndex}</span>
            <span className="mx-2 text-text-muted/40">/</span>
            {fromLabel}
          </span>

          <span data-track className="relative h-px flex-1 bg-hairline">
            {/*
              Rendered in its FINISHED state, not its starting one.

              It shipped with `scale-x-0` and that was a real bug: under
              reduced motion the timeline never runs, nothing ever sets the
              scale back, and the seam stayed a 0-width rule with an invisible
              incoming label — those viewers got no boundary between sections
              at all, which is worse than the plain border this replaced.
              GSAP's fromTo writes the start values itself, so the default only
              ever has to be right for the no-JS / no-motion case.
            */}
            <span
              data-rule
              className="absolute inset-0 origin-left bg-gradient-to-r from-accent/40 via-accent-soft to-cyan"
            />
            {/* The pen drawing the rule. -mt/-ml centre it on a 1px line
                without a transform that would fight the tween's own x. */}
            <span
              data-spark
              className="absolute left-0 top-1/2 -ml-[3px] -mt-[3px] size-1.5 rounded-full bg-cyan opacity-0 shadow-[0_0_14px_3px_rgba(75,225,255,0.55)]"
            />
          </span>

          <span
            data-to
            className="whitespace-nowrap font-mono text-[0.6rem] uppercase tracking-[0.28em] text-text"
          >
            <span className="text-accent-soft">{toIndex}</span>
            <span className="mx-2 text-text-muted/40">/</span>
            <ScrambleText text={toLabel} speed={3} />
          </span>
        </div>
      </div>

      {/* Threads down into the next section's eyebrow, so the two are wired
          together rather than merely adjacent. */}
      <span
        data-connector
        className="absolute bottom-0 left-5 h-[calc(50%-1px)] w-px origin-top bg-gradient-to-b from-accent-soft/60 to-transparent sm:left-8"
      />
    </div>
  );
}
