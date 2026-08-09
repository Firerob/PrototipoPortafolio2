'use client';

import { ArrowUpRight } from 'lucide-react';

/**
 * A single project tile.
 *
 * The visual is a gradient panel standing in for artwork. It reserves its
 * aspect ratio, so dropping a real <Image fill /> inside the same panel later
 * changes nothing about the layout (quick-reference §3: reserve space).
 */
export default function WorkCard({ work, index }) {
  const [from, to] = work.tint;

  return (
    <a
      href={`#${work.id}`}
      className="group block focus-visible:outline-offset-4"
      aria-label={`${work.title}, ${work.category}, ${work.year}`}
    >
      <div className="relative overflow-hidden rounded-xl border border-hairline bg-ink">
        <div className="aspect-[4/3] w-full">
          {/* Only transform and opacity animate here — both are compositor
              properties, so the hover never triggers layout or paint. */}
          <div
            className="size-full transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            style={{ background: `linear-gradient(145deg, ${from} 0%, ${to} 78%)` }}
          >
            {/* Hairline grid, echoing the hero floor so the sections read as
                one system rather than two unrelated pages. */}
            <div
              aria-hidden="true"
              className="size-full opacity-[0.18]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)',
                backgroundSize: '38px 38px',
              }}
            />
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,5,8,0.85),transparent_55%)]"
        />

        <span
          aria-hidden="true"
          className="absolute left-4 top-4 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-text/70"
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        <span className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full border border-text/25 bg-void/40 text-text opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="font-sans text-base font-semibold tracking-[-0.01em] text-text">
          {work.title}
        </h3>
        <span className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-text-muted">
          {work.year}
        </span>
      </div>
      <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-text-muted">{work.blurb}</p>
    </a>
  );
}
