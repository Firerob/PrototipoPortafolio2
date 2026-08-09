'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>[]{}=+*#%$';

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** Milliseconds before the scramble starts once the element is in view. */
  delay?: number;
  /** Frames each character spends scrambling before it locks in. */
  speed?: number;
  as?: 'span' | 'h2' | 'h3' | 'p';
}

/**
 * Decode-on-reveal text.
 *
 * Characters resolve left to right, each one cycling through random glyphs
 * before locking. Whitespace is never scrambled — scrambling it destroys the
 * word shape and the line reads as noise rather than as text being decoded.
 *
 * The final string is rendered on the server and on the first client paint;
 * the scramble only starts once the element is in view. That keeps the real
 * text in the DOM for search engines and for anyone whose JS never runs, and
 * avoids a hydration mismatch from randomised initial content.
 */
export default function ScrambleText({
  text,
  className = '',
  delay = 0,
  speed = 2,
  as: Tag = 'span',
}: ScrambleTextProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const prefersReduced = useReducedMotion();

  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!inView || prefersReduced) return;

    let raf = 0;
    let frame = 0;
    let timer = 0;

    const run = () => {
      const total = text.length;

      const tick = () => {
        // How many characters have locked, as a fraction of elapsed frames.
        const settled = frame / speed;

        const next = text
          .split('')
          .map((char, i) => {
            if (i < settled) return char;
            // Preserve spacing so the line keeps its shape while decoding.
            if (char === ' ') return ' ';
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join('');

        setDisplay(next);
        frame += 1;

        if (settled < total) {
          raf = requestAnimationFrame(tick);
        } else {
          setDisplay(text);
        }
      };

      // Start from fully scrambled rather than from the real text, so the
      // first frame does not flash the answer.
      frame = 0;
      raf = requestAnimationFrame(tick);
    };

    timer = window.setTimeout(run, delay);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [inView, prefersReduced, text, delay, speed]);

  return (
    <Tag
      ref={ref as never}
      className={className}
      /*
        The scrambled glyphs are decoration. Announcing them would read the
        line out as gibberish, and re-announce it on every frame — so the
        visible text is hidden from assistive tech and the real string is
        exposed once, statically, beside it.
      */
      aria-label={text}
    >
      <span aria-hidden="true">{display}</span>
    </Tag>
  );
}
