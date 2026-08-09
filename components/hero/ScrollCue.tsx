'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Scroll affordance.
 *
 * The hero is a full-viewport 3D scene with no visible content edge, so
 * nothing signals that the page continues. This is the only cue.
 *
 * The travelling line is a scaleY transform on a fixed-height rail, not an
 * animated height — height animates layout, transform animates on the
 * compositor, and this runs continuously while a scrubbed pin may be active.
 */
export default function ScrollCue({ label = 'Scroll' }: { label?: string }) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="pointer-events-none flex flex-col items-center gap-3">
      <span className="font-mono text-[0.58rem] uppercase tracking-[0.34em] text-text-muted">
        {label}
      </span>

      <span aria-hidden="true" className="relative block h-12 w-px overflow-hidden bg-hairline">
        <motion.span
          className="absolute inset-x-0 top-0 block h-1/2 origin-top bg-gradient-to-b from-accent-soft to-transparent"
          // Same rule as everywhere else in this project: identical styles on
          // server and client, only the timing responds to the preference.
          // Branching the markup on reduced motion is a hydration mismatch.
          initial={{ y: '-100%' }}
          animate={{ y: '200%' }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { duration: 1.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.35 }
          }
        />
      </span>
    </div>
  );
}
