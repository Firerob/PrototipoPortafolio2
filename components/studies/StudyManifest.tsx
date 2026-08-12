'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Study } from '@/types/study';
import { register, stamp } from '@/lib/studyFormat';

interface StudyManifestProps {
  items: Study[];
  activeId: string | null;
  /** Hover or keyboard focus — a cheap, reversible preview. */
  onFocusRow: (id: string | null) => void;
  /** Click or Enter/Space — opens the full record. */
  onOpen: (id: string) => void;
  reducedMotion: boolean;
}

/**
 * The register — a plain list of studies, no card underneath any of them.
 *
 * This is the entry point that used to be a grid of bordered modules. It is
 * text now: one row per study, a hairline between them, nothing boxed. The
 * visual the brief asks for lives on the canvas behind this list instead —
 * see StudiesCore — and this list is what selects what that object shows.
 *
 * Hover and focus both call `onFocusRow`, which is a live, reversible preview
 * (moving off a row reverts it — see the onMouseLeave on the <ul> in
 * StudiesSection). Only a click or Enter/Space calls `onOpen`, which is
 * committed and opens the full record. That split — cheap preview vs.
 * deliberate open — is the same one ProjectRow's hover panel and click target
 * already draw in the Deep Index; nothing new is being asked of the visitor.
 */
export default function StudyManifest({
  items,
  activeId,
  onFocusRow,
  onOpen,
  reducedMotion,
}: StudyManifestProps) {
  return (
    <ul
      className="border-t border-white/10"
      onMouseLeave={() => onFocusRow(null)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item, index) => {
          const active = item.id === activeId;

          return (
            <motion.li
              key={item.id}
              layout={reducedMotion ? false : 'position'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: reducedMotion ? 0 : 0.18 } }}
              transition={{
                duration: reducedMotion ? 0 : 0.36,
                delay: reducedMotion ? 0 : Math.min(index, 6) * 0.035,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative"
            >
              {/*
                A left rule in the study's own tint, only on the active row —
                the one piece of colour this list carries, and the same
                signal the telemetry panel and the research core pick up the
                instant this row gains focus.
              */}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-px transition-colors duration-300"
                style={{ backgroundColor: active ? item.tint[0] : 'transparent' }}
              />

              <button
                type="button"
                onMouseEnter={() => onFocusRow(item.id)}
                onFocus={() => onFocusRow(item.id)}
                onClick={() => onOpen(item.id)}
                aria-haspopup="dialog"
                aria-current={active ? 'true' : undefined}
                className="group flex w-full items-center gap-4 border-b border-white/10 py-4 pl-4 pr-1 text-left transition-colors duration-200 focus-visible:outline-offset-4 sm:py-5"
              >
                <span className="hidden shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-text-muted sm:block">
                  [ {register(item.id)} ]
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate font-sans text-[1.02rem] font-bold uppercase leading-[1.2] tracking-[-0.01em] transition-colors duration-200 sm:text-[1.12rem] ${
                      active ? 'text-text' : 'text-text-muted group-hover:text-text'
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="mt-1 block truncate font-mono text-[0.56rem] uppercase tracking-[0.18em] text-text-muted">
                    [ {item.category} ] <span className="text-text-muted/50">·</span>{' '}
                    {stamp(item.date)}
                  </span>
                </span>

                <ArrowUpRight
                  className={`size-4 shrink-0 transition-all duration-300 ${
                    active
                      ? 'translate-x-0.5 -translate-y-0.5 text-steel opacity-100'
                      : 'text-text-muted opacity-0 group-hover:opacity-100'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
