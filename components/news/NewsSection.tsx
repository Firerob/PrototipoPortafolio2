'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, useReducedMotion } from 'framer-motion';
import { news } from '@/content/news';
import { NEWS_CATEGORIES, type NewsCategory } from '@/types/news';
import NewsCard from './NewsCard';
import NewsFilters from './NewsFilters';
import NewsModal from './NewsModal';

/**
 * "Transmission Feed" — the news section.
 *
 * Holds the two pieces of state that genuinely belong in React (the active
 * filter and the open article) and nothing else. Card hover, the 3D lift and
 * the scanlines are all CSS or inline style writes, so moving the pointer
 * across the grid does not re-render anything.
 */
export default function NewsSection() {
  const prefersReduced = useReducedMotion();
  const reducedMotion = prefersReduced === true;

  const [category, setCategory] = useState<NewsCategory>('ALL');
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const base = Object.fromEntries(
      NEWS_CATEGORIES.map((c) => [c, 0]),
    ) as Record<NewsCategory, number>;
    base.ALL = news.length;
    for (const item of news) base[item.category] += 1;
    return base;
  }, []);

  const visible = useMemo(
    () => (category === 'ALL' ? news : news.filter((n) => n.category === category)),
    [category],
  );

  const openItem = useMemo(
    () => news.find((n) => n.id === openId) ?? null,
    [openId],
  );

  // Stable so NewsCard's props do not change identity on every parent render.
  const onOpen = useCallback((id: string) => setOpenId(id), []);
  const onClose = useCallback(() => setOpenId(null), []);

  return (
    <section
      id="news"
      aria-labelledby="news-heading"
      className="scroll-mt-24 border-t border-hairline px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-10 flex flex-col gap-8 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-text-muted">
              <span aria-hidden="true" className="text-accent-soft">04</span>
              <span className="h-px w-8 bg-hairline" aria-hidden="true" />
              <span>Transmission Feed</span>
            </div>
            <h2
              id="news-heading"
              className="mt-3 font-sans text-[clamp(1.75rem,4.5vw,3rem)] font-bold leading-none tracking-[-0.03em] text-text"
            >
              News
            </h2>
          </div>

          <NewsFilters
            active={category}
            counts={counts}
            onChange={setCategory}
            reducedMotion={reducedMotion}
          />
        </div>

        {/*
          LayoutGroup scopes the layout animations so the filter underline and
          the card reflow are measured against each other in one pass. Without
          it the two animate on independent schedules and visibly disagree
          during a filter change.
        */}
        <LayoutGroup>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {/* popLayout so exiting cards leave the flow immediately and the
                survivors slide into their new slots, instead of waiting for
                the exit animation to finish. */}
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((item, i) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  index={i}
                  onOpen={onOpen}
                  reducedMotion={reducedMotion}
                />
              ))}
            </AnimatePresence>
          </ul>
        </LayoutGroup>

        <p
          aria-live="polite"
          className="mt-8 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-text-muted"
        >
          {visible.length} {visible.length === 1 ? 'transmission' : 'transmissions'}
          {category !== 'ALL' ? ` in ${category.toLowerCase()}` : ''}
        </p>
      </div>

      <NewsModal item={openItem} onClose={onClose} reducedMotion={reducedMotion} />
    </section>
  );
}
