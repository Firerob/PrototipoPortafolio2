'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

/*
  ── Beat map ────────────────────────────────────────────────────────────────

    rise     0.00 → 0.16   the unit comes up out of the floor at the seam
    plant    0.16 → 0.30   hands find the seam, stance drops, bolts light
    strain   0.30 → 0.62   the push. Gap grows to the arms' actual reach.
    breach   0.62 → 0.88   the doors let go and fly; the unit holds follow-through
    clear    0.88 → 1.00   figure sinks into the light, About is open

  The split between strain and breach is not decoration, it is the fix for a
  real constraint: the arms reach 212 figure units, which is about a third of
  a 1440px viewport. Locking the hands to the doors for the WHOLE travel is
  therefore impossible. So the unit opens the gap as far as it physically can,
  and at that exact limit the doors break loose and accelerate away on their
  own. The reach limit becomes the story beat.
*/
const RISE_END = 0.16;
const PLANT_END = 0.3;
const STRAIN_END = 0.62;
const BREACH_END = 0.88;

/** Figure viewBox. Ground line at 540; everything is authored against it. */
const FIG_W = 400;
const FIG_H = 560;
const MID = FIG_W / 2;
const GROUND = 540;

/*
  Bone lengths, in figure units, and they are not arbitrary.

  The first pass had legs of 78 + 76 = 154 trying to cover the 210 units from
  the hip down to the ground. Every frame the IK clamped to full extension and
  drew two straight sticks that never touched the floor — the figure looked
  like it was hovering. Legs now total 212 against a 204-unit drop, so they
  reach with a little bend to spare and the crouch has somewhere to go.

  Arms total 168 from a shoulder 48 off the centre line, which sets REACH at
  210 units. That in turn is what decides how far the unit can force the doors
  before they have to break loose — roughly a third of a 1440px viewport.
*/
const UPPER_ARM = 86;
const FOREARM = 82;
const THIGH = 108;
const SHIN = 104;

const SHOULDER_SPREAD = 48;
const HIP_SPREAD = 24;
/** Rest positions; the stance moves both down as the load comes on. */
const SHOULDER_Y = 218;
const HIP_Y = 330;
/** Horizontal reach of a hand from the figure's centre line, fully extended. */
const REACH = SHOULDER_SPREAD + UPPER_ARM + FOREARM - 4;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const phase = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/**
 * Two-bone IK, closed form.
 *
 * Returns the joint position for a chain rooted at (sx, sy) whose tip should
 * land on (tx, ty). `bend` picks which of the two mirror solutions to use —
 * arms bend their elbows down and out, legs bend their knees out and forward,
 * which is opposite signs per side.
 *
 * Worth the fifteen lines rather than keyframing arm angles: the whole point
 * of the shot is that the hands are ON the doors, and any hand position the
 * choreography asks for is solvable exactly instead of approximated.
 */
function solveJoint(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  l1: number,
  l2: number,
  bend: 1 | -1,
): { x: number; y: number } {
  const dx = tx - sx;
  const dy = ty - sy;
  // Clamped so an out-of-reach target degrades to a straight limb pointing at
  // it, rather than producing NaN from acos of something greater than 1.
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const base = Math.atan2(dy, dx);
  const cos = (d * d + l1 * l1 - l2 * l2) / (2 * d * l1);
  const angle = base + bend * Math.acos(Math.min(1, Math.max(-1, cos)));
  return { x: sx + l1 * Math.cos(angle), y: sy + l1 * Math.sin(angle) };
}

/*
  Limb specs: [ref key, mass stroke width]. Rendered twice each — see `rims`.
  Declared at module scope so the two passes cannot drift out of step.
*/
const LEGS = [
  ['thighL', 30],
  ['shinL', 24],
  ['thighR', 30],
  ['shinR', 24],
] as const satisfies readonly (readonly [string, number])[];

const ARMS = [
  ['upperL', 28],
  ['foreL', 23],
  ['upperR', 28],
  ['foreR', 23],
] as const satisfies readonly (readonly [string, number])[];

/** Bolts down the seam. Fractions of the stage height. */
const BOLTS = [0.13, 0.27, 0.41, 0.55, 0.69, 0.83];

/**
 * One door's surface treatment.
 *
 * `side` is which side of the stage the door sits on, so `edge` is its INNER
 * edge — the one that meets the seam and catches the light.
 */
function DoorFace({ side }: { side: 'left' | 'right' }) {
  const edge = side === 'left' ? 'right-0' : 'left-0';
  const inset = side === 'left' ? 'right-[7px]' : 'left-[7px]';
  const rail = side === 'left' ? 'right-[18px]' : 'left-[18px]';

  return (
    <>
      {/* Ribs. Wide spacing and low contrast — enough to say "panel", not so
          much that the door competes with the figure in front of it. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(232,234,242,0.055) 0px, rgba(232,234,242,0.055) 1px, transparent 1px, transparent 64px)',
        }}
      />
      {/* Bevel: the face angles toward the seam, so it is brighter there. */}
      <div
        className={`absolute inset-y-0 ${edge} w-32 ${
          side === 'left'
            ? 'bg-gradient-to-l from-white/[0.055]'
            : 'bg-gradient-to-r from-white/[0.055]'
        } to-transparent`}
      />
      <span className={`absolute inset-y-0 ${edge} w-px bg-accent-soft/70`} />
      <span className={`absolute inset-y-0 ${inset} w-px bg-white/[0.09]`} />
      {/* Rail of ticks, the mechanical detail that makes it a door and not a
          rectangle. Rendered once as a repeating gradient, not 22 nodes. */}
      <div
        className={`absolute inset-y-0 ${rail} w-[3px]`}
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(139,123,255,0.5) 0px, rgba(139,123,255,0.5) 6px, transparent 6px, transparent 34px)',
        }}
      />
    </>
  );
}

/**
 * The news → about crossing: the screen is pried open.
 *
 * A hard-surface figure rises at the centre seam, plants both hands on it and
 * forces the page apart; About is behind it.
 *
 * SVG rather than a fourth WebGL context. The page already runs three (two R3F
 * canvases plus the fluid sim, which FluidBackground calls out by name), and
 * ProjectsIndex is built from DOM for exactly this reason. A vector silhouette
 * is also simply the better-looking option here: it stays crisp at any
 * resolution, costs no shader compile, and a stylised backlit cutout reads far
 * more convincingly than an untextured procedural mannequin would.
 *
 * The figure is a real rig — shoulders, elbows, hips, knees solved by IK every
 * frame — not a sequence of drawn poses. One `halfGap` value positions the
 * doors AND supplies the hand targets, so the grip cannot drift off the edge
 * it is supposed to be holding.
 */
export default function AboutArrival() {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const interior = useRef<HTMLDivElement>(null);
  const spill = useRef<HTMLDivElement>(null);
  const boltWrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const figure = useRef<SVGGElement>(null);
  const body = useRef<SVGGElement>(null);
  const coat = useRef<SVGPolygonElement>(null);
  const visor = useRef<SVGRectElement>(null);
  const limbs = useRef<Record<string, SVGLineElement | null>>({});
  /*
    Every limb is drawn twice: a wider accent-coloured line underneath and the
    near-black mass on top, which leaves a lit outline.

    The plates got their rim for free from the polygon `stroke`, but a <line>
    has only one stroke and it is the mass, so the arms and legs had no edge at
    all. Against the dark stage they simply vanished — the first capture read
    as a floating chest with two gauntlets and no arms between them. Backlit
    silhouettes live or die on the rim.
  */
  const rims = useRef<Record<string, SVGLineElement | null>>({});
  const joints = useRef<Record<string, SVGCircleElement | null>>({});
  const hands = useRef<Record<string, SVGRectElement | null>>({});
  const fromLabel = useRef<HTMLSpanElement>(null);
  const toLabel = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const el = host.current;
        if (!el) return;

        const progress = { value: 0 };
        /*
          Figure units per CSS pixel. The SVG scales with the viewport, so the
          conversion between "how far apart the doors are in px" and "where the
          hand goes in the viewBox" has to be re-measured, not assumed — a hand
          target computed against a stale width detaches from the door edge on
          every resize.
        */
        let unitsPerPx = 1;
        let stageWidth = 1440;

        const measure = () => {
          const rect = svg.current?.getBoundingClientRect();
          if (rect && rect.width > 0) unitsPerPx = FIG_W / rect.width;
          stageWidth = stage.current?.clientWidth ?? window.innerWidth;
        };
        measure();

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

        const bolts = Array.from(
          boltWrap.current?.querySelectorAll<HTMLElement>('[data-bolt]') ?? [],
        );

        let raf = 0;
        let last = -1;
        let breached: boolean | null = null;

        const setLine = (
          key: string,
          x1: number,
          y1: number,
          x2: number,
          y2: number,
        ) => {
          const a = x1.toFixed(2);
          const b = y1.toFixed(2);
          const c = x2.toFixed(2);
          const d = y2.toFixed(2);
          for (const node of [limbs.current[key], rims.current[key]]) {
            if (!node) continue;
            node.setAttribute('x1', a);
            node.setAttribute('y1', b);
            node.setAttribute('x2', c);
            node.setAttribute('y2', d);
          }
        };

        const setJoint = (key: string, x: number, y: number) => {
          const node = joints.current[key];
          if (!node) return;
          node.setAttribute('cx', x.toFixed(2));
          node.setAttribute('cy', y.toFixed(2));
        };

        const draw = () => {
          raf = requestAnimationFrame(draw);

          const p = progress.value;
          if (Math.abs(p - last) < 0.0004) return;
          last = p;

          const rise = smoothstep(phase(p, 0, RISE_END));
          const plant = smoothstep(phase(p, RISE_END, PLANT_END));
          const strain = phase(p, PLANT_END, STRAIN_END);
          const breach = phase(p, STRAIN_END, BREACH_END);
          const clear = smoothstep(phase(p, BREACH_END, 1));

          // ── The opening ─────────────────────────────────────────────────
          const reachPx = (REACH - 6) / unitsPerPx;
          /*
            Strain is eased with a decelerating curve and breach with an
            accelerating one, which is the whole feel of the beat: the last
            centimetres of the push are the slowest, and the moment the doors
            give they are the fastest.
          */
          const strained = reachPx * (1 - Math.pow(1 - strain, 2.4));
          const flung = (stageWidth * 0.58 + 60 - reachPx) * Math.pow(breach, 2.1);
          const halfGap = strained + flung;

          if (left.current) left.current.style.transform = `translate3d(${(-halfGap).toFixed(1)}px,0,0)`;
          if (right.current) right.current.style.transform = `translate3d(${halfGap.toFixed(1)}px,0,0)`;

          // Light behind the doors, and the wash it throws onto their faces.
          const open = clamp01(halfGap / (stageWidth * 0.5));
          if (interior.current) {
            interior.current.style.opacity = (0.25 + 0.75 * smoothstep(open * 1.6)).toFixed(3);
          }
          if (spill.current) {
            spill.current.style.opacity = (smoothstep(clamp01(strain * 1.4)) * 0.9).toFixed(3);
          }

          // Bolts hold, then let go all at once at the breach.
          bolts.forEach((bolt, i) => {
            const gone = smoothstep(clamp01((breach - i * 0.02) * 3));
            bolt.style.opacity = ((0.25 + plant * 0.75) * (1 - gone)).toFixed(3);
            bolt.style.transform = `translate3d(0, ${(gone * (i % 2 ? -60 : 70)).toFixed(1)}px, 0) scale(${(1 + gone * 1.8).toFixed(2)})`;
          });

          // ── The unit ────────────────────────────────────────────────────
          if (figure.current) {
            // Rises out of the floor, then sinks into the light at the end.
            const y = (1 - rise) * 190 + clear * 120;
            figure.current.setAttribute(
              'transform',
              `translate(0 ${y.toFixed(1)})`,
            );
            figure.current.setAttribute('opacity', (rise * (1 - clear)).toFixed(3));
          }

          // Stance: drops and widens as it takes the load, recoils on breach.
          const load = plant * (0.35 + 0.65 * strain);
          const crouch = load * 42 - breach * 10;
          const hipY = HIP_Y + crouch;
          const shoulderY = SHOULDER_Y + crouch * 1.25;
          const footSpread = lerp(48, 96, load);
          const leanBack = breach * 10;

          const shoulderL = MID - SHOULDER_SPREAD;
          const shoulderR = MID + SHOULDER_SPREAD;

          /*
            Hand targets.

            During strain they ARE the door edges, converted into figure units.
            Past the reach limit they stop tracking and hold the extended pose —
            the doors have left, and an arm that kept stretching after them
            would be the tell that none of this is really connected.
          */
          const handX = Math.min(halfGap * unitsPerPx, REACH - 6);
          /*
            Hands sit BELOW the shoulder line, not above it.

            At shoulder height minus 14 the elbows had to drop a long way to
            solve, and the early frames read as a shrug rather than a brace.
            Pushing from chest height puts the elbow behind and under the hand,
            which is where it goes when a person actually leans into something.
          */
          const handY = shoulderY + 16 - plant * 4 + breach * 8;

          const elbowL = solveJoint(
            shoulderL,
            shoulderY,
            MID - handX,
            handY,
            UPPER_ARM,
            FOREARM,
            -1,
          );
          const elbowR = solveJoint(
            shoulderR,
            shoulderY,
            MID + handX,
            handY,
            UPPER_ARM,
            FOREARM,
            1,
          );

          setLine('upperL', shoulderL, shoulderY, elbowL.x, elbowL.y);
          setLine('foreL', elbowL.x, elbowL.y, MID - handX, handY);
          setLine('upperR', shoulderR, shoulderY, elbowR.x, elbowR.y);
          setLine('foreR', elbowR.x, elbowR.y, MID + handX, handY);
          setJoint('elbowL', elbowL.x, elbowL.y);
          setJoint('elbowR', elbowR.x, elbowR.y);

          /*
            Gauntlets sit mostly INSIDE the opening with a few units lapping
            over the door edge, which is what a grip looks like. Centring them
            on the hand point instead leaves the plate floating in the gap.
          */
          const handL = hands.current.left;
          if (handL) {
            handL.setAttribute('x', (MID - handX - 16).toFixed(2));
            handL.setAttribute('y', (handY - 19).toFixed(2));
          }
          const handR = hands.current.right;
          if (handR) {
            handR.setAttribute('x', (MID + handX - 6).toFixed(2));
            handR.setAttribute('y', (handY - 19).toFixed(2));
          }

          // Legs. Knees break outward, which is what makes a braced stance
          // read as bracing rather than as standing with bent legs.
          const kneeL = solveJoint(
            MID - HIP_SPREAD,
            hipY,
            MID - footSpread,
            GROUND,
            THIGH,
            SHIN,
            1,
          );
          const kneeR = solveJoint(
            MID + HIP_SPREAD,
            hipY,
            MID + footSpread,
            GROUND,
            THIGH,
            SHIN,
            -1,
          );
          setLine('thighL', MID - HIP_SPREAD, hipY, kneeL.x, kneeL.y);
          setLine('shinL', kneeL.x, kneeL.y, MID - footSpread, GROUND);
          setLine('thighR', MID + HIP_SPREAD, hipY, kneeR.x, kneeR.y);
          setLine('shinR', kneeR.x, kneeR.y, MID + footSpread, GROUND);
          setJoint('kneeL', kneeL.x, kneeL.y);
          setJoint('kneeR', kneeR.x, kneeR.y);
          setJoint('footL', MID - footSpread, GROUND);
          setJoint('footR', MID + footSpread, GROUND);

          // Torso + head ride the stance and tip back on the recoil.
          if (body.current) {
            body.current.setAttribute(
              'transform',
              `translate(0 ${crouch.toFixed(1)}) rotate(${(-leanBack * 0.25).toFixed(2)} ${MID} ${hipY.toFixed(1)})`,
            );
          }
          /*
            The cape.

            Thigh length and notched at the hem, and drawn BEHIND the legs
            rather than in front. As a full-length polygon on top it covered
            both legs completely and the silhouette read as a robed figure in a
            dress — the single worst thing about the first pass. Behind the
            legs it does the one job it is there for: widening the mass under
            load without eating the stance.
          */
          if (coat.current) {
            const hem = lerp(74, 112, load);
            const top = 214 + crouch;
            coat.current.setAttribute(
              'points',
              [
                `${MID - 42},${top}`,
                `${MID + 42},${top}`,
                `${MID + hem},${GROUND - 128}`,
                `${MID + hem * 0.55},${GROUND - 96}`,
                `${MID},${GROUND - 132}`,
                `${MID - hem * 0.55},${GROUND - 96}`,
                `${MID - hem},${GROUND - 128}`,
              ].join(' '),
            );
          }
          if (visor.current) {
            // Brightens under load, flares at the breach.
            visor.current.setAttribute(
              'opacity',
              (0.45 + load * 0.4 + Math.sin(Math.PI * breach) * 0.15).toFixed(3),
            );
          }

          // ── Readout ─────────────────────────────────────────────────────
          const h = phase(p, 0.12, 0.9);
          if (fromLabel.current) {
            fromLabel.current.style.opacity = (1 - smoothstep(h / 0.4)).toFixed(3);
          }
          if (toLabel.current) {
            const inbound = smoothstep(phase(h, 0.45, 1));
            toLabel.current.style.opacity = inbound.toFixed(3);
            toLabel.current.style.transform = `translate3d(${((1 - inbound) * 14).toFixed(1)}px,0,0)`;
          }
          const nowBreached = p > STRAIN_END;
          if (status.current && nowBreached !== breached) {
            breached = nowBreached;
            status.current.textContent = nowBreached ? 'BREACHED' : 'SEAL // STRAIN';
            status.current.className = nowBreached
              ? 'text-cyan transition-colors duration-300'
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
        const onResize = () => measure();
        window.addEventListener('resize', onResize);

        return () => {
          stopLoop();
          gate.kill();
          window.removeEventListener('resize', onResize);
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
        Decorative. The figure and the doors carry no information the About
        section below does not state in text, and the chapter numbers are
        duplicated by its eyebrow.
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
        scroll, because a phone screen is tall and narrow, and 120svh of
        decorative travel on a touch device is a long way to swipe.
      */
      className="about-arrival relative h-[150svh] md:h-[220svh]"
    >
      <div ref={stage} data-stage className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Everything that only exists while the doors are moving, grouped so
            the reduced-motion rule can drop it in one selector. */}
        <div data-scene className="absolute inset-0">
        {/* ── Behind the doors ──────────────────────────────────────────── */}
        <div ref={interior} className="absolute inset-0 opacity-25">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(139,123,255,0.10) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(139,123,255,0.10) 1px, transparent 1px)
              `,
              backgroundSize: '54px 54px',
            }}
          />
          {/* The light source the figure is silhouetted against. */}
          <div className="absolute left-1/2 top-1/2 size-[70vw] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-[120px]" />
          <div className="absolute left-1/2 top-1/2 h-[80svh] w-[22vw] -translate-x-1/2 -translate-y-1/2 bg-cyan/10 blur-[90px]" />
        </div>

        {/*
          The doors.

          Slightly wider than half so their meeting edges overlap by a pixel —
          at exactly 50% a subpixel viewport width leaves a permanent bright
          hairline down the middle before anything has opened.

          They are bg-ink rather than bg-void and carry a bevel, ribs and a
          rail of ticks. The first version painted them the same colour as the
          page with 4.5%-alpha panel lines, and the result was that nothing
          read as a door at all — only a bright gap grew in the middle of a
          black screen. A door has to be visible BEFORE it opens or the opening
          is not an event.
        */}
        <div
          ref={left}
          className="absolute inset-y-0 left-0 w-[50.5%] bg-ink will-change-transform"
        >
          <DoorFace side="left" />
        </div>
        <div
          ref={right}
          className="absolute inset-y-0 left-[49.5%] w-[50.5%] bg-ink will-change-transform"
        >
          <DoorFace side="right" />
        </div>

        {/* Light spilling onto the inner faces. Sits above the doors and below
            the figure, and is masked to the centre so it tracks the opening. */}
        <div
          ref={spill}
          className="pointer-events-none absolute inset-y-0 left-1/2 w-[46vw] -translate-x-1/2 opacity-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(139,123,255,0.45) 0%, rgba(75,225,255,0.18) 45%, transparent 72%)',
          }}
        />

        {/* Seam bolts */}
        <div ref={boltWrap} className="pointer-events-none absolute inset-0">
          {BOLTS.map((y) => (
            <span
              key={y}
              data-bolt
              className="absolute left-1/2 -translate-x-1/2 font-mono text-[0.7rem] leading-none text-accent-soft opacity-25"
              style={{ top: `${y * 100}%` }}
            >
              +
            </span>
          ))}
        </div>

        {/* ── The unit ──────────────────────────────────────────────────── */}
        <svg
          ref={svg}
          className="absolute bottom-[6%] left-1/2 h-[72svh] -translate-x-1/2"
          viewBox={`0 0 ${FIG_W} ${FIG_H}`}
          focusable="false"
        >
          {/*
            Paint order is the character design here, so it is worth stating:
            cape, then legs, then torso, then arms. Back to front. The cape was
            originally inside the body group, which put it in FRONT of the legs
            and turned the whole figure into a robe.
          */}
          <g ref={figure} opacity="0">
            <polygon
              ref={coat}
              points=""
              fill="#0b0b16"
              stroke="rgba(139,123,255,0.28)"
              strokeWidth="1.5"
            />

            {LEGS.map(([key, width]) => (
              <line
                key={`${key}-rim`}
                ref={(n) => {
                  rims.current[key] = n;
                }}
                stroke="rgba(139,123,255,0.55)"
                strokeWidth={width + 4}
                strokeLinecap="round"
              />
            ))}
            {LEGS.map(([key, width]) => (
              <line
                key={key}
                ref={(n) => {
                  limbs.current[key] = n;
                }}
                stroke="#07070d"
                strokeWidth={width}
                strokeLinecap="round"
              />
            ))}
            {(['kneeL', 'kneeR', 'footL', 'footR'] as const).map((key) => (
              <circle
                key={key}
                ref={(n) => {
                  joints.current[key] = n;
                }}
                r={key.startsWith('foot') ? 14 : 12}
                fill="#07070d"
                stroke="rgba(139,123,255,0.5)"
                strokeWidth="1.5"
              />
            ))}

            <g ref={body}>
              {/* Pelvis */}
              <polygon
                points={`${MID - 34},312 ${MID + 34},312 ${MID + 28},352 ${MID - 28},352`}
                fill="#07070d"
                stroke="rgba(139,123,255,0.45)"
                strokeWidth="1.5"
              />
              {/* Chest: broad at the shoulders, tapering to the waist. */}
              <polygon
                points={`${MID - 50},206 ${MID + 50},206 ${MID + 36},318 ${MID - 36},318`}
                fill="#08080f"
                stroke="rgba(139,123,255,0.55)"
                strokeWidth="2"
              />
              {/* Pauldrons. The mass that makes a silhouette read as armoured
                  rather than as a stick figure with a box for a chest. */}
              <polygon
                points={`${MID - 68},214 ${MID - 52},198 ${MID - 30},202 ${MID - 34},238 ${MID - 62},236`}
                fill="#0a0a14"
                stroke="rgba(139,123,255,0.6)"
                strokeWidth="2"
              />
              <polygon
                points={`${MID + 68},214 ${MID + 52},198 ${MID + 30},202 ${MID + 34},238 ${MID + 62},236`}
                fill="#0a0a14"
                stroke="rgba(139,123,255,0.6)"
                strokeWidth="2"
              />
              {/* Core light */}
              <circle cx={MID} cy={262} r={10} fill="#4be1ff" opacity="0.55" />
              <circle cx={MID} cy={262} r={19} fill="none" stroke="#4be1ff" strokeWidth="1" opacity="0.35" />
              {/* Neck, so the helmet is attached to something. */}
              <rect x={MID - 13} y={186} width={26} height={26} fill="#07070d" />
              {/* Helmet */}
              <polygon
                points={`${MID - 31},196 ${MID - 34},146 ${MID - 18},124 ${MID + 18},124 ${MID + 34},146 ${MID + 31},196`}
                fill="#07070d"
                stroke="rgba(139,123,255,0.65)"
                strokeWidth="2"
              />
              {/* Visor */}
              <rect
                ref={visor}
                x={MID - 25}
                y={150}
                width={50}
                height={12}
                fill="#4be1ff"
                opacity="0.45"
              />
              <rect
                x={MID - 25}
                y={150}
                width={50}
                height={12}
                fill="none"
                stroke="#4be1ff"
                strokeWidth="1"
                opacity="0.7"
              />
            </g>

            {/* Arms last: they pass in front of the chest. */}
            {ARMS.map(([key, width]) => (
              <line
                key={`${key}-rim`}
                ref={(n) => {
                  rims.current[key] = n;
                }}
                stroke="rgba(139,123,255,0.6)"
                strokeWidth={width + 4}
                strokeLinecap="round"
              />
            ))}
            {ARMS.map(([key, width]) => (
              <line
                key={key}
                ref={(n) => {
                  limbs.current[key] = n;
                }}
                stroke="#07070d"
                strokeWidth={width}
                strokeLinecap="round"
              />
            ))}
            {(['elbowL', 'elbowR'] as const).map((key) => (
              <circle
                key={key}
                ref={(n) => {
                  joints.current[key] = n;
                }}
                r={12}
                fill="#07070d"
                stroke="rgba(139,123,255,0.5)"
                strokeWidth="1.5"
              />
            ))}
            {/* Gauntlets, drawn as plates against the door edge they grip. */}
            <rect
              ref={(n) => {
                hands.current.left = n;
              }}
              width={22}
              height={38}
              rx={3}
              fill="#08080f"
              stroke="#4be1ff"
              strokeWidth="1.5"
              opacity="0.9"
            />
            <rect
              ref={(n) => {
                hands.current.right = n;
              }}
              width={22}
              height={38}
              rx={3}
              fill="#08080f"
              stroke="#4be1ff"
              strokeWidth="1.5"
              opacity="0.9"
            />
          </g>
        </svg>
        </div>

        {/* ── Readout, same grammar as every other crossing ─────────────── */}
        <div
          data-readout
          className="absolute inset-x-0 bottom-8 mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-5 font-mono text-[0.6rem] uppercase tracking-[0.28em] sm:px-8"
        >
          <span ref={fromLabel} className="whitespace-nowrap text-text-muted">
            <span className="text-text-muted/60">04</span>
            <span className="mx-2 text-text-muted/40">/</span>
            Transmission Feed
          </span>
          <span ref={status} className="text-cyan transition-colors duration-300">
            BREACHED
          </span>
          <span ref={toLabel} className="ml-auto whitespace-nowrap text-text">
            <span className="text-accent-soft">05</span>
            <span className="mx-2 text-text-muted/40">/</span>
            Profile
          </span>
        </div>
      </div>
    </div>
  );
}
