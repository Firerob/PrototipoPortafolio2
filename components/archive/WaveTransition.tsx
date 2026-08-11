'use client';

import { useRef } from 'react';
import { archiveScroll, phaseOf, smootherstep, WAVE_RANGE } from '@/lib/archiveScroll';
import { VW, VH, waveDown } from '@/lib/wave';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

/**
 * Full-screen wave curtain that carries the dark → light theme change.
 *
 * Stacking, and it took two tries to get right:
 *
 *     -z-10  FluidBackground
 *     -z-5   this curtain      <- new background, seen THROUGH the canvas
 *      z-0   3D canvas (alpha) <- prism, orbit, archive corridor draw on top
 *      z-10  page content
 *
 * At z-30 the curtain painted over the heading and the project list, so the
 * section finished the transition showing a blank light screen. At z-5 it
 * would instead have hidden the canvas — and the archive's whole point is the
 * video corridor rendered inside that canvas. Sitting below the transparent
 * canvas is the only slot where it can act as the new background without
 * occluding either the 3D or the DOM.
 *
 * pointer-events-none throughout, so it never intercepts a click or a scroll
 * while the camera is flying.
 *
 * Driven by a rAF loop reading archiveScroll rather than by a GSAP tween on
 * this element. GSAP's ScrollTrigger owns the scrub and writes the progress
 * value; rebuilding the path here keeps the curve maths in one readable
 * function instead of spread across tween targets, and costs one string write
 * per frame.
 */
export default function WaveTransition() {
  const path = useRef<SVGPathElement>(null);
  const glow = useRef<SVGPathElement>(null);
  const host = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    let raf = 0;
    let lastT = -1;
    let lastAlpha = -1;

    const tick = () => {
      raf = requestAnimationFrame(tick);

      const t = smootherstep(phaseOf(archiveScroll.progress, WAVE_RANGE));

      /*
        The light room is not permanent.

        IndexArrival closes it again with the mirrored wave, and once that
        second front has covered the screen this layer is dead weight sitting
        behind every remaining section — still compositing a full-viewport
        gradient under `bg-void/95` on every frame. `exit` is written by that
        section and fades this one out while it is completely hidden, so the
        removal is free and invisible.
      */
      const alpha = t <= 0.0005 ? 0 : 1 - smootherstep(archiveScroll.exit);
      if (Math.abs(alpha - lastAlpha) >= 0.002) {
        lastAlpha = alpha;
        if (host.current) {
          host.current.style.opacity = alpha.toFixed(3);
          // Nothing to composite at all once it is gone.
          host.current.style.visibility = alpha < 0.002 ? 'hidden' : '';
        }
      }

      // Skip the string rebuild when nothing moved — most frames during a
      // pause are identical and setAttribute always invalidates.
      if (Math.abs(t - lastT) < 0.0005) return;
      lastT = t;

      const d = waveDown(t);
      path.current?.setAttribute('d', d);
      glow.current?.setAttribute('d', d);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-[5] opacity-0"
    >
      <svg
        className="size-full"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        focusable="false"
      >
        <defs>
          <linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef1fb" />
            <stop offset="70%" stopColor="#e4e8f6" />
            <stop offset="100%" stopColor="#dfe4f4" />
          </linearGradient>
        </defs>

        {/* Leading-edge glow, drawn first and blurred, so the crest reads as a
            lit liquid front rather than a hard cut. */}
        <path
          ref={glow}
          d={waveDown(0)}
          fill="none"
          stroke="#c9b79c"
          strokeWidth="0.5"
          style={{ filter: 'blur(1.4px)' }}
          opacity="0.9"
        />
        <path ref={path} d={waveDown(0)} fill="url(#wave-fill)" />
      </svg>
    </div>
  );
}
