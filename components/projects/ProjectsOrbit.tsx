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
          onRefresh: (self) => {
            setWorksProgress(self.progress);
            /*
              `pin` wraps pinEl in a NEW element — .pin-spacer — to hold its
              layout space while pinEl itself goes `position: fixed`. That
              wrapper is not something this component renders, so the
              `pointer-events-none` class on the pin div itself does not
              reach it: the spacer sits between <section> and the pin div,
              still with the browser default `pointer-events: auto`, and
              being an untransformed box the height of the whole pinned
              section, it was catching every tap meant for a card the same
              way the un-classed pin div used to (see that div's own
              comment). onRefresh is what guarantees the spacer already
              exists — pin/spacer creation happens inside ScrollTrigger's
              refresh cycle, so reading `pinEl.parentElement` any earlier
              is a race.
            */
            const spacer = pinEl.parentElement;
            if (spacer?.classList.contains('pin-spacer')) {
              spacer.style.pointerEvents = 'none';
            }
          },
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
  /*
    Shortened from 0.4s now that `index` is locked to the same damped value
    that positions the ring (see syncWorksActiveIndex in lib/worksScroll.ts):
    the swap fires at the exact instant the new card settles at the front, so
    a snappier cut reads as the caption reacting to that arrival rather than
    trailing it — the slower fade was tuned back when the two could disagree
    by a card or more during a fast scroll.
  */
  const duration = prefersReduced ? 0 : 0.22;

  return (
    /*
      pointer-events-none at the section level too, not just on the pin div.

      GSAP's `pin` wraps the pin div in its own .pin-spacer wrapper (handled
      in onRefresh above), but the SECTION itself is a third box the same
      height, still with the browser default `pointer-events: auto` — and
      with the spacer now excluded, this was the next thing silently eating
      every tap meant for a card. Safe to blanket here because every
      interactive descendant already declares its OWN pointer-events
      explicitly (pin div: none, the CTA link: auto) — an explicit value on a
      descendant always wins over an inherited one, so nothing downstream
      loses interactivity by this.
    */
    <section
      ref={section}
      id="works"
      aria-labelledby="works-heading"
      className="pointer-events-none relative z-10"
    >
      {/*
        Transparent throughout: the orbit lives in the canvas behind this and
        any background here would hide it.

        pointer-events-none on the pin itself, not just on the caption row
        below: a flex container this tall (min-h-[100svh]) is a hit target
        across its FULL box the instant it has no `pointer-events` of its
        own, empty middle included — CSS does not carve holes around where
        there happens to be no visible content. That box sits at z-10, over
        the canvas, so every tap meant for a card anywhere but the header
        text or the CTA button was landing on this transparent div and never
        reaching the mesh underneath. Both of those re-opt into
        pointer-events explicitly (see their own classes below).
      */}
      <div
        ref={pin}
        className="pointer-events-none flex min-h-[100svh] flex-col justify-between bg-transparent px-5 py-8 sm:px-8 sm:py-10"
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

        {/*
          pointer-events-none on the row: this caption floats directly over
          the orbit ring, and on a short mobile viewport the active card's
          lower half sits behind exactly this band. A plain text block here
          would silently eat the tap meant for the card underneath it — the
          "invisible overlay blocking clicks" this section used to be. Only
          the CTA link opts back into pointer-events, since that one really is
          meant to be clicked.
        */}
        <div className="pointer-events-none mx-auto flex w-full max-w-[1600px] flex-col gap-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
          {/* aria-live so the caption swap is announced as the orbit turns —
              otherwise the panel silently rewrites itself under a screen
              reader. */}
          <div aria-live="polite" aria-atomic="true" className="min-h-[7rem] sm:min-h-[9rem]">
            <AnimatePresence mode="wait">
              {/*
                Backing panel: a soft dark scrim behind the type, not a hard
                card. The busy grid/prism/card ring behind this text is what
                makes plain white-on-transparent fail contrast checks the
                moment a bright card slides underneath it — the blur and the
                text-shadow below are two independent fixes for the same
                problem, so either alone still holds up.
              */}
              <motion.article
                key={project?.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-fit rounded-2xl bg-black/40 px-4 py-3 backdrop-blur-sm sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none"
              >
                <time
                  dateTime={project?.date}
                  className="block font-mono text-[0.62rem] uppercase tracking-[0.28em] text-gray-200 [text-shadow:0_2px_4px_rgba(0,0,0,0.8)]"
                >
                  {project ? dateFormatter.format(new Date(`${project.date}T00:00:00Z`)) : ''}
                </time>

                <h3 className="mt-2 font-sans text-[clamp(1.5rem,4vw,2.75rem)] font-bold uppercase leading-[1.02] tracking-[-0.02em] text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.7)] sm:mt-3">
                  {project?.title}
                </h3>

                <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-[#f3f4f6] [text-shadow:0_1px_8px_rgba(0,0,0,0.65)]">
                  {project?.subtitle}
                </p>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {project?.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded border border-hairline bg-black/40 px-2.5 py-1 font-mono text-[0.6rem] lowercase tracking-[0.12em] text-gray-200 backdrop-blur-sm [text-shadow:0_2px_4px_rgba(0,0,0,0.8)]"
                    >
                      <span aria-hidden="true" className="text-gray-300">&gt; </span>
                      {tag}
                    </li>
                  ))}
                </ul>
              </motion.article>
            </AnimatePresence>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-4 lg:items-end">
            <p className="pointer-events-none rounded-md bg-black/40 px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] tabular-nums text-gray-200 backdrop-blur-sm [text-shadow:0_2px_4px_rgba(0,0,0,0.8)]">
              <span className="text-white">{String(index + 1).padStart(2, '0')}</span>
              <span className="mx-1.5 text-gray-400">/</span>
              {String(projects.length).padStart(2, '0')}
            </p>

            <a
              href="#archive"
              className="group pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-accent-soft/40 bg-accent/10 px-5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-colors duration-200 [text-shadow:0_2px_4px_rgba(0,0,0,0.8)] hover:border-accent-soft hover:bg-accent/20"
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
