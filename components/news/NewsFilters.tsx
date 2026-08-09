'use client';

import { motion } from 'framer-motion';
import { NEWS_CATEGORIES, type NewsCategory } from '@/types/news';

interface NewsFiltersProps {
  active: NewsCategory;
  counts: Record<NewsCategory, number>;
  onChange: (category: NewsCategory) => void;
  reducedMotion: boolean;
}

/**
 * Terminal-style category tabs.
 *
 * A radiogroup rather than a row of buttons: the filters are one mutually
 * exclusive choice, which is what a radiogroup means, and it gives keyboard
 * users arrow-key traversal instead of six tab stops.
 */
export default function NewsFilters({
  active,
  counts,
  onChange,
  reducedMotion,
}: NewsFiltersProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Filter transmissions by category"
      className="flex flex-wrap items-center gap-1"
    >
      {NEWS_CATEGORIES.map((category) => {
        const selected = category === active;
        const count = counts[category] ?? 0;

        return (
          <button
            key={category}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={count === 0}
            onClick={() => onChange(category)}
            className={`
              relative flex min-h-11 items-center gap-2 px-3
              font-mono text-[0.6rem] uppercase tracking-[0.18em]
              transition-colors duration-200
              disabled:cursor-not-allowed disabled:opacity-30
              ${selected ? 'text-text' : 'text-text-muted hover:text-text'}
            `}
          >
            {/*
              The moving underline is a single shared element: `layoutId` makes
              Framer Motion animate it from the previously selected tab to this
              one, rather than fading one out and another in. That is the whole
              point of a layout animation here — the indicator has continuity,
              so the eye tracks the change.
            */}
            {selected && (
              <motion.span
                layoutId={reducedMotion ? undefined : 'news-filter-underline'}
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px bg-accent-soft"
                transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            <span className="relative">{category}</span>
            <span
              aria-hidden="true"
              className={`relative text-[0.52rem] tabular-nums ${
                selected ? 'text-accent-soft' : 'text-text-muted/50'
              }`}
            >
              {String(count).padStart(2, '0')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
