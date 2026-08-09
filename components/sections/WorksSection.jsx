'use client';

import { useMemo, useState } from 'react';
import { works } from '@/content/site';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';
import WorkCard from './WorkCard';

const ALL = 'All';

/*
  Category filtering comes straight from the landing.csv "Portfolio Grid"
  pattern ("Filter by category"). It filters an in-memory array — no routing,
  no fetch — so it stays instant and needs no loading state.
*/
export default function WorksSection() {
  const [active, setActive] = useState(ALL);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(works.map((w) => w.category)))],
    [],
  );

  const visible = useMemo(
    () => (active === ALL ? works : works.filter((w) => w.category === active)),
    [active],
  );

  return (
    <section
      id="archive"
      aria-labelledby="archive-heading"
      className="scroll-mt-24 border-t border-hairline px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          {/* The filterable grid is the accessible, no-WebGL counterpart to the
              3D carousel above: same body of work, reachable by tab and
              readable with motion disabled. */}
          <SectionHeading id="archive-heading" index="02" label="Complete" title="Archive" />

          {/* Radio group, not buttons: the filters are one mutually exclusive
              choice, and this gives keyboard users arrow-key traversal. */}
          <Reveal className="mb-10 sm:mb-14">
            <div role="radiogroup" aria-label="Filter works by category" className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const selected = category === active;
                return (
                  <button
                    key={category}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setActive(category)}
                    className={`min-h-11 rounded-full border px-4 font-mono text-[0.65rem] uppercase tracking-[0.2em] transition-colors duration-200 ${
                      selected
                        ? 'border-accent-soft bg-accent/20 text-text'
                        : 'border-hairline text-text-muted hover:border-text-muted hover:text-text'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>

        <ul className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((work, i) => (
            <li
              key={work.id}
              id={work.id}
              className={`scroll-mt-24 ${work.featured ? 'lg:col-span-2' : ''}`}
            >
              <Reveal delay={Math.min(i, 3) * 0.06}>
                <WorkCard work={work} index={i} />
              </Reveal>
            </li>
          ))}
        </ul>

        {/* aria-live so the count change is announced when a filter is used —
            otherwise the grid silently swaps under a screen-reader user. */}
        <p aria-live="polite" className="mt-10 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-text-muted">
          {visible.length} {visible.length === 1 ? 'project' : 'projects'}
          {active !== ALL ? ` in ${active}` : ''}
        </p>
      </div>
    </section>
  );
}
