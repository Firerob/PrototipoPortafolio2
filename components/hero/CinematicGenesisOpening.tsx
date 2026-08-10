'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useLenis } from 'lenis/react';
import { useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import {
  forceOpeningComplete,
  opening,
  setOpeningPhase,
  type OpeningPhase,
} from '@/lib/opening';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

if (typeof window !== 'undefined') gsap.registerPlugin(CustomEase);

/*
  The focus snap.

  A lens does not ease symmetrically: it releases, travels fast, and arrives
  with a little settling. This curve is nearly vertical through the first third
  then decelerates hard, which is what separates "a lens found focus" from "an
  opacity faded in". `expo.out` was the first attempt and it arrives too
  politely — there is no snap in it.
*/
const IGNITE_EASE = 'M0,0 C0.14,0.62 0.2,0.92 0.36,0.98 0.52,1.02 0.72,1 1,1';

/*
  ── Budget ──────────────────────────────────────────────────────────────────

    singularity  0.90s   spark tracking the cursor on black
    ignition     1.05s   shockwave; wireframe revealed radially
    bake         0.80s   override drops, materials appear under the bokeh slam
    calibrating  1.15s   the lens resolves, HUD opens to the corners
                 ─────
                 3.90s   plus however long assets take, absorbed in phase 0

  Roughly four seconds, and that number was chosen against a constraint rather
  than picked. The previous version of this opening also held a four-second
  "click to ignite" wait; a four-phase cinematic that plays itself does not get
  to keep that on top. Nobody should wait eight seconds to reach a portfolio.
*/
const T_SINGULARITY = 0.9;
const T_IGNITION = 1.05;
const T_BAKE = 0.8;
const T_CALIBRATE = 1.15;

/** Hard ceiling on phase 0. A stalled asset must not hold a black screen. */
const MAX_HOLD_MS = 2600;

/** Corner reticle. Four of these, mirrored by rotation. */
function Reticle({ className }: { className: string }) {
  return (
    <span
      data-reticle
      aria-hidden="true"
      className={`pointer-events-none absolute size-10 ${className}`}
    >
      <span className="absolute left-0 top-0 h-px w-6 bg-accent-soft/70" />
      <span className="absolute left-0 top-0 h-6 w-px bg-accent-soft/70" />
    </span>
  );
}

/**
 * "Singularity → Wireframe Ignition → Material Bake → Optic Calibration".
 *
 * One gsap.timeline drives every phase. The timeline tweens a plain object in
 * lib/opening.ts, and the WebGL side reads that object inside useFrame:
 * GenesisWireframe for the shockwave and the override material,
 * CalibrationEffects for the bokeh and the fringing. Nothing crosses the
 * boundary as a prop, because the canvas sits behind a `dynamic(ssr:false)`
 * wrapper and these values change at frame rate.
 *
 * No counter anywhere. `useProgress` decides only WHEN phase 0 is allowed to
 * end; the number is never rendered.
 *
 * ── The spark is a DOM element, not a mesh ──────────────────────────────────
 *
 * The brief puts it in the canvas, and it cannot go there: phase 0 and 1 run
 * with `scene.overrideMaterial` set, which would force the spark through the
 * wireframe shader along with everything else. A point of light is a radial
 * gradient either way, so it is a div — and it writes its position into the
 * store so the shockwave genuinely detonates from wherever the spark had
 * drifted to, rather than from an assumed centre.
 */
export default function CinematicGenesisOpening() {
  const host = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const spark = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const prefersReduced = useReducedMotion();

  const { active, progress } = useProgress();
  const [phase, setPhase] = useState<OpeningPhase>('singularity');
  const started = useRef(false);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  /*
    Reduced motion skips the whole cinematic — not "plays it faster".

    A black screen that detonates into a shockwave and then resolves out of a
    screen-filling blur is precisely the motion this preference exists to opt
    out of, and there is no gentle version of it. The site simply starts.
  */
  const reduced = prefersReduced === true;

  /** Jump straight to the end. Used by the skip control and every failsafe. */
  const skip = useCallback(() => {
    timeline.current?.progress(1).kill();
    timeline.current = null;
    forceOpeningComplete();
    setPhase('live');
  }, []);

  const run = useCallback(() => {
    if (started.current) return;
    started.current = true;

    const el = host.current;
    const tl = gsap.timeline({
      onComplete: () => {
        setOpeningPhase('live');
        setPhase('live');
      },
    });
    timeline.current = tl;

    /* ── Phase 0 → 1 · the detonation ──────────────────────────────────── */
    tl.call(() => {
      setOpeningPhase('ignition');
      setPhase('ignition');
    });
    // The spark collapses to a hot point just before it goes — the wind-up is
    // what makes the expansion read as a release rather than as a fade.
    tl.to(opening, { spark: 1.6, duration: 0.16, ease: 'power2.in' }, 0);
    tl.to(opening, { spark: 0, duration: 0.5, ease: 'power2.out' }, 0.16);
    // The front. power2.out because a shockwave decelerates; linear expansion
    // reads as a circle being scaled, which is exactly what it must not be.
    tl.to(opening, { wave: 1, duration: T_IGNITION, ease: 'power2.out' }, 0.1);
    // The black veil lifts with the front, so the wave is what uncovers the
    // screen rather than something that happens on an already-visible one.
    if (veil.current) {
      tl.to(veil.current, { opacity: 0, duration: T_IGNITION * 0.8, ease: 'none' }, 0.14);
    }

    /* ── Phase 2 · material bake under the bokeh ───────────────────────── */
    const bakeAt = 0.1 + T_IGNITION;
    tl.call(
      () => {
        setOpeningPhase('bake');
        setPhase('bake');
      },
      undefined,
      bakeAt,
    );
    /*
      The blur arrives on the same frame the override is dropped.

      This ordering is the whole trick and the brief already had it right:
      there is no cross-fade available between an override material and the
      real ones, so the switch has to be hidden. A bokehScale of 9 across the
      frame hides it completely. 0.18s to slam in, because a slow blur would
      show the un-blurred pop underneath it.
    */
    tl.to(opening, { defocus: 1, duration: 0.18, ease: 'power3.out' }, bakeAt);
    tl.set(opening, { wave: 1 }, bakeAt);

    if (el) {
      tl.fromTo(
        el.querySelectorAll('[data-hud]'),
        { opacity: 0 },
        { opacity: 1, duration: 0.45, ease: 'power2.out', stagger: 0.06 },
        bakeAt + 0.1,
      );
      tl.fromTo(
        el.querySelectorAll('[data-reticle]'),
        { opacity: 0, scale: 0.7 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out', stagger: 0.04 },
        bakeAt + 0.05,
      );
    }

    /* ── Phase 3 · the lens resolves ───────────────────────────────────── */
    const focusAt = bakeAt + T_BAKE;
    tl.call(
      () => {
        setOpeningPhase('calibrating');
        setPhase('calibrating');
      },
      undefined,
      focusAt,
    );
    tl.to(
      opening,
      {
        defocus: 0,
        pulse: 0,
        duration: T_CALIBRATE,
        ease: CustomEase.create('ignite', IGNITE_EASE),
      },
      focusAt,
    );

    if (el) {
      /*
        Reticles fly outward as the image resolves. `scale` and `opacity` only
        — animating `inset` would lay out four elements on every frame of the
        most performance-sensitive moment on the page.
      */
      tl.to(
        el.querySelectorAll('[data-reticle]'),
        { scale: 2.6, opacity: 0, duration: 0.7, ease: 'power3.in', stagger: 0.035 },
        focusAt + 0.15,
      );
      tl.to(
        el.querySelectorAll('[data-hud]'),
        { opacity: 0, duration: 0.35, ease: 'power2.in' },
        focusAt + 0.1,
      );
      // The overlay leaves faster than the lens arrives: exit shorter than
      // entrance is what keeps a transition feeling responsive.
      tl.to(el, { opacity: 0, duration: 0.4, ease: 'power2.in' }, focusAt + 0.6);
    }
  }, []);

  /*
    ── Kill the timeline on unmount ──────────────────────────────────────────

    Without this the sequence visibly broke, and the symptom was not obvious:
    the HUD flashed to about 10% opacity and snapped back to 0 while the corner
    reticles reached 76%. Measured, three [data-hud] elements all peaked at
    0.0994 — roughly 45ms into a 450ms tween.

    The cause is two timelines animating the same nodes. React Strict Mode in
    development mounts, unmounts and remounts every component; the first
    instance's timeline was never killed, so it kept running against DOM nodes
    that now belonged to the second instance, and the two clobbered each
    other's opacity writes. Strict Mode surfaced it, but the leak is real in
    production too — any unmount mid-sequence would have left a timeline
    animating detached nodes forever.
  */
  useEffect(
    () => () => {
      timeline.current?.kill();
      timeline.current = null;
    },
    [],
  );

  /* ── Reduced motion: never start ─────────────────────────────────────── */
  useIsomorphicLayoutEffect(() => {
    if (!reduced) return;
    started.current = true;
    forceOpeningComplete();
    setPhase('live');
  }, [reduced]);

  /* ── The spark: inertial cursor follow ───────────────────────────────── */
  useEffect(() => {
    if (reduced || phase !== 'singularity') return;

    const target = { x: 0.5, y: 0.5 };
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth;
      target.y = e.clientY / window.innerHeight;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    let last = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      /*
        1 - lambda^dt, not a fixed alpha. `lerp(a, b, 0.08)` converges twice as
        fast on a 120Hz display as on a 60Hz one — the spark would literally
        have different weight on different monitors.
      */
      const k = 1 - Math.pow(0.0009, dt);
      opening.sparkX += (target.x - opening.sparkX) * k;
      opening.sparkY += (target.y - opening.sparkY) * k;
      // Idle breath, so a viewer who never moves the pointer still sees a live
      // instrument rather than a dot.
      opening.spark = 0.75 + Math.sin(now * 0.0022) * 0.25;

      const node = spark.current;
      if (node) {
        node.style.transform =
          `translate3d(${(opening.sparkX * window.innerWidth).toFixed(1)}px,` +
          ` ${(opening.sparkY * window.innerHeight).toFixed(1)}px, 0) translate(-50%, -50%)` +
          ` scale(${(0.85 + opening.spark * 0.5).toFixed(3)})`;
        node.style.opacity = Math.min(1, opening.spark).toFixed(3);
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [phase, reduced]);

  /* ── Assets: hold phase 0 until the scene can be shown ───────────────── */

  // Read inside the loop below instead of being a dependency of it — see why
  // immediately after.
  const load = useRef({ active, progress });
  load.current = { active, progress };

  useEffect(() => {
    if (reduced) return;

    /*
      A polled deadline, not a setTimeout keyed on the load state.

      The first version was `setTimeout(run, settled ? 900 : 1800)` in an
      effect depending on [active, progress] — and every progress tick tore
      down that timeout and started a new one. With assets still streaming the
      timer never got to fire, so `run` only started 1800ms after the LAST
      progress event. Measured on this machine: the overlay was still up at
      7.1 seconds for a sequence budgeted at 3.9.

      One clock, started once. `settled` is read from a ref each frame so the
      loop sees fresh load state without the effect ever re-running.
    */
    const t0 = performance.now();
    let raf = 0;

    const tick = () => {
      const { active: a, progress: p } = load.current;
      const elapsed = performance.now() - t0;
      const settled = !a && p >= 100;

      /*
        `active` is drei's "a loader is running" flag and it is false both
        before anything starts AND after everything finishes, so on a warm
        cache no loader ever runs. The floor guarantees the singularity gets
        its beat; the ceiling guarantees a stalled or missing asset cannot hold
        the viewer on a black screen indefinitely.
      */
      if ((settled && elapsed >= T_SINGULARITY * 1000) || elapsed >= MAX_HOLD_MS) {
        run();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, reduced]);

  /* ── Scroll lock ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (reduced || !lenis) return;
    if (phase === 'live') {
      lenis.start();
      return;
    }
    lenis.stop();
    window.scrollTo(0, 0);
    // The cleanup matters more than the lock: if this unmounts mid-sequence —
    // a hot reload, an error boundary above it — the page must not be left
    // unscrollable.
    return () => lenis.start();
  }, [lenis, phase, reduced]);

  /* ── Escape / Enter / Space skips ────────────────────────────────────── */
  useEffect(() => {
    if (reduced || phase === 'live') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, skip, reduced]);

  // Fully unmounted once live: no listeners, no rAF, and no extra compositing
  // layer outliving the four seconds it exists for.
  if (phase === 'live' || reduced) return null;

  const singular = phase === 'singularity';

  return (
    <div ref={host} className="fixed inset-0 z-50 select-none">
      {/*
        Pure #000, not the site's --color-void. Phase 0 is specified as black,
        and void is #050508 — close, but the difference is visible against the
        spark's falloff, and "almost black" is the thing that makes an opening
        look like a div rather than like an absence of image.
      */}
      <div ref={veil} className="absolute inset-0 bg-black" />

      {/* The spark. left/top stay at 0 and the position is a transform, so the
          follow never touches layout. */}
      <div
        ref={spark}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 size-64 rounded-full opacity-0 will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(139,123,255,0.95) 0%, rgba(75,225,255,0.45) 22%, rgba(109,75,255,0.12) 45%, transparent 70%)',
        }}
      />

      {/* ── HUD, revealed at the bake ─────────────────────────────────── */}
      <Reticle className="left-8 top-8 opacity-0" />
      <Reticle className="right-8 top-8 rotate-90 opacity-0" />
      <Reticle className="bottom-8 right-8 rotate-180 opacity-0" />
      <Reticle className="bottom-8 left-8 -rotate-90 opacity-0" />

      <span
        data-hud
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 opacity-0"
      >
        <span className="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 bg-cyan/50" />
        <span className="absolute bottom-0 left-1/2 h-5 w-px -translate-x-1/2 bg-cyan/50" />
        <span className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-cyan/50" />
        <span className="absolute right-0 top-1/2 h-px w-5 -translate-y-1/2 bg-cyan/50" />
      </span>

      <span
        data-hud
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-accent-soft/20 to-transparent opacity-0"
      />

      {/* Coordinates. Static strings, not a live readout: a number that ticks
          during a load screen is the counter this brief exists to remove. */}
      <div
        data-hud
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-8 mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-8 font-mono text-[0.55rem] uppercase tracking-[0.28em] text-text-muted/70 opacity-0"
      >
        <span>lat 4.7110° n</span>
        <span className="text-accent-soft/80">optic calibration</span>
        <span>long 74.0721° w</span>
      </div>

      {/*
        Skip. A real button so it is tab-reachable and fires on Enter and
        Space, min-h-11 for the touch target, and always present — including
        during the black singularity, where a viewer who has decided they do
        not want a four-second intro has otherwise no way out.
      */}
      <button
        type="button"
        onClick={skip}
        className="absolute bottom-6 right-6 z-10 flex min-h-11 items-center px-4 font-mono text-[0.58rem] uppercase tracking-[0.28em] text-text-muted/70 transition-colors duration-300 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {singular ? 'skip' : 'skip intro'}
      </button>

      {/* The component returns null once live, so this only ever announces the
          one state it can be in. Announcing the skip route is the point: a
          screen-reader user hears a way out of a four-second animation. */}
      <span aria-live="polite" className="sr-only">
        Intro animation playing. Press Escape to skip.
      </span>
    </div>
  );
}
