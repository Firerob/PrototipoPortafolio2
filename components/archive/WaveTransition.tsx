'use client';

import { useRef } from 'react';
import { archiveScroll, phaseOf, smootherstep, WAVE_RANGE } from '@/lib/archiveScroll';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

/*
  Viewport-space units for the SVG. preserveAspectRatio="none" lets it stretch
  to any window shape, so the wave always spans the full width and the numbers
  below stay resolution-independent.
*/
const VW = 100;
const VH = 100;

/** How deep the crest dips, in viewBox units. */
const AMPLITUDE = 9;

/**
 * Builds the curtain path for a given sweep position.
 *
 * The path is a filled region from the top of the screen down to a wavy
 * leading edge. Two cubic segments make an S-curve that reads as liquid; a
 * single quadratic looks like a bulge, and a polygon clip-path (which the
 * brief suggested) can only produce straight chords between its points, so it
 * cannot make a smooth crest at all without dozens of vertices.
 *
 * `t` runs 0 (fully above the screen) → 1 (fully covering it).
 */
function wavePath(t: number): string {
  // Travel a little past the ends so the crest is fully off-screen at t=0 and
  // the trailing flat edge is off-screen at t=1.
  const y = -AMPLITUDE * 2 + t * (VH + AMPLITUDE * 4);

  // The crest flattens as the curtain settles — a wave that stays equally wavy
  // at rest looks like a decoration rather than a moving liquid front.
  const amp = AMPLITUDE * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));

  return [
    `M 0 ${(-VH).toFixed(2)}`,
    `L ${VW} ${(-VH).toFixed(2)}`,
    `L ${VW} ${y.toFixed(3)}`,
    `C ${(VW * 0.72).toFixed(2)} ${(y + amp).toFixed(3)}`,
    `  ${(VW * 0.60).toFixed(2)} ${(y - amp).toFixed(3)}`,
    `  ${(VW * 0.44).toFixed(2)} ${(y + amp * 0.35).toFixed(3)}`,
    `C ${(VW * 0.28).toFixed(2)} ${(y + amp * 1.15).toFixed(3)}`,
    `  ${(VW * 0.14).toFixed(2)} ${(y - amp * 0.85).toFixed(3)}`,
    `  0 ${(y + amp * 0.25).toFixed(3)}`,
    'Z',
  ].join(' ');
}

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

    const tick = () => {
      raf = requestAnimationFrame(tick);

      const t = smootherstep(phaseOf(archiveScroll.progress, WAVE_RANGE));
      // Skip the string rebuild when nothing moved — most frames during a
      // pause are identical and setAttribute always invalidates.
      if (Math.abs(t - lastT) < 0.0005) return;
      lastT = t;

      const d = wavePath(t);
      path.current?.setAttribute('d', d);
      glow.current?.setAttribute('d', d);

      // Hidden entirely at rest so it never composites over the hero.
      if (host.current) host.current.style.opacity = t <= 0.0005 ? '0' : '1';
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
          d={wavePath(0)}
          fill="none"
          stroke="#6d4bff"
          strokeWidth="0.5"
          style={{ filter: 'blur(1.4px)' }}
          opacity="0.9"
        />
        <path ref={path} d={wavePath(0)} fill="url(#wave-fill)" />
      </svg>
    </div>
  );
}
