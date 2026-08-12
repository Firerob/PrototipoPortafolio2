'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

/*
  ── Beat map ────────────────────────────────────────────────────────────────

    drift    0.00 → 0.18   raw sample points adrift; nothing is a face yet
    sweep    0.18 → 0.50   the scan bar crosses; points lock as it passes them
    resolve  0.50 → 0.76   the outline draws in behind the locked cloud
    lock     0.76 → 0.92   registration marks strike, identity confirmed
    clear    0.92 → 1.00   the portrait blooms out and About is open

  The read is a biometric acquisition, and that is not a theme picked at
  random: the profile card immediately below this reads "biometric // ONLINE"
  and carries its own scanner sweep, so the crossing is now the capture whose
  result that card displays. About is "05 / Profile" — this is the profile
  being taken.

  ── Why the scan bar drives the lock, and not time ──────────────────────────

  Every point's lock is a function of where the bar is relative to THAT point's
  x, not of global progress. So the silhouette assembles left to right in the
  bar's wake, which is what makes the bar look like the cause rather than like
  a decoration travelling over an animation that was going to happen anyway.
*/
const DRIFT_END = 0.18;
const SWEEP_END = 0.5;
const RESOLVE_END = 0.76;
const LOCK_END = 0.92;

/** Design space the bust is authored in; mapped to the canvas at draw time. */
const DESIGN_W = 400;
const DESIGN_H = 520;

/*
  Head and shoulders, authored once as a single closed path.

  It is used for two different things and must stay one string for them to
  agree: sampled along its length for the outline points, and stroked as the
  outline itself once those points have locked.
*/
const BUST_PATH = `
  M 200 58
  C 244 58, 272 98, 272 150
  C 272 194, 254 228, 230 240
  L 230 268
  C 304 282, 350 332, 360 410
  L 360 462
  L 40 462
  L 40 410
  C 50 332, 96 282, 170 268
  L 170 240
  C 146 228, 128 194, 128 150
  C 128 98, 156 58, 200 58
  Z
`;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const phase = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

interface Point {
  /** Where it belongs on the portrait, in design space. */
  tx: number;
  ty: number;
  /** Where it drifts before the bar reaches it. */
  sx: number;
  sy: number;
  /** Per-point wobble so the drift never looks like one rigid cloud. */
  speed: number;
  phase: number;
  /** Outline points carry the silhouette; interior ones only give it mass. */
  edge: boolean;
}

/**
 * News → About: a biometric portrait acquisition.
 *
 * Replaces the door-prying figure that used to live here. Everything outside
 * the scene itself is unchanged on purpose — the band height, the sticky
 * masked stage, the `data-scene` wrapper the reduced-motion rule hides, and
 * the readout's chapter-handoff grammar are the same across all four
 * crossings and are what keep them reading as one system.
 *
 * ── Canvas, where the other crossings use SVG ───────────────────────────────
 *
 * A deliberate exception, made on element count. The other crossings animate a
 * handful of shapes; this one animates a couple of hundred points every frame,
 * and a couple of hundred SVG nodes taking attribute writes at 60fps is the
 * one shape of work canvas is unambiguously better at. The silhouette is
 * stroked into the same canvas from a Path2D built out of the same path string
 * the points were sampled from, so there is still only one source of truth for
 * the shape, and only one element on the page.
 */
export default function AboutArrival() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const status = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const el = host.current;
      const cnv = canvas.current;
      if (!el || !cnv) return;

      /*
        Bail out entirely under reduced motion.

        globals.css already hides [data-scene] and collapses the band to auto
        height, so the scene is not on screen — but the CSS cannot stop the
        rAF loop, and without this guard the whole simulation would keep
        running against a display:none canvas (whose getBoundingClientRect is
        0x0, so it would not even be measurable). The readout below stays, and
        the crossing degrades to its chapter handoff, which is the part that
        actually carries meaning.
      */
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const c2d = cnv.getContext('2d');
      if (!c2d) return;

      /*
        Seeded xorshift, not Math.random.

        Same reasoning as DeepField's field: a remount would otherwise
        reshuffle every point and the composition would be different on every
        visit. Seeded means this particular scatter was chosen.
      */
      let seed = 0x6d2b79f5;
      const rand = () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return ((seed >>> 0) % 100000) / 100000;
      };

      // ── Build the point cloud ────────────────────────────────────────
      const narrow = window.innerWidth < 768;
      const EDGE_COUNT = narrow ? 80 : 132;
      const FILL_COUNT = narrow ? 54 : 92;

      const points: Point[] = [];

      /*
        Outline points come from measuring the real path rather than from a
        hand-typed array: getTotalLength/getPointAtLength give an even
        distribution along the actual curve, and the shape stays editable as
        one `d` string.
      */
      const svgNS = 'http://www.w3.org/2000/svg';
      const measureSvg = document.createElementNS(svgNS, 'svg');
      measureSvg.setAttribute('width', '0');
      measureSvg.setAttribute('height', '0');
      measureSvg.style.position = 'absolute';
      measureSvg.style.opacity = '0';
      measureSvg.style.pointerEvents = 'none';
      const measurePath = document.createElementNS(svgNS, 'path');
      measurePath.setAttribute('d', BUST_PATH);
      measureSvg.appendChild(measurePath);
      document.body.appendChild(measureSvg);

      const total = measurePath.getTotalLength();
      for (let i = 0; i < EDGE_COUNT; i++) {
        const at = measurePath.getPointAtLength((i / EDGE_COUNT) * total);
        points.push({
          tx: at.x,
          ty: at.y,
          sx: 0,
          sy: 0,
          speed: 0.4 + rand() * 0.9,
          phase: rand() * Math.PI * 2,
          edge: true,
        });
      }
      document.body.removeChild(measureSvg);

      /*
        Interior points are rejection-sampled against the same path via
        isPointInPath, so "inside the portrait" is decided by the shape itself
        — no second silhouette to keep in sync with the first.
      */
      const bust = new Path2D(BUST_PATH);
      let guard = 0;
      while (points.length < EDGE_COUNT + FILL_COUNT && guard < 6000) {
        guard++;
        const x = rand() * DESIGN_W;
        const y = rand() * DESIGN_H;
        if (!c2d.isPointInPath(bust, x, y)) continue;
        points.push({
          tx: x,
          ty: y,
          sx: 0,
          sy: 0,
          speed: 0.4 + rand() * 0.9,
          phase: rand() * Math.PI * 2,
          edge: false,
        });
      }

      // Scatter origins: well outside the bust so points visibly travel in.
      for (const p of points) {
        p.sx = lerp(-260, DESIGN_W + 260, rand());
        p.sy = lerp(-160, DESIGN_H + 160, rand());
      }

      // ── Canvas sizing ────────────────────────────────────────────────
      let scale = 1;
      let offX = 0;
      let offY = 0;
      let dpr = 1;

      const measure = () => {
        const rect = cnv.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        // Capped at 2: past that the fill rate cost is real and the dots are
        // already sub-pixel crisp.
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cnv.width = Math.round(rect.width * dpr);
        cnv.height = Math.round(rect.height * dpr);
        // Fit the bust to ~62% of the stage height, centred.
        scale = ((rect.height * 0.62) / DESIGN_H) * dpr;
        offX = (cnv.width - DESIGN_W * scale) / 2;
        offY = (cnv.height - DESIGN_H * scale) / 2;
      };

      measure();
      window.addEventListener('resize', measure);

      // ── Scroll ───────────────────────────────────────────────────────
      const progress = { value: 0 };

      const trigger = ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        invalidateOnRefresh: true,
        onRefresh: (self) => {
          measure();
          progress.value = self.progress;
        },
        onUpdate: (self) => (progress.value = self.progress),
      });

      let statusWord = '';
      const setStatus = (word: string) => {
        if (word === statusWord) return;
        statusWord = word;
        if (status.current) status.current.textContent = word;
      };

      const draw = (p: number, time: number) => {
        const w = cnv.width;
        const h = cnv.height;
        c2d.clearRect(0, 0, w, h);

        const drift = phase(p, 0, DRIFT_END);
        const sweep = phase(p, DRIFT_END, SWEEP_END);
        const resolve = phase(p, SWEEP_END, RESOLVE_END);
        const locked = phase(p, RESOLVE_END, LOCK_END);
        const clear = phase(p, LOCK_END, 1);

        setStatus(
          clear > 0.35
            ? 'CLEARED'
            : locked > 0.2
              ? 'IDENTITY LOCKED'
              : resolve > 0.05
                ? 'RESOLVING'
                : sweep > 0.02
                  ? 'SCANNING'
                  : 'ACQUIRING',
        );

        // The bar's position in design space. It runs a little past both edges
        // so the first and last points get a clean pass rather than starting
        // or ending already lit.
        const barX = lerp(-60, DESIGN_W + 60, smoothstep(sweep));
        const fade = 1 - smoothstep(clear);

        // ── Points ───────────────────────────────────────────────────
        for (const pt of points) {
          /*
            Lock is per-point and keyed to the bar: a point is fully assembled
            once the bar is 46 units past it, and untouched while the bar is
            still 22 units short. That short overlap is what makes the cloud
            fold into the face in the bar's wake instead of all at once.
          */
          const lock = smoothstep((barX - pt.tx + 22) / 68);

          // Idle drift while unlocked, easing to nothing as the point settles.
          const wobble = (1 - lock) * 14;
          const wx = Math.sin(time * pt.speed + pt.phase) * wobble;
          const wy = Math.cos(time * pt.speed * 0.8 + pt.phase) * wobble;

          const x = lerp(pt.sx, pt.tx, lock) + wx;
          const y = lerp(pt.sy, pt.ty, lock) + wy;

          const cx = offX + x * scale;
          const cy = offY + y * scale;

          // Bright right at the bar, settling to a steady value behind it —
          // the flash of acquisition, not a uniform fade-up.
          const atBar = Math.exp(-Math.pow((pt.tx - barX) / 34, 2));
          const alpha =
            (lerp(0.16, pt.edge ? 0.9 : 0.5, lock) + atBar * 0.55) *
            (0.35 + 0.65 * drift) *
            fade;

          if (alpha <= 0.004) continue;

          const size = (pt.edge ? 1.9 : 1.5) * dpr * (1 + atBar * 0.9);
          c2d.globalAlpha = Math.min(1, alpha);
          c2d.fillStyle = atBar > 0.35 ? '#ffffff' : pt.edge ? '#aeb6c6' : '#a89882';
          c2d.fillRect(cx - size / 2, cy - size / 2, size, size);
        }

        // ── Outline ──────────────────────────────────────────────────
        if (resolve > 0) {
          c2d.save();
          c2d.translate(offX, offY);
          c2d.scale(scale, scale);
          c2d.globalAlpha = smoothstep(resolve) * 0.85 * fade;
          c2d.strokeStyle = '#aeb6c6';
          c2d.lineWidth = 1.6 / scale;
          /*
            Dash the whole perimeter and retract the offset, so the outline is
            drawn rather than faded on. lineDashOffset counts in user units,
            which is why this is set inside the scaled transform.
          */
          const perimeter = total;
          c2d.setLineDash([perimeter, perimeter]);
          c2d.lineDashOffset = perimeter * (1 - smoothstep(resolve));
          c2d.stroke(bust);
          c2d.setLineDash([]);

          // Interior wash once it is locked: gives the silhouette a body so it
          // stops reading as a wire loop with dots inside it.
          if (locked > 0) {
            c2d.globalAlpha = smoothstep(locked) * 0.1 * fade;
            c2d.fillStyle = '#aeb6c6';
            c2d.fill(bust);
          }
          c2d.restore();
        }

        // ── The scan bar ─────────────────────────────────────────────
        if (sweep > 0 && sweep < 1) {
          const bx = offX + barX * scale;
          const top = offY;
          const height = DESIGN_H * scale;
          const glow = c2d.createLinearGradient(bx - 26 * dpr, 0, bx + 26 * dpr, 0);
          glow.addColorStop(0, 'rgba(75,225,255,0)');
          glow.addColorStop(0.5, 'rgba(75,225,255,0.5)');
          glow.addColorStop(1, 'rgba(75,225,255,0)');
          c2d.globalAlpha = fade;
          c2d.fillStyle = glow;
          c2d.fillRect(bx - 26 * dpr, top, 52 * dpr, height);
          c2d.fillStyle = 'rgba(215,245,255,0.9)';
          c2d.fillRect(bx - 0.75 * dpr, top, 1.5 * dpr, height);
        }

        // ── Registration marks ───────────────────────────────────────
        if (locked > 0) {
          const a = smoothstep(locked);
          c2d.globalAlpha = a * 0.75 * fade;
          c2d.strokeStyle = '#a89882';
          c2d.lineWidth = 1 * dpr;
          const pad = 26 * dpr;
          const arm = 16 * dpr;
          const bx0 = offX + 40 * scale - pad;
          const bx1 = offX + 360 * scale + pad;
          const by0 = offY + 58 * scale - pad;
          const by1 = offY + 462 * scale + pad;
          // Four corner brackets, drawn as one path.
          c2d.beginPath();
          c2d.moveTo(bx0, by0 + arm); c2d.lineTo(bx0, by0); c2d.lineTo(bx0 + arm, by0);
          c2d.moveTo(bx1 - arm, by0); c2d.lineTo(bx1, by0); c2d.lineTo(bx1, by0 + arm);
          c2d.moveTo(bx1, by1 - arm); c2d.lineTo(bx1, by1); c2d.lineTo(bx1 - arm, by1);
          c2d.moveTo(bx0 + arm, by1); c2d.lineTo(bx0, by1); c2d.lineTo(bx0, by1 - arm);
          c2d.stroke();
        }

        c2d.globalAlpha = 1;
      };

      /*
        One rAF loop, gated to when the band is anywhere near the viewport.

        Kept from the previous implementation because the reasoning still
        holds: this is a decorative crossing, and it must not hold a frame
        budget open while the viewer is three sections away from it.
      */
      let raf = 0;
      let running = false;
      const t0 = performance.now();

      const tick = () => {
        raf = requestAnimationFrame(tick);
        draw(progress.value, (performance.now() - t0) / 1000);
      };

      const startLoop = () => {
        if (running) return;
        running = true;
        raf = requestAnimationFrame(tick);
      };
      const stopLoop = () => {
        if (!running) return;
        running = false;
        cancelAnimationFrame(raf);
      };

      const gate = ScrollTrigger.create({
        trigger: el,
        start: 'top bottom+=50%',
        end: 'bottom top-=50%',
        onToggle: (self) => (self.isActive ? startLoop() : stopLoop()),
      });

      if (gate.isActive) startLoop();

      return () => {
        stopLoop();
        window.removeEventListener('resize', measure);
        trigger.kill();
        gate.kill();
      };
    }, host);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={host}
      /*
        Decorative. The acquisition carries no information the About section
        below does not state in text, and the chapter numbers in the readout
        are duplicated by its eyebrow.
      */
      aria-hidden="true"
      /*
        svh, not vh, and it must MATCH the sticky child's unit — on mobile vh
        is the large viewport and svh the small one, so mixing them makes the
        sticky travel silently change size the moment the URL bar collapses
        and ScrollTrigger re-measures mid-scroll.
      */
      className="about-arrival relative h-[150svh] md:h-[220svh]"
    >
      <div
        data-stage
        className="mask-fade-y [--fade-start:9%] [--fade-end:91%] sticky top-0 h-[100svh] overflow-hidden"
      >
        {/* Grouped so the reduced-motion rule in globals.css can drop the
            whole scene with one selector. */}
        <div data-scene className="absolute inset-0">
          {/* The volume the subject is captured in. */}
          <div
            className="absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(139,123,255,0.07) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(139,123,255,0.07) 1px, transparent 1px)
              `,
              backgroundSize: '54px 54px',
            }}
          />
          <div className="absolute left-1/2 top-1/2 size-[62vw] max-w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/12 blur-[130px]" />

          <canvas ref={canvas} className="absolute inset-0 size-full" />
        </div>

        {/* ── Readout, same grammar as every other crossing ─────────────── */}
        <div
          data-readout
          className="absolute inset-x-0 bottom-8 mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-5 font-mono text-[0.6rem] uppercase tracking-[0.28em] sm:px-8"
        >
          <span className="whitespace-nowrap text-text-muted">
            <span className="text-text-muted/60">04</span>
            <span className="mx-2 text-text-muted/40">/</span>
            Research &amp; Development
          </span>
          <span ref={status} className="text-steel transition-colors duration-300">
            ACQUIRING
          </span>
          <span className="ml-auto whitespace-nowrap text-text">
            <span className="text-accent-soft">05</span>
            <span className="mx-2 text-text-muted/40">/</span>
            Profile
          </span>
        </div>
      </div>
    </div>
  );
}
