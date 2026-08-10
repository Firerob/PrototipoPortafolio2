'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { projects } from '@/content/projects';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import ProjectRow from './ProjectRow';

/*
  Depth is expressed as SCALE, not translateZ.

  translateZ inside a perspective container was the first implementation and
  it broke interaction outright: with the rows also carrying `filter` and
  `opacity`, hit-testing resolved to the <ul> instead of to any <li>, so not
  even the CSS :hover state fired (measured: preview opacity stuck at 0, no
  pointer event ever reached a row). Scale is the on-screen projection of Z
  anyway — an object twice as far away is drawn half as large — so paired with
  blur and opacity it reads as the same corridor while hit-testing exactly
  where it is drawn.
*/
/** Scale lost per step away from the focus. */
const SCALE_PER_STEP = 0.055;
const MIN_SCALE = 0.74;
/** Vertical drift per step, which supplies the vanishing-point cue. */
const LIFT_PER_STEP = 5;
/** Blur applied to a row one full step away from the focus, in px. */
const BLUR_PER_STEP = 2.6;
const MAX_BLUR = 7;
/**
 * How many rows are mid-entry at once as the list materialises.
 *
 * The corridor the arrival section leaves the viewer in has to keep going, so
 * the rows do not fade in as a block — they resolve out of the vanishing point
 * one after another. Lower values make them arrive as a queue, higher as a
 * mass; 2.5 keeps the trailing row's start close enough to the leading one's
 * finish that the sequence reads as continuous.
 */
const ENTRY_LEAD = 2.5;
/** Scale of a row that has not yet arrived — deep in the same corridor. */
const ENTRY_SCALE = 0.56;
/** Extra blur and lift on a row still at that distance. */
const ENTRY_BLUR = 9;
const ENTRY_LIFT = 52;

/** Maximum hover tilt, in degrees. */
const TILT_DEG = 7;
/** Base of the frame-rate-independent tilt follow. */
const TILT_LAMBDA = 0.0008;
const ORIGIN = { x: 0, y: 0 };

const DESKTOP = '(min-width: 768px)';

/**
 * "The Deep Index" — the project list navigated along Z.
 *
 * Built from DOM nodes and CSS 3D rather than a third R3F canvas, on purpose:
 * the brief asks for crisp industrial typography, and text rendered into a
 * WebGL texture is never as sharp as text the browser rasterises itself. It
 * also keeps real links, real focus order and real text selection, and avoids
 * a third live WebGL context on a page that already runs two.
 *
 * Scroll drives one focus value; every row derives its own Z, blur and opacity
 * from its distance to that focus. Hover overrides the focus so pointer and
 * scroll never fight for it.
 */
export default function ProjectsIndex() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

  /** Continuous focus position, 0..count-1. Written by scroll AND by hover. */
  const focus = useRef(0);
  /** Row index the pointer owns, or null when scroll is in charge. */
  const hoverLock = useRef<number | null>(null);
  /** 0 while the list is still deep in the corridor, 1 once it has arrived. */
  const entry = useRef(0);
  /** Live tilt target per row, -1..1. Index-aligned with `rows`. */
  const tilt = useRef<{ x: number; y: number }[]>([]);

  const [active, setActive] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        { desktop: DESKTOP, reduced: '(prefers-reduced-motion: reduce)' },
        (context) => {
          const { desktop, reduced } = context.conditions as {
            desktop: boolean;
            reduced: boolean;
          };

          const rows = Array.from(
            list.current?.querySelectorAll<HTMLElement>('[data-row]') ?? [],
          );
          if (!rows.length) return;

          /*
            Below the breakpoint, or under reduced motion, the depth effect is
            switched off entirely: no Z, no blur, no scroll coupling. A blurred
            list you must scroll precisely to read is hostile on a phone, and
            depth-of-field is exactly the kind of motion the preference opts
            out of. The same markup just renders as a flat, legible list.
          */
          if (!desktop || reduced) {
            // Including the entry ramp: a list that materialises out of a
            // vanishing point is the same depth illusion the rest of this
            // branch opts out of, and on a phone it would leave the section
            // blank until scrolled to exactly the right offset.
            entry.current = 1;
            rows.forEach((row) => {
              row.style.transform = '';
              row.style.filter = '';
              row.style.opacity = '';
            });
            return;
          }

          const pointer = { x: 0, y: 0 };
          let lastFrame = performance.now();

          /** smootherstep, local copy — zero velocity at both ends. */
          const ease = (t: number) => {
            const x = Math.min(1, Math.max(0, t));
            return x * x * x * (x * (x * 6 - 15) + 10);
          };

          const apply = () => {
            const f = focus.current;
            /*
              The entry ramp is folded into the SAME write as the depth-of-
              field, not layered on top as a separate GSAP tween. Two writers
              on one element's transform means the last one each frame wins,
              and which one that is depends on tween ordering — the rows
              flickered between the two states. One expression, one write.
            */
            const arrival = entry.current * (rows.length + ENTRY_LEAD);

            rows.forEach((row, i) => {
              const distance = i - f;
              const abs = Math.abs(distance);
              const e = ease((arrival - i) / ENTRY_LEAD);

              /*
                Rows behind the focus recede; rows in front come toward the
                viewer. Using signed distance (not abs) is what makes the list
                read as a corridor you are moving through rather than a stack
                that breathes symmetrically.
              */
              const depth = Math.max(MIN_SCALE, 1 - abs * SCALE_PER_STEP);
              const scale = depth * (ENTRY_SCALE + (1 - ENTRY_SCALE) * e);
              const lift = -distance * LIFT_PER_STEP + (1 - e) * ENTRY_LIFT;
              const blur = Math.min(abs * BLUR_PER_STEP, MAX_BLUR) + (1 - e) * ENTRY_BLUR;
              const opacity = Math.max(0.22, 1 - abs * 0.26) * e;

              row.style.transform = `translateY(${lift.toFixed(1)}px) scale(${scale.toFixed(4)})`;
              // Blur only when it will be visible — filter forces a repaint
              // even at 0px, so skipping it entirely on the focused row keeps
              // that one on the compositor fast path.
              // Blur only when visible: `filter` forces a repaint even at 0px,
              // so skipping it on the focused row keeps that one on the
              // compositor fast path.
              row.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
              row.style.opacity = opacity.toFixed(3);
              // A row still deep in the corridor is drawn at ~0 opacity but
              // would otherwise still take clicks over its final position.
              row.style.pointerEvents = e < 0.05 ? 'none' : '';
            });

            /*
              Tilt, applied from the delegated pointer state.

              Eased here rather than on pointermove so the follow is
              frame-rate independent: 1 - lambda^dt converges at the same
              speed at 60Hz and 144Hz, where a fixed per-event factor would
              not.
            */
            const now = performance.now();
            const dt = Math.min((now - lastFrame) / 1000, 1 / 30);
            lastFrame = now;
            const k = 1 - Math.pow(TILT_LAMBDA, dt);

            rows.forEach((row, i) => {
              const state = tilt.current[i] ?? (tilt.current[i] = { x: 0, y: 0 });
              const wanted = hoverLock.current === i ? pointer : ORIGIN;
              state.x += (wanted.x - state.x) * k;
              state.y += (wanted.y - state.y) * k;

              const plate = row.querySelector<HTMLElement>('[data-plate]');
              if (plate) {
                const idle = Math.abs(state.x) < 0.002 && Math.abs(state.y) < 0.002;
                plate.style.transform = idle
                  ? ''
                  : `perspective(1000px) rotateY(${(state.x * TILT_DEG).toFixed(3)}deg) ` +
                    `rotateX(${(-state.y * TILT_DEG).toFixed(3)}deg) ` +
                    `translateZ(${hoverLock.current === i ? 26 : 0}px)`;
              }

              const out = row.querySelector<HTMLElement>('[data-readout]');
              if (out) {
                const fmt = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2);
                out.textContent = `${fmt(state.x)} / ${fmt(state.y)}`;
              }
            });

            const nearest = Math.round(f);
            if (counter.current) {
              counter.current.textContent = String(
                Math.min(rows.length, Math.max(1, nearest + 1)),
              ).padStart(2, '0');
            }
            setActive((prev) => (prev === nearest ? prev : nearest));
          };

          /*
            The list materialising out of the corridor IndexArrival leaves the
            viewer in. Its window is placed so it begins the moment the arrival
            stage unsticks — the two are adjacent in the scroll, so the wave
            clearing and the rows resolving are one continuous move.
          */
          ScrollTrigger.create({
            trigger: section.current,
            start: 'top 90%',
            end: 'top 32%',
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: (self) => (entry.current = self.progress),
            onRefresh: (self) => (entry.current = self.progress),
          });

          ScrollTrigger.create({
            trigger: section.current,
            // Runs across the section's own travel — no pin. Pinning a list
            // the user is trying to read and click would trap them in it.
            start: 'top 80%',
            end: 'bottom 20%',
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              // Hover wins while it is held; scroll resumes control the moment
              // the pointer leaves any row.
              if (hoverLock.current === null) {
                focus.current = self.progress * (rows.length - 1);
              }
            },
          });

          // One rAF applies the styles for both inputs, so scroll and hover
          // can never write conflicting transforms in the same frame.
          let raf = requestAnimationFrame(function loop() {
            raf = requestAnimationFrame(loop);
            apply();
          });

          /*
            ONE delegated pointermove on the <ul>.

            Per-row pointerenter listeners were the first attempt and never
            fired — with 3D-transformed rows inside a perspective container,
            hit-testing resolves to the <ul>, not to any <li>. Delegating to
            the element that does receive events fixes it and replaces six
            listeners with one.
          */
          const onMove = (event: PointerEvent) => {
            const row = (event.target as HTMLElement)?.closest?.<HTMLElement>('[data-row]');
            if (!row) {
              hoverLock.current = null;
              return;
            }
            const i = Number(row.dataset.row);
            hoverLock.current = i;
            focus.current = i;
            const rect = row.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
          };

          const clearLock = () => {
            hoverLock.current = null;
            pointer.x = 0;
            pointer.y = 0;
          };

          const listEl = list.current;
          listEl?.addEventListener('pointermove', onMove, { passive: true });
          listEl?.addEventListener('pointerleave', clearLock);
          // Keyboard focus drives the same lock, without any tilt.
          listEl?.addEventListener('focusin', onMove as unknown as EventListener);

          return () => {
            cancelAnimationFrame(raf);
            listEl?.removeEventListener('pointermove', onMove);
            listEl?.removeEventListener('pointerleave', clearLock);
            listEl?.removeEventListener('focusin', onMove as unknown as EventListener);
            entry.current = 0;
            rows.forEach((row) => {
              row.style.transform = '';
              row.style.filter = '';
              row.style.opacity = '';
              row.style.pointerEvents = '';
              row.querySelector<HTMLElement>('[data-plate]')?.removeAttribute('style');
            });
          };
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="index"
      aria-labelledby="index-heading"
      className="relative scroll-mt-24 px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-14"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6 sm:mb-16">
          <div>
            <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-text-muted">
              <span aria-hidden="true" className="text-accent-soft">03</span>
              <span className="h-px w-8 bg-hairline" aria-hidden="true" />
              <span>Deep Index</span>
            </div>
            <h2
              id="index-heading"
              className="mt-3 font-sans text-[clamp(1.75rem,4.5vw,3rem)] font-bold leading-none tracking-[-0.03em] text-text"
            >
              Index
            </h2>
          </div>

          {/* Live counter. Text is written imperatively by the rAF loop, so the
              digits update at frame rate without re-rendering the list. */}
          <p
            aria-live="polite"
            className="font-mono text-[0.62rem] uppercase tracking-[0.2em] tabular-nums text-text-muted"
          >
            <span aria-hidden="true">[</span>
            <span ref={counter} className="text-text">01</span>
            <span className="mx-1 text-text-muted/50">/</span>
            {String(projects.length).padStart(2, '0')}
            <span aria-hidden="true">]</span>
            <span className="sr-only">
              {' '}
              {projects[active]?.title} in focus
            </span>
          </p>
        </div>

        {/*
          No perspective/preserve-3d container.

          The depth is scale-based now, and the per-row hover tilt carries its
          own `perspective(1000px)` inside its own transform, which is
          self-contained and does not need an ancestor 3D context. Removing the
          shared one is what restores hit-testing on the rows.
        */}
        <div ref={stage}>
          <ul ref={list} className="border-t border-hairline">
            {projects.map((project, i) => (
              <ProjectRow key={project.id} project={project} index={i} total={projects.length} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
