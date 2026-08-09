'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Navbar from '@/components/hud/Navbar';
import OrientationGizmo from '@/components/hud/OrientationGizmo';
import ScrollCue from './ScrollCue';
import { owner } from '@/content/site';

/*
  The hero owns no canvas any more.

  The 3D scene was lifted out into <Backdrop>, a fixed click-through layer
  behind the entire page. This section is now pure DOM over it: fully
  transparent, so the prism reads through the headline, and free of the
  `overflow-hidden` + `isolate` pair that would have clipped a fixed child.
*/
export default function HeroSection({ word = owner.heroWord, brand = owner.mark, font }) {
  const prefersReduced = useReducedMotion();
  const reducedMotion = prefersReduced === true;

  return (
    <section
      id="top"
      className="relative h-[100svh] min-h-[560px] w-full bg-transparent"
    >
      {/* Vignette. Pure CSS: darkens the corners so the HUD text keeps its
          contrast ratio wherever the grid glow happens to fall. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(5,5,8,0.82)_100%)]"
      />

      {/* HUD */}
      <Navbar brand={brand} reducedMotion={reducedMotion} />

      <div className="pointer-events-none absolute right-5 top-24 z-20 sm:right-8 sm:top-28">
        <OrientationGizmo />
      </div>

      <motion.div
        // Same rule as the navbar: identical styles server and client, only
        // the timing responds to the motion preference.
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reducedMotion ? 0 : 0.7,
          delay: reducedMotion ? 0 : 0.35,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 pb-8 sm:px-8 sm:pb-10"
      >
        {/*
          Stripped back to keep the centre of the canvas clear.

          The descriptive paragraph and the Renderer/Status readout were cut.
          The h1 stays: "show only the nav and a scroll cue" cannot extend to
          deleting the document's only heading — that would leave the page
          nameless to search engines and to anyone navigating by headings. It
          is small and pinned to the bottom corner, well clear of the prism.
        */}
        <div className="mx-auto flex max-w-[1600px] items-end justify-between gap-6">
          <div>
            <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.3em] text-text-muted">
              Portfolio — {owner.role}
            </p>
            <h1 className="font-sans text-[clamp(1.4rem,3vw,2.1rem)] font-bold leading-none tracking-[-0.02em] text-text">
              {owner.name}
            </h1>
          </div>

          <div className="hidden sm:block">
            <ScrollCue />
          </div>
        </div>

        {/* On narrow screens the cue gets its own centred row rather than
            competing with the name for the same baseline. */}
        <div className="mt-8 flex justify-center sm:hidden">
          <ScrollCue />
        </div>
      </motion.div>
    </section>
  );
}
