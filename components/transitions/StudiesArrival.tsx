'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

/*
  ── Beat map ────────────────────────────────────────────────────────────────

    noise    1.00 → 0.00   dies out by lock 0.58
    carrier  0.12 → 1.00   rises, peaks near 0.55, gone at 1
    lock     0.00 → 0.72   of the band's scroll
    handoff  0.15 → 0.90   03 DEEP INDEX ▸ 04 STUDIES

  The trace ends perfectly flat, which is the point: the burst resolves into
  the same hairline every other seam on the page draws, so the crossing does
  not play an effect and then hand over to a boundary — it settles INTO one.
*/
const LOCK_END = 0.72;

/** Oscilloscope viewBox. Stretched to the viewport, so units are relative. */
const VIEW_W = 1000;
const VIEW_H = 200;
const CENTER = VIEW_H / 2;

/** Samples along the trace. 180 is where the curve stops looking polygonal at
 *  2560px wide; more is just a longer string to rebuild every frame. */
const SAMPLES = 180;
const NOISE_AMP = 46;
const SIGNAL_AMP = 34;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Constant speed with eased ends — same ramp reasoning as IndexArrival. */
function softEnds(t: number, ends = 0.2): number {
  const x = clamp01(t);
  if (x < ends) return smoothstep(x / ends) * ends;
  if (x > 1 - ends) return 1 - ends + smoothstep((x - (1 - ends)) / ends) * ends;
  return x;
}

/**
 * One frame of the trace.
 *
 * `noise` is injected rather than called directly so the server and the first
 * client paint can pass `null` and get a deterministic flat line. Calling
 * Math.random() during render would put different numbers in the SSR HTML and
 * the hydration pass, which is the exact mismatch the rest of this codebase
 * goes out of its way to avoid.
 */
function trace(lock: number, drift: number, noise: (() => number) | null): string {
  // Interference dies well before the carrier peaks, so the two phases read as
  // "static clearing" then "signal resolving" rather than as one blur.
  const noiseF = Math.pow(clamp01(1 - lock / 0.58), 1.6);
  const waveF = Math.sin(Math.PI * clamp01((lock - 0.12) / 0.88));

  let out = '';
  for (let i = 0; i < SAMPLES; i++) {
    const u = i / (SAMPLES - 1);
    // Envelope: the trace meets the baseline at both edges, so the burst sits
    // ON a line rather than being cut off by the screen.
    const env = Math.sin(Math.PI * u);
    // Carrier plus one harmonic. A single sine reads as decoration; the beat
    // between two reads as a waveform carrying something.
    const carrier =
      Math.sin(u * Math.PI * 6 + drift) * 0.72 + Math.sin(u * Math.PI * 14 + 0.9) * 0.28;
    const n = noise ? noise() * 2 - 1 : 0;
    const y = CENTER + env * (carrier * SIGNAL_AMP * waveF + n * NOISE_AMP * noiseF);
    out += `${(u * VIEW_W).toFixed(1)},${y.toFixed(2)} `;
  }
  return out;
}

/** The locked state — a flat line. Also the SSR and reduced-motion state. */
const FLAT = trace(1, 0, null);

const BAR_CELLS = 18;

/**
 * The index → studies crossing: a signal being acquired.
 *
 * The generic SectionSeam was already here and it worked, but Studies speaks
 * in instrument readouts — SYS_STUDY ids, scanlines, `status: COMPLETE` — and
 * a drawn rule says nothing about that. This one speaks the section's own
 * language: an oscilloscope trace that starts as noise floor, resolves into a
 * coherent carrier, and flattens into the hairline the header sits on.
 *
 * The metaphor survived the section's rename from a news feed to research:
 * an instrument settling onto a clean reading is, if anything, more at home
 * in front of a wall of measurements than it was in front of a wall of
 * dispatches.
 *
 * It stays in the seam FAMILY rather than going its own way — same chapter
 * handoff, same mono eyebrow, same accent ramp — so the page reads as one
 * system with a louder beat at this crossing, not as two unrelated ideas.
 *
 * Shorter than IndexArrival on purpose: 170vh against 240vh. That crossing is
 * the page's set piece and this one must not compete with it.
 */
export default function StudiesArrival() {
  const host = useRef<HTMLDivElement>(null);
  const line = useRef<SVGPolylineElement>(null);
  const glow = useRef<SVGPolylineElement>(null);
  const scan = useRef<HTMLDivElement>(null);
  const tears = useRef<HTMLDivElement>(null);
  const from = useRef<HTMLSpanElement>(null);
  const to = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const el = host.current;
        if (!el) return;

        const progress = { value: 0 };
        const trigger = ScrollTrigger.create({
          trigger: el,
          // The sticky window exactly, same as IndexArrival.
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: (self) => (progress.value = self.progress),
          onRefresh: (self) => (progress.value = self.progress),
        });

        const bars = Array.from(
          tears.current?.querySelectorAll<HTMLElement>('[data-tear]') ?? [],
        );

        let raf = 0;
        let lastLock = -1;
        /*
          null, not false.

          The markup renders the LOCKED resting state (it has to — that is the
          reduced-motion and no-JS boundary). Seeding this `false` meant the
          first live frame compared false to false, skipped the write, and left
          the readout saying LOCKED while the meter climbed through 052%.
          Starting undecided forces exactly one write on the first frame.
        */
        let locked: boolean | null = null;

        const draw = () => {
          raf = requestAnimationFrame(draw);

          const lock = softEnds(clamp01(progress.value / LOCK_END));
          const noiseF = Math.pow(clamp01(1 - lock / 0.58), 1.6);
          const waveF = Math.sin(Math.PI * clamp01((lock - 0.12) / 0.88));
          const live = noiseF > 0.002 || waveF > 0.002;

          /*
            Two exit conditions, not one.

            While the trace is live it must redraw every frame even if the
            scroll has not moved — the noise floor is per-frame randomness and
            a frozen frame of it looks like a texture, not like interference.
            Once it is flat, a scroll that does not change `lock` has nothing
            to redraw, so the loop goes quiet instead of rebuilding an
            identical 180-point string forever.
          */
          if (!live && Math.abs(lock - lastLock) < 0.0004) return;
          lastLock = lock;

          const points = live
            ? trace(lock, performance.now() * 0.0016, Math.random)
            : FLAT;
          line.current?.setAttribute('points', points);
          glow.current?.setAttribute('points', points);
          glow.current?.setAttribute('opacity', (0.55 * (1 - lock * 0.7)).toFixed(3));

          // Scanlines and tears belong to the interference, so they ride
          // noiseF and are completely gone once the carrier is clean.
          if (scan.current) scan.current.style.opacity = (noiseF * 0.5).toFixed(3);
          bars.forEach((tear, i) => {
            tear.style.opacity = (noiseF * 0.85).toFixed(3);
            if (noiseF > 0.01) {
              // Whole-band horizontal displacement: the classic dropped-scanline
              // artefact, and a transform so it never triggers layout.
              const y = (Math.random() * 100).toFixed(1);
              const x = ((Math.random() - 0.5) * (18 + i * 10)).toFixed(1);
              tear.style.transform = `translate3d(${x}px, ${y}vh, 0)`;
            }
          });

          // ── Readout ─────────────────────────────────────────────────────
          const h = clamp01((progress.value - 0.15) / 0.75);
          if (from.current) from.current.style.opacity = (1 - smoothstep(h / 0.42)).toFixed(3);
          if (to.current) {
            const inbound = smoothstep(clamp01((h - 0.4) / 0.6));
            to.current.style.opacity = inbound.toFixed(3);
            to.current.style.transform = `translate3d(${((1 - inbound) * 14).toFixed(1)}px, 0, 0)`;
          }

          const filled = Math.round(lock * BAR_CELLS);
          if (bar.current) {
            bar.current.textContent = '█'.repeat(filled) + '░'.repeat(BAR_CELLS - filled);
          }
          if (pct.current) {
            pct.current.textContent = String(Math.round(lock * 100)).padStart(3, '0');
          }
          // Flip once, not every frame — writing textContent unconditionally
          // invalidates the text node on a element that is otherwise static.
          const nowLocked = lock > 0.82;
          if (status.current && nowLocked !== locked) {
            locked = nowLocked;
            status.current.textContent = nowLocked ? 'LOCKED' : 'ACQUIRING';
            status.current.className = nowLocked
              ? 'text-steel transition-colors duration-300'
              : 'text-accent-soft transition-colors duration-300';
          }
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
          trigger: el,
          start: 'top bottom+=50%',
          end: 'bottom top-=50%',
          onToggle: (self) => {
            // Force a redraw on re-entry: lastLock still holds the progress from
            // before the loop stopped, and the scroll has moved since.
            lastLock = -1;
            if (self.isActive) startLoop();
            else stopLoop();
          },
        });

        if (gate.isActive) startLoop();

        return () => {
          stopLoop();
          gate.kill();
          trigger.kill();
        };
      });
    }, host);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={host}
      /*
        Decorative: the chapter numbers and the section name below it are the
        real content, and "04 RESEARCH & DEVELOPMENT / SIGNAL LOCKED /
        Studies" read in sequence is the same heading three times.
      */
      aria-hidden="true"
            /*
        svh, not vh, and the two must MATCH the sticky child's unit.

        The band was vh while its stage was 100svh. On mobile those are
        different numbers — vh is the large viewport (URL bar hidden), svh the
        small one (bar shown) — so the sticky travel, which is band minus
        stage, silently changed size the moment the browser chrome collapsed
        mid-scroll. ScrollTrigger re-measures and the whole transition jumps.
        Both ends on svh means the travel is one stable number.

        Shorter below the md breakpoint: the same choreography plays over less
        scroll, because a phone screen is tall and narrow, and the four
        crossings together were 800vh of decorative travel on a touch device.
      */
      className="studies-arrival relative h-[140svh] md:h-[170svh]"
    >
      <div
        data-stage
        className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden"
      >
        {/* Interference layers. Both are driven by the noise envelope, so at
            rest — and under reduced motion — they are simply not painted. */}
        <div
          ref={scan}
          className="pointer-events-none absolute inset-0 opacity-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, rgba(139,123,255,0.20) 0px, rgba(139,123,255,0.20) 1px, transparent 1px, transparent 4px)',
          }}
        />
        <div ref={tears} className="pointer-events-none absolute inset-0">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              data-tear
              className="absolute inset-x-[-10%] top-0 opacity-0"
              style={{
                height: `${6 + i * 5}px`,
                background:
                  i % 2
                    ? 'linear-gradient(90deg, transparent, rgba(75,225,255,0.30), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(109,75,255,0.34), transparent)',
              }}
            />
          ))}
        </div>

        {/* ── The trace ─────────────────────────────────────────────────── */}
        <div className="relative mx-auto w-full max-w-[1600px] px-5 sm:px-8">
          <svg
            className="block h-[34svh] max-h-[300px] w-full"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            focusable="false"
          >
            <defs>
              <linearGradient id="studies-trace" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#c9b79c" stopOpacity="0.25" />
                <stop offset="45%" stopColor="#a89882" />
                <stop offset="100%" stopColor="#aeb6c6" />
              </linearGradient>
            </defs>

            {/*
              vectorEffect keeps the stroke 1.5px regardless of the non-uniform
              stretch this viewBox gets. Without it a wide viewport squashes the
              line vertically into a hairline and a narrow one fattens it.
            */}
            <polyline
              ref={glow}
              points={FLAT}
              fill="none"
              stroke="#aeb6c6"
              strokeWidth="5"
              vectorEffect="non-scaling-stroke"
              opacity="0.16"
              style={{ filter: 'blur(4px)' }}
            />
            <polyline
              ref={line}
              points={FLAT}
              fill="none"
              stroke="url(#studies-trace)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* ── Readout, on the same baseline grammar as every seam ─────── */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[0.6rem] uppercase tracking-[0.28em]">
            <span ref={from} className="whitespace-nowrap text-text-muted">
              <span className="text-text-muted/60">03</span>
              <span className="mx-2 text-text-muted/40">/</span>
              Deep Index
            </span>

            <span className="flex items-center gap-3 whitespace-nowrap text-text-muted">
              Signal
              {/*
                tracking-normal: block glyphs are drawn edge to edge, and the
                0.28em letter-spacing the eyebrows use breaks the bar into
                separate ticks instead of one continuous meter.
              */}
              <span ref={bar} className="tracking-normal text-accent-soft">
                {'█'.repeat(BAR_CELLS)}
              </span>
              <span ref={pct} className="tabular-nums text-text">
                100
              </span>
              %
            </span>

            <span ref={status} className="text-steel transition-colors duration-300">
              LOCKED
            </span>

            <span
              ref={to}
              className="ml-auto whitespace-nowrap text-text"
            >
              <span className="text-accent-soft">04</span>
              <span className="mx-2 text-text-muted/40">/</span>
              Research &amp; Development
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
