'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { smoothing } from '@/lib/sceneScroll';

/** Vertical travel at either extreme of the viewport, in px. */
const MAX_SHIFT = 46;
/** How much the cursor's distance from centre can additionally brighten a
 *  light, on top of its own breathing cycle. 0.18 → up to +18%. */
const MAX_INTENSITY = 0.18;

/*
  Damping factors — see lib/sceneScroll.ts's `smoothing` for the formula.
  Smaller is FASTER: it is the fraction of the gap still remaining after one
  full second of easing, so 0.035 closes 96.5% of the distance in a second
  and 0.2 closes only 80%. The right light uses the heavier of the two on
  purpose — a visible half-beat behind the left one is what reads as damping
  rather than as two lights on the same string.
*/
const LEFT_LAMBDA = 0.035;
const RIGHT_LAMBDA = 0.2;

/**
 * "Lateral Cyberpunk Atmospheric Glow" for Contact.
 *
 * Two huge blurred colour fields bleeding in from the section's left and
 * right edges — violet/magenta on the left, cyan/blue on the right. Purely
 * decorative: aria-hidden, pointer-events-none, and painted at the same
 * -z-10 layer ContactSection's own centred accent wash already uses, so it
 * never competes with SceneScrim's contrast guarantee for the text above it.
 *
 * ── Why each glow is two nested elements, not one ───────────────────────────
 *
 * The brief asks for both a CSS breathing pulse (scale + opacity, on a fixed
 * loop) AND a JS-driven cursor parallax (position + intensity, off a damped
 * pointer read). Both would like to touch `transform`, and on ONE element
 * that is a real conflict: a running CSS `@keyframes` animation outranks an
 * inline `style.transform` written by JS in the cascade, so the animation
 * would silently win every frame and the parallax would appear to do
 * nothing.
 *
 * Splitting it in two removes the conflict instead of fighting it. The OUTER
 * node is what this component's ref points at — JS writes `translate3d` and
 * a plain (non-animated) `opacity` to it, both cheap, uncontested properties.
 * The INNER node carries the blurred, coloured circle and the CSS keyframe,
 * fully self-contained. Because CSS opacity compounds through nested
 * elements, the outer's cursor-driven opacity and the inner's animated
 * opacity multiply together on screen — which is the "intensity modulation"
 * the brief asks for, produced by composition rather than by two animations
 * arguing over one property.
 *
 * ── Why absolute, not fixed ──────────────────────────────────────────────
 *
 * The brief describes `position: fixed`, but this glow belongs to Contact
 * specifically — pinned to the viewport it would still be sitting there,
 * lit, over the footer once the visitor scrolled past. `absolute` inside
 * ContactSection's own `relative overflow-hidden` root keeps it exactly
 * where it reads as "this section's atmosphere" and gives the section's
 * existing `overflow-hidden` the job of clipping the bleed instead of
 * leaving two more elements able to push the page wider than the viewport —
 * the exact class of bug already found and fixed twice elsewhere on this
 * page (the CSS Grid blowout, the archive plane crop).
 */
export default function ContactAmbientGlow() {
  const prefersReduced = useReducedMotion();
  const reducedMotion = prefersReduced === true;

  const leftWrap = useRef<HTMLDivElement>(null);
  const rightWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reduced motion turns this off at the source rather than damping toward
    // a target that itself keeps moving — the CSS pulse already stills via
    // the blanket reset in globals.css, so nothing is left half-animated.
    if (reducedMotion) return;

    /*
      Hover-capable, fine pointer only — the same gate ProfileCard3D and
      ProjectsIndex already use, and the same reasoning PointerProvider's own
      touch check states directly: a finger dragging the page IS the scroll
      gesture, not "look over there". Skipping the whole effect on touch
      devices means the glows simply hold their CSS-only breathing pulse,
      which is a complete, intentional resting state on its own.
    */
    const canDamp = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canDamp) return;

    let pointerY = 0; // -1..1, last real pointer read
    let leftY = 0;
    let rightY = 0;
    let lastFrame = performance.now();
    let raf = 0;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => {
      pointerY = 0;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });

    const loop = () => {
      raf = requestAnimationFrame(loop);

      const now = performance.now();
      const dt = Math.min((now - lastFrame) / 1000, 1 / 30);
      lastFrame = now;

      leftY += (pointerY - leftY) * smoothing(LEFT_LAMBDA, dt);
      rightY += (pointerY - rightY) * smoothing(RIGHT_LAMBDA, dt);

      const left = leftWrap.current;
      if (left) {
        left.style.transform = `translate3d(0, ${(leftY * MAX_SHIFT).toFixed(1)}px, 0)`;
        left.style.opacity = (1 + Math.abs(leftY) * MAX_INTENSITY).toFixed(3);
      }

      const right = rightWrap.current;
      if (right) {
        right.style.transform = `translate3d(0, ${(rightY * MAX_SHIFT).toFixed(1)}px, 0)`;
        right.style.opacity = (1 + Math.abs(rightY) * MAX_INTENSITY).toFixed(3);
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [reducedMotion]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* ── Left: violet / magenta ─────────────────────────────────────── */}
      <div
        ref={leftWrap}
        className="absolute left-[-260px] top-[8%] size-[640px]"
        style={{ willChange: 'transform, opacity' }}
      >
        <div
          className="contact-glow-left size-full rounded-full blur-[130px]"
          style={{
            background: 'radial-gradient(circle, #8b5cf6 0%, #d946ef 55%, transparent 78%)',
            willChange: 'transform, opacity',
          }}
        />
      </div>

      {/* ── Right: cyan / blue ─────────────────────────────────────────── */}
      <div
        ref={rightWrap}
        className="absolute right-[-260px] top-[32%] size-[640px]"
        style={{ willChange: 'transform, opacity' }}
      >
        <div
          className="contact-glow-right size-full rounded-full blur-[130px]"
          style={{
            background: 'radial-gradient(circle, #06b6d4 0%, #3b82f6 55%, transparent 78%)',
            willChange: 'transform, opacity',
          }}
        />
      </div>
    </div>
  );
}
