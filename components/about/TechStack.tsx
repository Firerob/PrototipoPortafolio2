'use client';

import { motion, useReducedMotion } from 'framer-motion';

export interface TechItem {
  name: string;
  /** Shown in the pill's trailing slot — a specialism, not a rating. */
  level: string;
}

interface TechStackProps {
  items: TechItem[];
  label: string;
}

/**
 * Tech pills with a neon hover.
 *
 * The trailing slot carries a specialism word ("core", "daily", "shaders")
 * rather than a percentage or a bar. A self-assigned "95%" on a portfolio is
 * unfalsifiable and reads as filler; naming what the tool is actually used
 * for says something.
 */
export default function TechStack({ items, label }: TechStackProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div>
      <h3 className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-text-muted">
        {label}
      </h3>

      <ul className="mt-4 flex flex-wrap gap-2">
        {items.map((item, i) => (
          <motion.li
            key={item.name}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{
              duration: prefersReduced ? 0 : 0.38,
              delay: prefersReduced ? 0 : Math.min(i, 8) * 0.04,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <span
              className="
                group inline-flex cursor-default items-center gap-2
                border border-white/10 bg-white/[0.03] px-3 py-2
                font-mono text-[0.6rem] uppercase tracking-[0.16em] text-text-muted
                backdrop-blur-xl transition-all duration-300
                hover:border-purple-500/50 hover:text-text
                hover:shadow-[0_0_0_1px_rgba(168,85,247,0.2),0_0_22px_-6px_rgba(109,75,255,0.9)]
              "
            >
              <span aria-hidden="true" className="text-accent-soft/60 transition-colors duration-300 group-hover:text-steel">
                [
              </span>
              {item.name}
              <span aria-hidden="true" className="text-accent-soft/60 transition-colors duration-300 group-hover:text-steel">
                ]
              </span>
              <span className="text-[0.52rem] text-text-muted/50 transition-colors duration-300 group-hover:text-accent-soft">
                {item.level}
              </span>
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
