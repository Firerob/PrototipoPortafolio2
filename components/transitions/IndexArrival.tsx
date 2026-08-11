'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setArchiveExit, smootherstep } from '@/lib/archiveScroll';
import { VW, VH, waveUp } from '@/lib/wave';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

/*
  ── Beat map ────────────────────────────────────────────────────────────────

    wave     0.00 → 0.70   the mirrored front rises, light room → void
    word     0.58 → 1.00   INDEX recedes into the vanishing point
    cleanup  0.74 → 0.95   light plate and the fixed curtain are removed
    handoff  0.08 → 0.88   02 ARCHIVE ▸ 03 DEEP INDEX

  Overlapping on purpose, same as the hero → archive map in archiveScroll: the
  word starts sinking while the wave is still travelling, so the two read as
  one move instead of two queued ones.
*/
const WAVE_END = 0.7;
const WORD_START = 0.58;
const CLEAN_START = 0.74;
const CLEAN_END = 0.95;

const phase = (p: number, a: number, b: number) =>
  Math.min(1, Math.max(0, (p - a) / (b - a)));

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/**
 * Constant speed with eased ends — the wave's ramp.
 *
 * smootherstep was the obvious choice and it was wrong here, for a reason
 * worth writing down: it is SLOWEST at the ends and FASTEST at t=0.5, and
 * t=0.5 is exactly where the crest crosses the word. The inversion — the whole
 * point of the shot — happened at nearly double average speed and lasted about
 * 85px of scroll. Measured on the captures: at 0.20 the crest was still off the
 * bottom, at 0.28 it was already above the word.
 *
 * This keeps the soft departure and arrival but runs the middle linearly, so
 * the crest travels the word at the average rate rather than the peak one.
 */
function softEnds(t: number, ends = 0.2): number {
  const x = clamp01(t);
  if (x < ends) return smoothstep(x / ends) * ends;
  if (x > 1 - ends) return 1 - ends + smoothstep((x - (1 - ends)) / ends) * ends;
  return x;
}

/**
 * The archive → index crossing.
 *
 * The archive leaves the viewer standing in a bright blueprint room; the index
 * is void-dark. Cutting between them mid-scroll was the single hardest edit on
 * the page — a hairline border with light above it and black below reads as a
 * rendering bug, not as a section change.
 *
 * So the room is closed the same way it was opened. `waveUp` is the exact
 * mirror of the front that brought the light in, and the giant INDEX word sits
 * over it in `mix-blend-difference`, which means the word inverts *along the
 * crest itself*: dark-on-light above the wave, light-on-void below, splitting
 * across the curve as it passes. No second element, no theme swap, no
 * cross-fade — one blend mode doing the work.
 *
 * Held by `position: sticky`, not by a ScrollTrigger pin. The page already
 * pins the orbit and the archive, and the motion database's own guidance is to
 * stop at one or two — a third pinned spacer both fights native scroll feel on
 * mobile and adds another height mutation that every later trigger has to be
 * measured around. Sticky costs neither.
 */
export default function IndexArrival() {
  const section = useRef<HTMLElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const wave = useRef<SVGPathElement>(null);
  const crest = useRef<SVGPathElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const from = useRef<HTMLSpanElement>(null);
  const to = useRef<HTMLSpanElement>(null);
  const rule = useRef<HTMLSpanElement>(null);
  const streaks = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /** Written by ScrollTrigger, read by the rAF loop. Never in state. */
        const progress = { value: 0 };

        const trigger = ScrollTrigger.create({
          trigger: section.current,
          /*
            Exactly the sticky window: the child sticks when the section's top
            reaches the viewport top and releases when its bottom reaches the
            viewport bottom. Matching the trigger to it is what keeps the wave
            from still moving after the stage has started scrolling away.
          */
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: (self) => (progress.value = self.progress),
          onRefresh: (self) => (progress.value = self.progress),
        });

        const bars = Array.from(
          streaks.current?.querySelectorAll<HTMLElement>('[data-streak]') ?? [],
        );

        let raf = 0;
        let last = -1;

        const draw = () => {
          raf = requestAnimationFrame(draw);

          const p = progress.value;
          if (Math.abs(p - last) < 0.0004) return;
          last = p;

          // ── The front ───────────────────────────────────────────────────
          const t = softEnds(phase(p, 0, WAVE_END));
          const d = waveUp(t);
          wave.current?.setAttribute('d', d);
          crest.current?.setAttribute('d', d);
          // The crest only glows while it is actually crossing the screen.
          crest.current?.setAttribute(
            'opacity',
            (Math.sin(Math.PI * t) * 0.95).toFixed(3),
          );

          // ── The word sinking into the corridor ──────────────────────────
          const w = smootherstep(phase(p, WORD_START, 1));
          if (word.current) {
            const scale = 1 - w * 0.78;
            word.current.style.transform = `translate3d(0, ${(w * 7).toFixed(2)}vh, 0) scale(${scale.toFixed(4)})`;
            word.current.style.opacity = (1 - w * w).toFixed(3);
            // Depth-of-field, matched to the index rows' own blur ramp so the
            // word looks like it joined the same corridor.
            word.current.style.filter = w > 0.02 ? `blur(${(w * 6).toFixed(2)}px)` : '';
          }

          // ── Removing the room once it is hidden ─────────────────────────
          const c = smootherstep(phase(p, CLEAN_START, CLEAN_END));
          if (plate.current) plate.current.style.opacity = (1 - c).toFixed(3);
          /*
            The wave dissolves COMPLETELY at the end.

            It used to settle at 0.95 to match <main>'s old `bg-void/95`. Now
            that main is transparent and the 3D world runs behind it, a 0.95
            void plate is the single hardest edge on the page — measured at
            ΔL 27 out of 255 where the stage meets the index, which is exactly
            the "container block slightly lighter than the canvas" artifact.

            Once `exit` has taken the light room away this plate is hiding
            nothing, so it can go, and the post-hero field simply continues
            behind the index. There is no boundary left to see.
          */
          wave.current?.setAttribute('fill-opacity', (1 - c).toFixed(3));
          setArchiveExit(c);

          // ── Handoff readout ─────────────────────────────────────────────
          const h = phase(p, 0.08, 0.88);
          if (from.current) {
            from.current.style.opacity = (1 - smootherstep(h / 0.38)).toFixed(3);
          }
          if (to.current) {
            // Starts after the outgoing label is gone, so the two never
            // overlap into an unreadable double-reading of the chapter.
            const inbound = smootherstep(phase(h, 0.45, 1));
            to.current.style.opacity = inbound.toFixed(3);
            to.current.style.transform = `translate3d(${((1 - inbound) * 14).toFixed(2)}px, 0, 0)`;
          }
          if (rule.current) rule.current.style.transform = `scaleX(${h.toFixed(4)})`;

          // ── Speed streaks ───────────────────────────────────────────────
          // Peak at the moment the crest crosses, gone by the time it settles.
          const rush = Math.sin(Math.PI * Math.min(1, p / WAVE_END));
          bars.forEach((bar, i) => {
            bar.style.opacity = (rush * (i % 2 ? 0.5 : 0.8)).toFixed(3);
            bar.style.transform = `scaleY(${(0.2 + rush * (i % 2 ? 1.6 : 1)).toFixed(3)})`;
          });
        };

        /*
          The loop runs only while the band is near the viewport.

          All four crossings were scheduling a rAF callback every frame for the
          whole session — including while the viewer was still up in the hero,
          ten screens away. Each one early-outs cheaply, but four cheap
          callbacks times sixty frames times the length of a session is
          main-thread budget spent on nothing (quick-reference §3
          `main-thread-budget`, and §3 `debounce-throttle` on high-frequency
          work).

          The gate is deliberately WIDER than the sticky window. The stage is
          already on screen before its own trigger starts and after it ends, so
          gating on that same range would freeze the scene while it is still
          visible.
        */
        const startLoop = () => {
          if (!raf) raf = requestAnimationFrame(draw);
        };
        const stopLoop = () => {
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
        };

        const gate = ScrollTrigger.create({
          trigger: section.current,
          start: 'top bottom+=50%',
          end: 'bottom top-=50%',
          onToggle: (self) => {
            // Force a redraw on re-entry: last still holds the progress from
            // before the loop stopped, and the scroll has moved since.
            last = -1;
            if (self.isActive) startLoop();
            else stopLoop();
          },
        });

        if (gate.isActive) startLoop();

        return () => {
          stopLoop();
          gate.kill();
          trigger.kill();
          // Leaving `exit` mid-fade would strand the archive curtain at a
          // partial opacity for the rest of the session.
          setArchiveExit(0);
        };
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      /*
        Decorative in full: the word duplicates the real <h2> in the section
        below, and the readout duplicates its numbering. A screen reader
        meeting "INDEX / 03 DEEP INDEX / Index" in a row is being read the same
        heading three times.
      */
      aria-hidden="true"
      /*
        240vh, i.e. 140vh of actual sticky travel. Sized from the measurement,
        not by taste: the crest has to cross the word's ~170px band slowly
        enough to be seen, and at 180vh that band went past in roughly 85px of
        scroll — one wheel notch. 140vh of travel puts it near 140px.
      */
            /*
        svh, not vh, and the two must MATCH the sticky child's unit.

        The band was vh while its stage was 100svh. On mobile those are
        different numbers — vh is the large viewport (URL bar hidden), svh the
        small one (bar shown) — so the sticky travel, which is band minus
        stage, silently changed size the moment the browser chrome collapsed
        mid-scroll. ScrollTrigger re-measures and the whole transition jumps.
        Both ends on svh means the travel is one stable number.

        Shorter below the md breakpoint: the same choreography plays over less
        scroll, because a phone screen is tall and narrow, and 140svh of
        decorative travel on a touch device is a long way to swipe.
      */
      className="arrival relative z-10 h-[150svh] md:h-[240svh]"
    >
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
        {/*
          The blueprint room, continued.

          Same grid values as ArchiveSection's, so the light the viewer is
          standing in when this section starts is visibly the same light —
          the surface does not change, only what is rising through it.
        */}
        <div
          ref={plate}
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(24,28,48,0.07) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(24,28,48,0.07) 1px, transparent 1px),
              radial-gradient(circle at center, rgba(24,28,48,0.30) 1px, transparent 1.6px),
              linear-gradient(180deg, #eef1fb 0%, #e4e8f6 70%, #dfe4f4 100%)
            `,
            backgroundSize: '48px 48px, 48px 48px, 192px 192px, 100% 100%',
          }}
        />

        {/* Vertical speed streaks. Positioned off the gutters rather than
            evenly, so they read as passing structure and not as a pattern. */}
        <div ref={streaks} className="pointer-events-none absolute inset-0">
          {[12, 31, 69, 88].map((x) => (
            <span
              key={x}
              data-streak
              className="absolute inset-y-0 w-px origin-center opacity-0"
              style={{
                left: `${x}%`,
                background:
                  'linear-gradient(180deg, transparent, rgba(109,75,255,0.55) 35%, rgba(75,225,255,0.5) 65%, transparent)',
              }}
            />
          ))}
        </div>

        <svg
          className="absolute inset-0 size-full"
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="none"
          focusable="false"
        >
          {/* `fill` as a CSS property, not a presentation attribute:
              attributes do not resolve var(), so `fill="var(--color-void)"`
              silently painted black-by-fallback instead of the token. */}
          <path
            ref={wave}
            d={waveUp(0)}
            style={{ fill: 'var(--color-void)' }}
            fillOpacity="1"
          />
          {/* Drawn after the fill, unlike the descending wave's glow: this
              front arrives from below, so its lit edge is on top of the mass
              rather than ahead of it. */}
          <path
            ref={crest}
            d={waveUp(0)}
            fill="none"
            stroke="#aeb6c6"
            strokeWidth="0.4"
            opacity="0"
            style={{ filter: 'blur(1.2px)' }}
          />
        </svg>

        {/*
          The word. `mix-blend-difference` needs an un-isolated backdrop, so
          nothing between it and the plate may set `isolation`, `filter` or a
          fractional opacity — the blur below is on this element itself, which
          is fine, but adding one to a wrapper would flatten the inversion.
        */}
        <span
          ref={word}
          className="relative select-none font-sans text-[clamp(3.5rem,17vw,15rem)] font-bold uppercase leading-none tracking-[-0.05em] text-white mix-blend-difference will-change-transform"
        >
          Index
        </span>

        {/* Chapter handoff, on the same baseline as every section eyebrow. */}
        <div className="absolute inset-x-0 top-0 mx-auto flex max-w-[1600px] items-center gap-4 px-5 pt-8 font-mono text-[0.62rem] uppercase tracking-[0.28em] mix-blend-difference sm:px-8 sm:pt-10">
          <span ref={from} className="whitespace-nowrap text-white">
            02 / Archive
          </span>
          <span className="relative h-px flex-1 bg-white/25">
            <span
              ref={rule}
              className="absolute inset-0 origin-left scale-x-0 bg-white"
            />
          </span>
          <span ref={to} className="whitespace-nowrap text-white opacity-0">
            03 / Deep Index
          </span>
        </div>
      </div>
    </section>
  );
}
