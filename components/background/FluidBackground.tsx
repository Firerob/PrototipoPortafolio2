'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { createFluidSimulation, type FluidHandle } from '@/lib/fluid/webglFluid';
import { HUE_ACCENT, HUE_STEEL, fluidBackgroundConfig } from '@/lib/fluid/fluidConfig';

interface FluidBackgroundProps {
  /** 0..1. The dye is already dark by construction, so this is fine-tuning. */
  opacity?: number;
}

/**
 * Page-wide fluid simulation, fixed behind every section.
 *
 * Adapted from tkabalin/WebGL-Fluid-Background (MIT, Pavel Dobryakov 2017 /
 * Thomas Kabalin 2025). See lib/fluid/LICENSE and the adaptation note at the
 * top of lib/fluid/webglFluid.js.
 *
 * This is the second WebGL context on the page; the R3F stage is the other,
 * so it is deliberately the cheapest of the three: half the upstream dye
 * resolution, no bloom, no sunrays, and paused whenever the tab is hidden.
 */
/*
  Default lowered to 0.10 on photographic evidence.

  An A/B capture with this layer hidden showed the showcase is dramatically
  better without it: the hero depends on true black to read, and the fluid was
  lifting it to grey even at 0.28 with screen blending. 0.10 keeps a hint of
  drifting colour without touching the black point. Set 0 to disable entirely.
*/
export default function FluidBackground({ opacity = 0.1 }: FluidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    // A perpetually churning full-screen animation is precisely what a
    // reduced-motion request is asking not to see. Skip the simulation
    // entirely — the static gradient underneath stands in for it.
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // The config object is read live by the simulation each frame, so this
    // copy is what the hue sweep mutates.
    const config = { ...fluidBackgroundConfig };

    let handle: FluidHandle;
    try {
      handle = createFluidSimulation(canvas, config);
    } catch (error) {
      // No WebGL, or the context limit was hit. The page must not break over
      // a decorative background.
      console.warn('[FluidBackground] simulation unavailable:', error);
      return;
    }

    /*
      Hue sweep between the two brand accents.

      The simulation exposes a single hue, so left alone the whole page would
      settle into one flat colour. A slow triangle wave between violet and
      cyan keeps it alive without ever leaving the palette. 250ms is plenty —
      this drifts over roughly a minute, so per-frame updates would be waste.
    */
    const started = Date.now();
    const hueTimer = window.setInterval(() => {
      const phase = (Date.now() - started) / 42000;
      const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
      config.SPLAT_HUE = HUE_STEEL + (HUE_ACCENT - HUE_STEEL) * wave;
    }, 250);

    // Hidden tab: stop simulating. Browsers throttle rAF but the fluid would
    // otherwise still burn GPU on a page nobody is looking at.
    const onVisibility = () => handle.setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(hueTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      handle.destroy();
    };
  }, [prefersReduced]);

  return (
    <div
      aria-hidden="true"
      // z-index -1 keeps it above the root background colour but behind all
      // in-flow content. pointer-events:none is essential — the simulation
      // tracks the window, not the canvas, so it needs no hit area and must
      // never intercept a click meant for the page.
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Static stand-in: visible on its own under reduced motion or when
          WebGL is unavailable, and underneath the fluid otherwise. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(109,75,255,0.16),transparent_62%)]" />

      {/*
        The canvas is ALWAYS rendered with ALWAYS the same attributes, even
        under reduced motion.

        Branching either the element or its style on the motion preference is a
        hydration failure: the server cannot know that preference, so it emits
        one thing and a reduce-motion client emits another. Nothing is lost by
        rendering it unconditionally — the effect above returns early and never
        starts the simulation, and a canvas that is never painted is fully
        transparent regardless of its opacity.
      */}
      {/*
        `screen` blending, added after seeing the page render.

        With normal compositing the dye's own dark-grey substrate sat on top of
        the black page and lifted it to light grey. Under `screen`, black
        contributes nothing — only the lit parts of the fluid add glow, so the
        background stays as deep as the design intends.
      */}
      <canvas
        ref={canvasRef}
        className="size-full"
        style={{ opacity, mixBlendMode: 'screen' }}
      />
    </div>
  );
}
