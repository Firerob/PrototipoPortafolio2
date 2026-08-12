'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Study } from '@/types/study';
import { register, stamp } from '@/lib/studyFormat';

interface StudyTelemetryProps {
  item: Study | null;
  onOpenFull: () => void;
  reducedMotion: boolean;
}

/** Display ceilings for the meters below — see the field docs on StudyParams
 *  in types/study.ts, which this mirrors: distortion is authored 0..1, facet
 *  roughly 2..14, and speed has no documented ceiling but never exceeds 2
 *  across the current content. */
const METER_MAX = { distortion: 1, speed: 2, facet: 14 } as const;

function Meter({ label, value, max, tint }: { label: string; value: number; max: number; tint: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-text-muted">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"
      >
        <span
          className="block h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: tint }}
        />
      </span>
      <span className="w-8 shrink-0 text-right font-mono text-[0.55rem] tabular-nums text-steel">
        {value.toFixed(max <= 1 ? 2 : max >= 10 ? 0 : 1)}
      </span>
    </div>
  );
}

/**
 * The floating readout beside the manifest — what used to be a card's body
 * copy, now telemetry for whichever study the manifest currently has in
 * focus. No border box around the whole thing: a single top hairline (the
 * same rule every other section on this page uses to open a sub-block) is
 * the only frame it gets, so the text reads as data laid over the research
 * core's canvas rather than as a panel sitting on top of it.
 *
 * Keyed AnimatePresence rather than a plain conditional: switching studies
 * should read as one instrument reading being replaced by the next, not as
 * the whole panel blinking. `mode="wait"` holds that guarantee — the outgoing
 * reading is gone before the incoming one appears, so they can never overlap
 * and double up on screen.
 */
export default function StudyTelemetry({ item, onOpenFull, reducedMotion }: StudyTelemetryProps) {
  return (
    <div className="border-t border-white/10 pt-6 lg:sticky lg:top-28">
      <AnimatePresence mode="wait">
        {item && (
          <motion.div
            key={item.id}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-text-muted">
              [ {stamp(item.date)} <span className="text-text-muted/50">//</span> {register(item.id)} ]
            </span>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center border px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.2em]"
                style={{ borderColor: `${item.tint[0]}59`, color: item.tint[0] }}
              >
                [ {item.category} ]
              </span>
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-text-muted">
                status: <span className="text-steel">{item.status ?? 'PUBLISHED'}</span>
              </span>
            </div>

            <h3 className="mt-5 font-sans text-[clamp(1.35rem,2.6vw,1.9rem)] font-bold uppercase leading-[1.12] tracking-[-0.02em] text-text">
              {item.title}
            </h3>

            <p className="mt-4 max-w-[54ch] text-[0.95rem] leading-[1.75] text-text-muted">
              {item.excerpt}
            </p>

            {/* Live instrument reading — the numbers the research core on
                the canvas is currently performing for this study. */}
            <div className="mt-7 space-y-3">
              <Meter label="distortion" value={item.params.distortion} max={METER_MAX.distortion} tint={item.tint[0]} />
              <Meter label="speed" value={item.params.speed} max={METER_MAX.speed} tint={item.tint[0]} />
              <Meter label="facet" value={item.params.facet} max={METER_MAX.facet} tint={item.tint[0]} />
            </div>

            <ul className="mt-6 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <li
                  key={tag}
                  className="border border-white/10 bg-surface/50 px-2.5 py-1 font-mono text-[0.55rem] lowercase tracking-[0.12em] text-accent-soft"
                >
                  <span aria-hidden="true" className="text-text-muted">&gt; </span>
                  {tag}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onOpenFull}
              className="group mt-8 inline-flex items-center gap-3 border border-white/10 px-5 py-3 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-text transition-colors duration-200 hover:border-steel/40"
            >
              Open full record
              <ArrowUpRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
