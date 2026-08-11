'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

/*
  ── Beat map ────────────────────────────────────────────────────────────────

    align    0.00 → 0.24   the dial arrives; the sweep spins down onto bearing
    charge   0.24 → 0.48   the arc draws around the rim, the core builds
    burst    0.44 → 0.78   four rings launch and cross the viewport
    link     0.78 → 1.00   the dial recedes, LINK ESTABLISHED

  Charge and burst overlap by four points on purpose: the first ring leaves
  while the arc is still closing, so the transmission reads as something that
  escaped under pressure rather than as a button being pressed.
*/
const ALIGN_END = 0.24;
const CHARGE_END = 0.48;
const BURST_START = 0.44;
const BURST_END = 0.78;

/*
  Square viewBox with `slice`, so a circle stays a circle on any window shape.

  The box is 200 units, and that number is a correction. It was 100, on the
  assumption that `slice` maps the SHORT viewport axis to the viewBox — it does
  not. It scales by max(width, height) / viewBox, so on a 1440x900 window one
  unit was 14.4px rather than the 9px the geometry had been drawn for, and the
  whole dial came out at double size with rings 20px thick. Doubling the box
  halves every unit at once instead of retuning thirty numbers.

  At 200 units the far corner of a 16:9 window sits at hypot(100, 62.5) ≈ 118
  units, so the rings travel to 126: past the corners on a wide monitor, which
  is what makes them read as crossing the screen rather than as a disc growing
  in the middle of it.
*/
const RING_MAX = 126;
const RINGS = [0, 1, 2, 3];
/** Stagger between ring launches, as a fraction of the burst phase. */
const RING_STEP = 0.13;

/** Azimuth ticks around the dial rim. Every sixth is a long one. */
const TICKS = Array.from({ length: 48 }, (_, i) => i);

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const phase = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

const BAR_CELLS = 16;

/**
 * The about → contact crossing: an uplink firing.
 *
 * Contact is the "Signal Transmitter", and it is the outbound half of a pair —
 * NewsArrival resolves an incoming signal out of noise, this one sends one. So
 * the two share a vocabulary (a meter, a status word that flips, the same
 * chapter handoff) and invert the direction.
 *
 * It is also the only radial crossing on the page, and that is deliberate. The
 * archive wave, the news trace and the about doors are all rectilinear and all
 * travel left-to-right or top-to-bottom; a fourth one in the same grammar
 * would read as a repeat however different its content was. A dial that spins
 * onto bearing and throws concentric rings past the edges of the screen is the
 * one shape the page has not used.
 *
 * The last ring hands over to the pinging status dot at the top of
 * ContactSection, which is the same gesture at a hundredth of the size.
 */
export default function ContactArrival() {
  const host = useRef<HTMLDivElement>(null);
  const dial = useRef<SVGGElement>(null);
  const sweep = useRef<SVGGElement>(null);
  const arc = useRef<SVGCircleElement>(null);
  const core = useRef<SVGCircleElement>(null);
  const halo = useRef<SVGCircleElement>(null);
  const grid = useRef<SVGGElement>(null);
  const rings = useRef<(SVGCircleElement | null)[]>([]);
  const glow = useRef<HTMLDivElement>(null);
  const fromLabel = useRef<HTMLSpanElement>(null);
  const toLabel = useRef<HTMLSpanElement>(null);
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
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: (self) => (progress.value = self.progress),
          onRefresh: (self) => (progress.value = self.progress),
        });

        let raf = 0;
        let last = -1;
        let linked: boolean | null = null;

        const draw = () => {
          raf = requestAnimationFrame(draw);

          const p = progress.value;
          if (Math.abs(p - last) < 0.0004) return;
          last = p;

          const align = smoothstep(phase(p, 0, ALIGN_END));
          const charge = phase(p, ALIGN_END, CHARGE_END);
          const burst = phase(p, BURST_START, BURST_END);
          const linkOut = smoothstep(phase(p, BURST_END, 1));

          // ── Dial ────────────────────────────────────────────────────────
          if (dial.current) {
            dial.current.setAttribute('opacity', (align * (1 - linkOut)).toFixed(3));
            const scale = 0.82 + align * 0.18 + linkOut * 0.5;
            dial.current.setAttribute('transform', `scale(${scale.toFixed(4)})`);
          }

          /*
            The sweep spins down onto bearing rather than snapping to it: two
            and a half turns bled off with a cubic ease-out, finishing pointing
            straight up. A dial that is already aligned when it appears has not
            done anything; watching it settle is what says "acquiring".
          */
          if (sweep.current) {
            const spin = (1 - easeOutCubic(align)) * 900;
            sweep.current.setAttribute('transform', `rotate(${(-90 + spin).toFixed(2)})`);
            sweep.current.setAttribute('opacity', (1 - charge * 0.75).toFixed(3));
          }

          /*
            pathLength="1" normalises the circumference to 1, so the arc can be
            drawn with a dash offset of exactly (1 - charge) without anyone
            having to compute 2*pi*r and keep it in sync with the radius.
          */
          if (arc.current) {
            arc.current.setAttribute('stroke-dashoffset', (1 - smoothstep(charge)).toFixed(4));
            arc.current.setAttribute('opacity', (0.35 + charge * 0.65).toFixed(3));
          }

          // Core builds through the charge and flashes as the first ring goes.
          const flash = Math.sin(Math.PI * clamp01(burst * 3.2));
          if (core.current) {
            core.current.setAttribute('r', (2 + charge * 1.6 + flash * 2.4).toFixed(2));
          }
          if (halo.current) {
            halo.current.setAttribute('r', (5 + charge * 4 + flash * 16).toFixed(2));
            halo.current.setAttribute(
              'opacity',
              (charge * 0.25 + flash * 0.5).toFixed(3),
            );
          }
          if (glow.current) {
            glow.current.style.opacity = (charge * 0.5 + flash * 0.5).toFixed(3);
          }
          if (grid.current) {
            grid.current.setAttribute(
              'opacity',
              (align * (0.25 + charge * 0.35 + flash * 0.3) * (1 - linkOut)).toFixed(3),
            );
          }

          // ── Rings ───────────────────────────────────────────────────────
          RINGS.forEach((i) => {
            const node = rings.current[i];
            if (!node) return;
            const t = clamp01((burst - i * RING_STEP) / (1 - RING_STEP * 3));
            if (t <= 0) {
              node.setAttribute('opacity', '0');
              return;
            }
            // Decelerating: a shockwave loses speed as it spreads, and a
            // linear ring reads as a growing circle instead of as a wave.
            const spread = easeOutCubic(t);
            node.setAttribute('r', (5 + spread * RING_MAX).toFixed(2));
            node.setAttribute('opacity', (Math.pow(1 - t, 1.4) * 0.9).toFixed(3));
            node.setAttribute('stroke-width', (0.42 * (1 - t * 0.6)).toFixed(3));
          });

          // ── Readout ─────────────────────────────────────────────────────
          const h = phase(p, 0.1, 0.9);
          if (fromLabel.current) {
            fromLabel.current.style.opacity = (1 - smoothstep(h / 0.4)).toFixed(3);
          }
          if (toLabel.current) {
            const inbound = smoothstep(phase(h, 0.45, 1));
            toLabel.current.style.opacity = inbound.toFixed(3);
            toLabel.current.style.transform = `translate3d(${((1 - inbound) * 14).toFixed(1)}px,0,0)`;
          }

          const power = smoothstep(charge);
          const filled = Math.round(power * BAR_CELLS);
          if (bar.current) {
            bar.current.textContent = '█'.repeat(filled) + '░'.repeat(BAR_CELLS - filled);
          }
          if (pct.current) {
            pct.current.textContent = String(Math.round(power * 100)).padStart(3, '0');
          }
          const nowLinked = p > BURST_START + 0.06;
          if (status.current && nowLinked !== linked) {
            linked = nowLinked;
            status.current.textContent = nowLinked ? 'LINK ESTABLISHED' : 'UPLINK // CHARGING';
            status.current.className = nowLinked
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
        };
      });
    }, host);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={host}
      /*
        Decorative. The chapter number and section name below say the same
        thing in text, and a screen reader has no use for a radar dial.
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
        scroll, because a phone screen is tall and narrow, and this is the
        fourth crossing the viewer has swiped through.
      */
      className="contact-arrival relative h-[140svh] md:h-[170svh]"
    >
      <div
        data-stage
        // Same reasoning as AboutArrival: feathered so the stage never meets the
        // page as a straight line. Its bloom is bright enough to show a seam.
        className="mask-fade-y [--fade-start:9%] [--fade-end:91%] sticky top-0 h-[100svh] overflow-hidden"
      >
        <div data-scene className="absolute inset-0">
          {/* Bloom under the transmitter, in the page's accent. */}
          <div
            ref={glow}
            className="pointer-events-none absolute left-1/2 top-1/2 size-[58vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 opacity-0 blur-[130px]"
          />

          <svg
            className="absolute inset-0 size-full"
            viewBox="-100 -100 200 200"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            {/* Range grid: concentric rings and spokes the wave travels over,
                so the rings have something to read as distance against. */}
            <g ref={grid} opacity="0" stroke="#a89882" fill="none" strokeWidth="0.15">
              {[22, 38, 58, 82, 110].map((r) => (
                <circle key={r} cx="0" cy="0" r={r} opacity="0.5" />
              ))}
              {[0, 45, 90, 135].map((a) => {
                const rad = (a * Math.PI) / 180;
                return (
                  <line
                    key={a}
                    x1={-130 * Math.cos(rad)}
                    y1={-130 * Math.sin(rad)}
                    x2={130 * Math.cos(rad)}
                    y2={130 * Math.sin(rad)}
                    opacity="0.28"
                  />
                );
              })}
            </g>

            {/* Shockwave rings. Drawn under the dial so the transmitter stays
                legible while they pass over the rest of the screen. */}
            {RINGS.map((i) => (
              <circle
                key={i}
                ref={(n) => {
                  rings.current[i] = n;
                }}
                cx="0"
                cy="0"
                r="5"
                fill="none"
                stroke={i % 2 ? '#aeb6c6' : '#a89882'}
                strokeWidth="0.42"
                opacity="0"
              />
            ))}

            <g ref={dial} opacity="0">
              {/* Rim */}
              <circle cx="0" cy="0" r="19" fill="none" stroke="#a89882" strokeWidth="0.2" opacity="0.4" />
              {/*
                Charge arc. rotate(-90) starts it at twelve o'clock; without it
                the arc begins at three and the dial fills from the side, which
                reads as a progress bar bent into a circle rather than as a
                gauge.
              */}
              <circle
                ref={arc}
                cx="0"
                cy="0"
                r="19"
                fill="none"
                stroke="#aeb6c6"
                strokeWidth="0.4"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset="1"
                transform="rotate(-90)"
                strokeLinecap="round"
              />

              {/* Azimuth ticks */}
              <g stroke="#a89882" strokeWidth="0.18" opacity="0.55">
                {TICKS.map((i) => {
                  const rad = (i / TICKS.length) * Math.PI * 2;
                  const long = i % 6 === 0;
                  const r0 = long ? 12.4 : 14;
                  const r1 = 15.6;
                  return (
                    <line
                      key={i}
                      x1={r0 * Math.cos(rad)}
                      y1={r0 * Math.sin(rad)}
                      x2={r1 * Math.cos(rad)}
                      y2={r1 * Math.sin(rad)}
                      opacity={long ? 1 : 0.45}
                    />
                  );
                })}
              </g>

              {/* Sweep: a hard leading edge with a decaying tail behind it. */}
              <g ref={sweep}>
                <defs>
                  <linearGradient id="uplink-sweep" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#aeb6c6" stopOpacity="0" />
                    <stop offset="100%" stopColor="#aeb6c6" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                <path d="M 0 0 L 15.6 -4.6 A 16.3 16.3 0 0 1 15.6 0 Z" fill="url(#uplink-sweep)" />
                <line x1="0" y1="0" x2="15.6" y2="0" stroke="#aeb6c6" strokeWidth="0.28" />
              </g>

              {/* Crosshair */}
              <g stroke="#a89882" strokeWidth="0.16" opacity="0.5">
                <line x1="-25" y1="0" x2="-21" y2="0" />
                <line x1="21" y1="0" x2="25" y2="0" />
                <line x1="0" y1="-25" x2="0" y2="-21" />
                <line x1="0" y1="21" x2="0" y2="25" />
              </g>

              <circle ref={halo} cx="0" cy="0" r="5" fill="#aeb6c6" opacity="0" />
              <circle ref={core} cx="0" cy="0" r="2" fill="#aeb6c6" />
            </g>
          </svg>
        </div>

        {/* ── Readout, same grammar as every other crossing ─────────────── */}
        <div
          data-readout
          className="absolute inset-x-0 bottom-8 mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-5 font-mono text-[0.6rem] uppercase tracking-[0.28em] sm:px-8"
        >
          <span ref={fromLabel} className="whitespace-nowrap text-text-muted">
            <span className="text-text-muted/60">05</span>
            <span className="mx-2 text-text-muted/40">/</span>
            Profile
          </span>

          <span className="flex items-center gap-3 whitespace-nowrap text-text-muted">
            Uplink
            {/* tracking-normal, or the block glyphs separate into ticks and the
                meter stops reading as one continuous bar. */}
            <span ref={bar} className="tracking-normal text-accent-soft">
              {'█'.repeat(BAR_CELLS)}
            </span>
            <span ref={pct} className="tabular-nums text-text">
              100
            </span>
            %
          </span>

          <span ref={status} className="text-steel transition-colors duration-300">
            LINK ESTABLISHED
          </span>

          <span ref={toLabel} className="ml-auto whitespace-nowrap text-text">
            <span className="text-accent-soft">06</span>
            <span className="mx-2 text-text-muted/40">/</span>
            Signal Transmitter
          </span>
        </div>
      </div>
    </div>
  );
}
