'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { projects } from '@/content/projects';
import {
  archiveScroll,
  resetArchiveScroll,
  setArchiveProgress,
  subscribeTheme,
} from '@/lib/archiveScroll';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import WaveTransition from './WaveTransition';

/** Viewport heights of pinned scroll. Four gives each of the three overlapping
 *  beats roughly a screen and a half — enough to read as a move, not a cut. */
const PIN_VH = 4;

/**
 * The hero → archive transition.
 *
 * This section owns the scroll and nothing else: the wave is a fixed overlay,
 * the camera dive happens in HeroScene's CameraRig, and the tilted video
 * planes are meshes in the shared canvas. All three read one progress value
 * written here, which is what keeps the beats locked to each other instead of
 * to three separate triggers that can drift.
 */
export default function ArchiveSection() {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);

  useEffect(() => resetArchiveScroll, []);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        // Jump straight to the settled state: theme light, camera in, planes
        // present. A four-screen scrubbed camera flight is exactly the kind of
        // motion this preference exists to opt out of.
        setArchiveProgress(1);
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const pinEl = pin.current;
        if (!pinEl) return;

        ScrollTrigger.create({
          trigger: section.current,
          start: 'top top',
          end: () => `+=${window.innerHeight * PIN_VH}`,
          pin: pinEl,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          /*
            Same reason as the works pin: this one injects a spacer that
            changes the page height, so it must be measured before any trigger
            whose start/end depends on where this section ends.
          */
          refreshPriority: 1,
          /*
            `scrub` is not set here and that is deliberate — it only smooths a
            tween's playhead, and this trigger drives a plain value through
            onUpdate rather than tweening anything. Lenis has already smoothed
            the scroll position feeding it, and the consumers ease their own
            reads, which is where the scrub feel actually belongs.
          */
          onUpdate: (self) => setArchiveProgress(self.progress),
          onRefresh: (self) => setArchiveProgress(self.progress),
        });
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const theme = useSyncExternalStore(
    subscribeTheme,
    () => archiveScroll.theme,
    () => 'dark' as const,
  );

  const light = theme === 'light';

  return (
    <>
      <WaveTransition />

      <section
        ref={section}
        id="archive"
        aria-labelledby="archive-heading"
        // Transparent: the corridor of video planes is rendered by the shared
        // canvas behind this, so any background here would hide it.
        className="relative z-10 bg-transparent"
      >
        <div ref={pin} className="relative flex h-[100svh] min-h-[560px] flex-col justify-between overflow-hidden">
          {/*
            Blueprint grid. Two layered gradients give the fine cells and the
            heavier section lines; the crosses come from a third layer whose
            dots are clipped by their own background-size. Pure CSS, so it
            costs no texture fetch and stays crisp at any zoom.
          */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
              light ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(24,28,48,0.07) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(24,28,48,0.07) 1px, transparent 1px),
                radial-gradient(circle at center, rgba(24,28,48,0.30) 1px, transparent 1.6px)
              `,
              backgroundSize: '48px 48px, 48px 48px, 192px 192px',
            }}
          />

          {/* Oblique wash so the corridor reads as lit from the upper left,
              matching the direction the wave arrives from. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 mix-blend-multiply transition-opacity duration-700 ${
              light ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              background:
                'linear-gradient(118deg, rgba(109,75,255,0.10) 0%, transparent 42%, transparent 62%, rgba(75,225,255,0.12) 100%)',
            }}
          />

          <header className="relative mx-auto w-full max-w-[1600px] px-5 pt-8 sm:px-8 sm:pt-10">
            <div
              className={`flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] transition-colors duration-500 ${
                light ? 'text-[#5b6180]' : 'text-text-muted'
              }`}
            >
              <span aria-hidden="true" className={light ? 'text-[#5433ff]' : 'text-accent-soft'}>
                02
              </span>
              <span
                className={`h-px w-8 transition-colors duration-500 ${light ? 'bg-[#c3c9de]' : 'bg-hairline'}`}
                aria-hidden="true"
              />
              <span>Complete</span>
            </div>
            <h2
              id="archive-heading"
              className={`mt-3 font-sans text-[clamp(1.75rem,4.5vw,3rem)] font-bold leading-none tracking-[-0.03em] transition-colors duration-500 ${
                light ? 'text-[#12141f]' : 'text-text'
              }`}
            >
              Archive
            </h2>
          </header>

          {/*
            The project list stays in the DOM.

            The corridor is WebGL and therefore invisible to assistive tech and
            to anyone without a working context. This list is the same content
            as real, focusable links — it is the archive, and the 3D planes are
            its presentation.
          */}
          <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-10 sm:px-8 sm:pb-14">
            <ul className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, i) => (
                <li key={project.id}>
                  <a
                    href={`#${project.id}`}
                    className={`group flex min-h-11 items-baseline justify-between gap-4 border-b py-3 transition-colors duration-300 ${
                      light
                        ? 'border-[#d3d8e8] text-[#12141f] hover:border-[#5433ff]'
                        : 'border-hairline text-text hover:border-accent-soft'
                    }`}
                  >
                    <span className="flex items-baseline gap-3">
                      <span
                        aria-hidden="true"
                        className={`font-mono text-[0.6rem] tracking-[0.2em] transition-colors duration-300 ${
                          light ? 'text-[#868fa8]' : 'text-text-muted'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm font-semibold uppercase tracking-[-0.01em]">
                        {project.title}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.18em] transition-colors duration-300 ${
                        light ? 'text-[#868fa8]' : 'text-text-muted'
                      }`}
                    >
                      {project.tags[0]}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
