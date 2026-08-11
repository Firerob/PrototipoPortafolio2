'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { NewsItem } from '@/types/news';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

/** `2026-08-09` → `2026.08.09`, the dispatch-log format. */
function stamp(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00Z`)).replace(/-/g, '.');
}

interface NewsCardProps {
  item: NewsItem;
  index: number;
  onOpen: (id: string) => void;
  reducedMotion: boolean;
}

/** Corner tick, repeated at all four corners of the module. */
function Corner({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute font-mono text-[0.7rem] leading-none text-text-muted/50 transition-colors duration-300 group-hover:text-accent-soft ${className}`}
    >
      +
    </span>
  );
}

export default function NewsCard({ item, index, onOpen, reducedMotion }: NewsCardProps) {
  const [from, to] = item.tint;

  return (
    <motion.li
      /*
        `layout` is what makes the filter transition read as modules moving to
        new slots rather than the list re-rendering. layoutId is the item id,
        so an entry that survives a filter change animates from its old
        position instead of fading out and back in somewhere else.
      */
      layout={reducedMotion ? false : 'position'}
      layoutId={reducedMotion ? undefined : `news-${item.id}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: reducedMotion ? 0 : 0.2 } }}
      transition={{
        duration: reducedMotion ? 0 : 0.42,
        delay: reducedMotion ? 0 : Math.min(index, 5) * 0.045,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative"
    >
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-haspopup="dialog"
        /*
          A real <button>, not a div with onClick: this opens a dialog rather
          than navigating, so it must be reachable by tab, activate on Enter
          and Space, and announce itself as a control.
        */
        className="
          relative flex h-full w-full flex-col items-start gap-4 overflow-hidden
          border border-white/10 bg-white/[0.035] p-5 text-left backdrop-blur-md
          transition-[border-color,box-shadow,transform] duration-300 ease-out
          hover:border-purple-500/50
          hover:shadow-[0_0_0_1px_rgba(168,85,247,0.18),0_18px_50px_-28px_rgba(109,75,255,0.9)]
          focus-visible:border-purple-500/50
          sm:p-6
        "
        style={
          reducedMotion
            ? undefined
            : {
                // Declared inline so the hover variant below can override only
                // translateZ without Tailwind needing a 3D utility per state.
                transform: 'perspective(1000px) translateZ(0px)',
              }
        }
        onPointerEnter={(event) => {
          if (reducedMotion) return;
          event.currentTarget.style.transform = 'perspective(1000px) translateZ(10px)';
        }}
        onPointerLeave={(event) => {
          if (reducedMotion) return;
          event.currentTarget.style.transform = 'perspective(1000px) translateZ(0px)';
        }}
      >
        <Corner className="left-1.5 top-1" />
        <Corner className="right-1.5 top-1" />
        <Corner className="bottom-1 left-1.5" />
        <Corner className="bottom-1 right-1.5" />

        {/*
          Scanlines. A repeating-linear-gradient rather than an animated
          overlay: it costs one paint, and animating a full-card overlay on
          hover is exactly the kind of thing that makes a grid of twelve cards
          stutter.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, rgba(139,123,255,0.16) 0px, rgba(139,123,255,0.16) 1px, transparent 1px, transparent 4px)',
          }}
        />

        {/* Header: timestamp + system log id */}
        <span className="relative flex w-full items-center justify-between gap-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-text-muted">
          <span>
            [ {stamp(item.date)} <span className="text-text-muted/50">//</span>{' '}
            SYS.{item.id.replace('-', '_').toUpperCase()} ]
          </span>
          <ArrowUpRight
            className="size-3.5 shrink-0 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-hover:text-steel"
            aria-hidden="true"
          />
        </span>

        <span className="relative inline-flex items-center border border-accent-soft/35 px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-accent-soft">
          [ {item.category} ]
        </span>

        <span className="relative block font-sans text-[1.05rem] font-bold uppercase leading-[1.18] tracking-[-0.01em] text-text">
          {item.title}
        </span>

        <span className="relative block text-sm leading-relaxed text-text-muted">
          {item.excerpt}
        </span>

        {/* Preview strip. Placeholder gradient until real media exists; the
            blueprint dots keep it in the same language as the 3D sections. */}
        <span
          aria-hidden="true"
          className="relative block h-16 w-full overflow-hidden border border-white/10"
        >
          <span
            className="block size-full transition-transform duration-700 ease-out group-hover:scale-105"
            style={{ background: `linear-gradient(122deg, ${from} 0%, ${to} 85%)` }}
          />
          <span
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, rgba(255,255,255,0.5) 0.7px, transparent 1.2px)',
              backgroundSize: '18px 18px',
            }}
          />
        </span>

        {/* Footer: guide line + status */}
        <span className="relative mt-auto flex w-full items-center gap-3 pt-1">
          <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-text-muted">
            status:{' '}
            <span className="text-steel">{item.status ?? 'PUBLISHED'}</span>
          </span>
        </span>
      </button>
    </motion.li>
  );
}
