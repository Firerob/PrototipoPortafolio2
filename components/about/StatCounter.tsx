'use client';

import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

export interface Stat {
  label: string;
  value: number;
  /** Rendered after the number, e.g. '+' or '%'. */
  suffix?: string;
}

interface StatCounterProps {
  stat: Stat;
  index: number;
}

/**
 * Count-up metric.
 *
 * The digits are written straight to `textContent` from framer-motion's
 * `animate` onUpdate rather than held in state: a 1.6s count through state
 * would be ~96 re-renders of the stats row for a number that changes nothing
 * else on the page.
 */
export default function StatCounter({ stat, index }: StatCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const node = out.current;
    if (!node) return;

    if (prefersReduced) {
      node.textContent = String(stat.value);
      return;
    }

    if (!inView) return;

    const controls = animate(0, stat.value, {
      duration: 1.6,
      delay: index * 0.12,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = String(Math.round(v));
      },
    });

    return () => controls.stop();
  }, [inView, prefersReduced, stat.value, index]);

  return (
    <div ref={ref} className="border-t border-white/10 pt-4">
      <dt className="font-mono text-[0.56rem] uppercase tracking-[0.22em] text-text-muted">
        {stat.label}
      </dt>
      <dd className="mt-2 flex items-baseline gap-0.5 font-sans text-[clamp(1.8rem,4vw,2.9rem)] font-bold leading-none tracking-[-0.03em] text-text">
        {/*
          The live number is aria-hidden and the real value sits in a visually
          hidden span, so a screen reader announces "8 years of experience"
          once instead of counting 0,1,2,3… as the animation runs.
        */}
        <span ref={out} aria-hidden="true" className="tabular-nums">
          {prefersReduced ? stat.value : 0}
        </span>
        {stat.suffix && (
          <span aria-hidden="true" className="text-accent-soft">
            {stat.suffix}
          </span>
        )}
        <span className="sr-only">
          {stat.value}
          {stat.suffix}
        </span>
      </dd>
    </div>
  );
}
