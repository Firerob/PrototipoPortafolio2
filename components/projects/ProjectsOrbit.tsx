'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { projects } from '@/content/projects';
import {
  resetWorksScroll,
  setWorksCount,
  setWorksProgress,
  subscribeActiveIndex,
  worksScroll,
  worksScrollLength,
} from '@/lib/worksScroll';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Scroll driver and HUD for the 3D orbit. Renders no cards itself.
 *
 * The cards are meshes inside the page's single fixed canvas; this section
 * exists to give them scroll distance to play across and to caption whichever
 * one is current.
 *
 * Pinning here is not scroll-jacking: nothing calls preventDefault, the
 * scrollbar keeps moving at its normal rate, and Ctrl+F, keyboard paging and
 * trackpad gestures all behave. The anti-pattern is intercepting the wheel,
 * which this does not do.
 */
export default function ProjectsOrbit() {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  /*
    Set the count here as well as in OrbitCards.

    OrbitCards lives behind a dynamic ssr:false import, so on a slow load this
    section's ScrollTrigger can fire onRefresh/onUpdate before the canvas has
    mounted. setWorksProgress early-returns while count is 0, which would
    leave the caption pinned to project 1 until the first scroll after mount.
  */
  useEffect(() => {
    setWorksCount(projects.length);
    return resetWorksScroll;
  }, []);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        // No pin, no scroll choreography. The ring is simply assembled and
        // still, and the details below list the projects as plain text.
        setWorksProgress(1);
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const pinEl = pin.current;
        if (!pinEl) return;

        ScrollTrigger.create({
          trigger: section.current,
          start: 'top top',
          /*
            Length is a function of BOTH the viewport and the card count.

            Function-based so `invalidateOnRefresh` re-evaluates it on resize —
            a hard-coded pixel length breaks the moment the viewport changes.
            But the count term matters just as much: the previous
            `innerHeight * 4` was tuned by hand for six projects, so adding a
            seventh would have squeezed every card's on-screen moment shorter
            without anything visibly "breaking". worksScrollLength() spends a
            fixed budget on the fly-in plus a fixed budget PER CARD, so the pin
            grows with the deck.
          */
          end: () => `+=${Math.round(worksScrollLength(projects.length, window.innerHeight))}`,
          pin: pinEl,
          // Pre-renders the pin a frame early, removing the 1px jump that
          // otherwise shows at pin start on a Lenis-smoothed scroll.
          anticipatePin: 1,
          invalidateOnRefresh: true,
          /*
            Refresh BEFORE any trigger whose start/end depends on this
            section's height.

            Pinning injects a spacer that makes #works ~5x taller. ScrollTrigger
            refreshes in creation order by default, so HeroCanvas's parking
            trigger — which ends at "#works bottom" — was measuring the
            unpinned 900px height and computing a bottom at ~1800px. It parked
            the renderer (frameloop="never") a fifth of the way through the
            orbit while the DOM caption kept advancing: the scene visibly froze
            mid-sweep. A higher refreshPriority makes this pin measure first so
            dependents see the real post-pin geometry.
          */
          refreshPriority: 1,
          // No `scrub` needed: this drives a value, not a tween, and Lenis has
          // already smoothed the scroll position feeding it.
          onUpdate: (self) => setWorksProgress(self.progress),
          onRefresh: (self) => setWorksProgress(self.progress),
        });
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const index = useSyncExternalStore(
    subscribeActiveIndex,
    () => worksScroll.activeIndex,
    () => 0,
  );

  const project = projects[Math.min(index, projects.length - 1)];
  const duration = prefersReduced ? 0 : 0.4;

  return (
    <section ref={section} id="works" aria-labelledby="works-heading" className="relative z-10">
      {/* Transparent throughout: the orbit lives in the canvas behind this and
          any background here would hide it. */}
      <div
        ref={pin}
        className="flex min-h-[100svh] flex-col justify-between bg-transparent px-5 py-8 sm:px-8 sm:py-10"
      >
        <header className="mx-auto w-full max-w-[1600px]">
          <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-text-muted">
            <span aria-hidden="true" className="text-accent-soft">01</span>
            <span className="h-px w-8 bg-hairline" aria-hidden="true" />
            <span>Selected</span>
          </div>
          <h2
            id="works-heading"
            className="mt-3 font-sans text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-none tracking-[-0.03em] text-text"
          >
            Works
          </h2>
        </header>

        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          {/* aria-live so the caption swap is announced as the orbit turns —
              otherwise the panel silently rewrites itself under a screen
              reader. */}
          <div aria-live="polite" aria-atomic="true" className="min-h-[9rem]">
            <AnimatePresence mode="wait">
              <motion.article
                key={project?.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
              >
                <time
                  dateTime={project?.date}
                  className="block font-mono text-[0.62rem] uppercase tracking-[0.28em] text-text-muted"
                >
                  {project ? dateFormatter.format(new Date(`${project.date}T00:00:00Z`)) : ''}
                </time>

                <h3 className="mt-3 font-sans text-[clamp(1.6rem,4vw,2.75rem)] font-bold uppercase leading-[1.02] tracking-[-0.02em] text-text">
                  {project?.title}
                </h3>

                <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-text-muted">
                  {project?.subtitle}
                </p>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {project?.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded border border-hairline bg-surface/60 px-2.5 py-1 font-mono text-[0.6rem] lowercase tracking-[0.12em] text-accent-soft backdrop-blur-sm"
                    >
                      <span aria-hidden="true" className="text-text-muted">&gt; </span>
                      {tag}
                    </li>
                  ))}
                </ul>
              </motion.article>
            </AnimatePresence>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-4 lg:items-end">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] tabular-nums text-text-muted">
              <span className="text-text">{String(index + 1).padStart(2, '0')}</span>
              <span className="mx-1.5 text-text-muted/50">/</span>
              {String(projects.length).padStart(2, '0')}
            </p>

            <a
              href="#archive"
              className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-accent-soft/40 bg-accent/10 px-5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-text backdrop-blur-sm transition-colors duration-200 hover:border-accent-soft hover:bg-accent/20"
            >
              More Works
              <ArrowUpRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
