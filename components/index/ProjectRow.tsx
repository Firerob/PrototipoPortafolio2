'use client';

import { ArrowUpRight } from 'lucide-react';
import type { Project } from '@/types/project';
import { asset } from '@/lib/asset';

interface ProjectRowProps {
  project: Project;
  index: number;
  total: number;
}

/**
 * One row of the Deep Index. Purely presentational.
 *
 * It registers no listeners of its own. ProjectsIndex delegates a single
 * pointermove on the <ul> and writes each row's tilt straight onto the
 * `[data-plate]` node below.
 *
 * Six per-row `pointerenter` listeners were the first design and they never
 * fired: with the rows carrying 3D transforms inside a perspective container,
 * hit-testing resolved to the <ul> rather than to any <li>, so enter/leave on
 * the row never happened (measured: 12 effect runs, 0 enters). One delegated
 * listener on the element that IS hit sidesteps the whole problem and is less
 * code besides.
 */
export default function ProjectRow({ project, index, total }: ProjectRowProps) {
  const [from, to] = project.tint;

  return (
    <li
      id={project.id}
      data-row={index}
      className="group relative scroll-mt-24 origin-center will-change-transform"
    >
      <a
        href={`#${project.id}`}
        className="block py-6 focus-visible:outline-offset-8 sm:py-8"
        aria-label={`${project.title}, project ${index + 1} of ${total}`}
      >
        <div
          data-plate
          className="relative grid grid-cols-[auto_1fr] items-center gap-5 transition-transform duration-500 ease-out will-change-transform sm:grid-cols-[auto_1fr_auto] sm:gap-8"
        >
          <span
            aria-hidden="true"
            className="font-mono text-[0.7rem] tabular-nums tracking-[0.2em] text-text-muted transition-colors duration-300 group-hover:text-steel"
          >
            {String(index + 1).padStart(2, '0')}
          </span>

          <span className="min-w-0">
            {/*
              mix-blend-mode: difference, as the brief asks. Over the dark page
              the title stays near-white; where the bright preview panel slides
              behind it the same pixels invert to dark. No JS, no theme swap.

              It only works because no ancestor sets `isolation: isolate` —
              adding one anywhere above this silently flattens the effect.
            */}
            <span className="block truncate font-sans text-[clamp(1.5rem,4.4vw,3.1rem)] font-bold uppercase leading-[1.02] tracking-[-0.03em] text-white mix-blend-difference">
              {project.title}
            </span>
            <span className="mt-1 block truncate font-mono text-[0.6rem] uppercase tracking-[0.22em] text-text-muted">
              {project.tags.join(' · ')}
            </span>
          </span>

          <span className="hidden shrink-0 items-center gap-4 sm:flex">
            {/* Live projection readout, written by the delegated loop. */}
            <span
              data-readout
              aria-hidden="true"
              className="font-mono text-[0.58rem] tabular-nums tracking-[0.16em] text-text-muted/70"
            >
              +0.00 / +0.00
            </span>
            <ArrowUpRight
              className="size-4 text-text-muted transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-steel"
              aria-hidden="true"
            />
          </span>

          {/*
            Holographic preview. pointer-events-none so it can overlap the
            title — which is what gives the difference blend something to
            invert against — without ever stealing the row's hover or click.
          */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[8%] top-1/2 hidden h-[124%] w-[26%] -translate-y-1/2 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-within:opacity-100 lg:block"
          >
            <div className="relative size-full overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(139,123,255,0.45),0_0_34px_-6px_rgba(109,75,255,0.8)]">
              {/*
                Still first, then clip, then the generated panel.

                A still is decoded once and costs nothing after that; a video
                holds a decoder open and uploads a frame per tick for a panel
                that only exists while a row is hovered. object-cover so any
                aspect ratio fills the 26%-wide plate without distorting —
                portrait phone shots and 16:9 captures both land correctly.
              */}
              {project.image ? (
                <img
                  className="size-full object-cover"
                  src={asset(project.image)}
                  alt={project.alt ?? ''}
                  loading="lazy"
                  decoding="async"
                />
              ) : project.video ? (
                <video
                  className="size-full object-cover"
                  src={asset(project.video)}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="none"
                />
              ) : (
                <div
                  className="size-full"
                  style={{ background: `linear-gradient(145deg, ${from} 0%, ${to} 80%)` }}
                />
              )}

              {/* Blueprint crosses as one cheap repeating background layer. */}
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at center, rgba(255,255,255,0.55) 0.8px, transparent 1.4px)',
                  backgroundSize: '26px 26px',
                }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.16)_50%,transparent_65%)]" />
            </div>
          </div>
        </div>
      </a>

      {/* Hairline that lights on hover. A border on the row itself would shift
          layout whenever its width changed. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-hairline transition-colors duration-500 group-hover:bg-accent-soft/70"
      />
    </li>
  );
}
