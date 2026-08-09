'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Scroll-triggered entrance.
 *
 * `once: true` matters: re-animating on every scroll-by turns the page into a
 * flicker gallery on the way back up. The margin fires the reveal slightly
 * before the element reaches the viewport so it is already settled by the time
 * it is actually readable.
 *
 * Reduced motion changes the DURATION ONLY, never `initial`/`whileInView`.
 * The server cannot know the viewer's motion preference, so branching the
 * rendered markup on it guarantees a hydration mismatch — the server emits
 * `opacity:0; translateY(18px)` and a reduce-motion client emits nothing.
 * Keeping the styles identical and collapsing the duration to zero gives the
 * same accessible result (content appears instantly) with matching HTML.
 */
export default function Reveal({ children, delay = 0, className = '', as = 'div' }) {
  const prefersReduced = useReducedMotion();
  const Component = motion[as] ?? motion.div;

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{
        duration: prefersReduced ? 0 : 0.55,
        delay: prefersReduced ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </Component>
  );
}
