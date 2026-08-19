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
import { openProjectDetail } from '@/lib/projectDetail';
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
          onRefresh: (self) => {
            setArchiveProgress(self.progress);
            // Same fix as ProjectsOrbit's pin, and the same reason: `pin`
            // wraps pinEl in a .pin-spacer this component never renders, so
            // the pointer-events-none on pinEl itself doesn't reach it — the
            // spacer was left catching every tap meant for a corridor plane.
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

  const theme = useSyncExternalStore(
    subscribeTheme,
    () => archiveScroll.theme,
    () => 'dark' as const,
  );

  const light = theme === 'light';

  return (
    <>
      <WaveTransition />

      {/*
        pointer-events-none on the section too — same reasoning as
        ProjectsOrbit's section: GSAP's pin-spacer is excluded in onRefresh
        above, but the section itself is a third same-height box with the
        browser default `pointer-events: auto`, and was the next thing
        catching every tap meant for a corridor plane once the spacer no
        longer did. Nothing inside declares its own `auto` (the project list
        is sr-only, not clickable by pointer), so nothing needs to opt back
        in here.
      */}
      <section
        ref={section}
        id="archive"
        aria-labelledby="archive-heading"
        // Transparent: the corridor of video planes is rendered by the shared
        // canvas behind this, so any background here would hide it.
        className="pointer-events-none relative z-10 bg-transparent"
      >
        {/*
          pointer-events-none: nothing left inside this box is meant to catch
          the mouse/touch (the header is decorative and the project list below
          is sr-only), so the box itself must not sit as a full-height,
          full-width hit target over the corridor's planes — the same "empty
          div still blocks clicks to the canvas beneath it" issue fixed in
          ProjectsOrbit's pin. Focus and Enter/Space on the sr-only buttons
          are unaffected: pointer-events only governs pointer hit-testing, not
          keyboard activation.
        */}
        <div
          ref={pin}
          className="pointer-events-none relative flex h-[100svh] min-h-[560px] flex-col justify-between overflow-hidden"
        >
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

          {/*
            Both header lines sit directly over the tilted video corridor —
            the section itself is transparent so the canvas shows through —
            so a plain colour swap between themes was not enough contrast
            once a bright plane drifted behind the type. The shadow direction
            flips with the theme: a dark glow reads on the light corridor
            wash, a black one on the near-black hero backdrop.
          */}
          <header className="relative mx-auto w-full max-w-[1600px] px-5 pt-8 sm:px-8 sm:pt-10">
            <div
              className={`flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] transition-colors duration-500 ${
                light
                  ? 'text-[#5b6180] [text-shadow:0_1px_10px_rgba(255,255,255,0.75)]'
                  : 'text-text-muted [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]'
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
                light
                  ? 'text-[#12141f] [text-shadow:0_2px_16px_rgba(255,255,255,0.8)]'
                  : 'text-text [text-shadow:0_2px_16px_rgba(0,0,0,0.75)]'
              }`}
            >
              Archive
            </h2>
          </header>

          {/*
            The project list stays reachable, just not painted over the scene.

            It used to render as a static grid stacked on top of the tilted
            video corridor — legible on its own, but it fought the planes for
            the same screen space and made the 3D gallery read as cluttered
            rather than as the presentation. The corridor is WebGL and
            therefore invisible to assistive tech and to anyone without a
            working context, so the list itself is not gone: `sr-only` keeps
            every title, order and tag reachable by a screen reader or Tab,
            each one now opening the same detail view a click on its plane
            does, through a real <button> rather than a `#project-id` anchor
            that pointed at no matching section.
          */}
          <div className="sr-only">
            <ul>
              {projects.map((project, i) => (
                <li key={project.id}>
                  <button type="button" onClick={() => openProjectDetail(project.id)}>
                    {String(i + 1).padStart(2, '0')} — {project.title} ({project.tags[0]})
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
