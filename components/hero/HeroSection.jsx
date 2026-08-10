'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useSyncExternalStore } from 'react';
import Navbar from '@/components/hud/Navbar';
import OrientationGizmo from '@/components/hud/OrientationGizmo';
import ScrollCue from './ScrollCue';
import { owner } from '@/content/site';
import { opening, subscribeOpeningPhase } from '@/lib/opening';

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

  /*
    The nav, the name and the gizmo used to fade in on their own mount timer,
    completely deaf to the opening cinematic running in front of them — the
    black veil covered them for a moment, but the veil finishes fading before
    the bake even starts, so this HTML was visible while the scene behind it
    was still a bare wireframe. Gating on the opening phase instead ties the
    reveal to the moment the lens actually resolves.

    Server snapshot is 'singularity' (hidden), not 'calibrating': this
    component IS server-rendered (unlike the canvas, which is ssr:false), so
    picking a "revealed" snapshot here would ship a flash of visible HUD in
    the initial HTML, then hide it, then reveal it again once the client
    catches up.
  */
  const phase = useSyncExternalStore(
    subscribeOpeningPhase,
    () => opening.phase,
    () => 'singularity',
  );
  // Reduced motion skips the cinematic entirely (opening.phase jumps straight
  // to 'live'), so the header must not sit hidden waiting for a phase that
  // will not naturally occur in the usual order.
  const revealed = reducedMotion || phase === 'calibrating' || phase === 'live';

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
      <Navbar brand={brand} reducedMotion={reducedMotion} revealed={revealed} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute right-5 top-24 z-20 sm:right-8 sm:top-28"
      >
        <OrientationGizmo />
      </motion.div>

      <motion.div
        // Same rule as the navbar: identical styles server and client, only
        // the timing responds to the motion preference. The delay is gone —
        // `revealed` flipping true at the calibrating phase IS the delay now.
        initial={{ opacity: 0, y: 16 }}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{
          duration: reducedMotion ? 0 : 0.7,
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
