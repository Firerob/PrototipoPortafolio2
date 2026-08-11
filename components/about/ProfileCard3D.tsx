'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';

/** Maximum tilt in degrees at the corners of the card. */
const TILT = 9;

interface ProfileCard3DProps {
  /** e.g. '/images/profile.jpg'. Omitted renders the designed placeholder. */
  profileSrc?: string;
  name: string;
  role: string;
  /** Free-text coordinates for the HUD readout. */
  coords?: { lat: string; long: string };
  status?: string;
}

/**
 * Tilting profile card with layered depth, a HUD frame and a scanner sweep.
 *
 * Tilt is driven by useMotionValue → useSpring so the card keeps momentum
 * instead of snapping to the cursor. Nothing here goes through React state:
 * a spring-per-render would re-render this subtree on every mouse move.
 *
 * NOTE on 3D and hit-testing: only this card carries `preserve-3d`, and every
 * layer inside it is decorative and `pointer-events-none`. Earlier in this
 * project a 3D-transformed list broke pointer events outright — combining
 * `filter` with a 3D transform on an *interactive* element makes hit-testing
 * diverge from where the element is drawn. Keeping the interactive controls
 * (the tech pills, the links) outside this container avoids that entirely.
 */
export default function ProfileCard3D({
  profileSrc,
  name,
  role,
  coords = { lat: '4.7110° N', long: '74.0721° W' },
  status = 'ONLINE',
}: ProfileCard3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [interactive, setInteractive] = useState(false);

  // -0.5..0.5 across the card.
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const spring = { stiffness: 140, damping: 18, mass: 0.6 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);

  const rotateY = useTransform(sx, [-0.5, 0.5], [-TILT, TILT]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [TILT, -TILT]);
  // Layers translate against the tilt at different rates — that difference is
  // what reads as depth. Equal travel would look like one flat sheet turning.
  const glareX = useTransform(sx, [-0.5, 0.5], ['-18%', '18%']);
  const frameX = useTransform(sx, [-0.5, 0.5], [10, -10]);
  const frameY = useTransform(sy, [-0.5, 0.5], [8, -8]);

  useEffect(() => {
    /*
      Tilt only for a fine pointer that can hover, and only when motion is
      welcome. On touch there is no hover state to drive it, and a card that
      lurches on first contact is exactly the "tirón" to avoid.
    */
    const mq = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const sync = () => setInteractive(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || !interactive) return;

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      px.set((event.clientX - rect.left) / rect.width - 0.5);
      py.set((event.clientY - rect.top) / rect.height - 0.5);
    };

    const onLeave = () => {
      px.set(0);
      py.set(0);
    };

    node.addEventListener('pointermove', onMove, { passive: true });
    node.addEventListener('pointerleave', onLeave);
    return () => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
    };
  }, [interactive, px, py]);

  return (
    <div ref={ref} data-profile-card className="relative [perspective:1200px]">
      <motion.div
        style={
          interactive
            ? { rotateX, rotateY, transformStyle: 'preserve-3d' }
            : { transformStyle: 'preserve-3d' }
        }
        data-profile-plate
        className="relative aspect-[4/5] w-full"
      >
        {/* ── Layer 1: neon grid backdrop ───────────────────────────────── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 border border-white/10 bg-ink/60 backdrop-blur-xl"
          style={{ transform: 'translateZ(0px)' }}
        >
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(139,123,255,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,123,255,0.16) 1px, transparent 1px)',
              backgroundSize: '34px 34px',
            }}
          />
          {/* Neon bloom behind the subject */}
          <div className="absolute left-1/2 top-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-[70px]" />
        </div>

        {/* ── Layer 2: the portrait, obliquely masked ───────────────────── */}
        <div
          className="absolute inset-[9%] overflow-hidden"
          style={{
            transform: 'translateZ(38px)',
            // Oblique corners rather than a hexagon: it keeps a portrait
            // readable (a hex crops the top of the head and the chin) while
            // still reading as a technical cut.
            clipPath:
              'polygon(0 6%, 6% 0, 100% 0, 100% 88%, 92% 100%, 0 100%)',
          }}
        >
          {profileSrc ? (
            <Image
              src={profileSrc}
              alt={`${name}, ${role}`}
              fill
              sizes="(min-width: 1024px) 32vw, 90vw"
              className="object-cover"
              priority={false}
            />
          ) : (
            /*
              Designed placeholder for the missing portrait.

              No image ships with the repo, and a broken <img> would look like
              a bug rather than an empty slot. This reads as an intentional
              "no signal" plate until a real file is passed to profileSrc.
            */
            <div className="relative size-full bg-[linear-gradient(150deg,#221a4d_0%,#0c0b1c_60%,#101a2e_100%)]">
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at center, rgba(255,255,255,0.35) 0.9px, transparent 1.5px)',
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-text-muted">
                  no signal
                </span>
                <span className="max-w-[70%] font-mono text-[0.5rem] uppercase leading-relaxed tracking-[0.16em] text-text-muted/60">
                  pass profileSrc to load portrait
                </span>
              </div>
            </div>
          )}

          {/* Scanner sweep, clipped to the portrait */}
          <div
            aria-hidden="true"
            className="about-scanline pointer-events-none absolute inset-x-0 top-0 h-[22%]"
            style={{
              background:
                'linear-gradient(to bottom, transparent, rgba(75,225,255,0.10) 45%, rgba(75,225,255,0.85) 50%, rgba(75,225,255,0.10) 55%, transparent)',
            }}
          />

          {/* Static scanlines under the sweep */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)',
            }}
          />
        </div>

        {/* ── Layer 3: HUD frame ─────────────────────────────────────────── */}
        <motion.div
          aria-hidden="true"
          style={interactive ? { x: frameX, y: frameY, transform: 'translateZ(64px)' } : undefined}
          className="pointer-events-none absolute inset-0"
        >
          {/* Corner crosses */}
          {[
            'left-2 top-1.5',
            'right-2 top-1.5',
            'bottom-1.5 left-2',
            'bottom-1.5 right-2',
          ].map((pos) => (
            <span
              key={pos}
              className={`absolute font-mono text-[0.75rem] leading-none text-accent-soft/70 ${pos}`}
            >
              +
            </span>
          ))}

          {/* Corner brackets */}
          <span className="absolute left-4 top-4 size-6 border-l border-t border-steel/50" />
          <span className="absolute right-4 top-4 size-6 border-r border-t border-steel/50" />
          <span className="absolute bottom-4 left-4 size-6 border-b border-l border-steel/50" />
          <span className="absolute bottom-4 right-4 size-6 border-b border-r border-steel/50" />

          {/* Top readout */}
          <span className="absolute left-1/2 top-2 -translate-x-1/2 font-mono text-[0.5rem] uppercase tracking-[0.24em] text-text-muted">
            biometric // {status}
          </span>

          {/* Bottom coordinates */}
          <span className="absolute inset-x-4 bottom-8 flex justify-between font-mono text-[0.5rem] uppercase tracking-[0.18em] text-text-muted">
            <span>lat {coords.lat}</span>
            <span>long {coords.long}</span>
          </span>

          {/* Glare that tracks the tilt */}
          <motion.span
            style={interactive ? { x: glareX } : undefined}
            className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(105deg,transparent,rgba(255,255,255,0.07),transparent)]"
          />
        </motion.div>
      </motion.div>

      {/* Identity plate, deliberately OUTSIDE the 3D container so its text
          stays perfectly sharp and its layout is never subpixel-shifted. */}
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
        <div>
          <p className="font-sans text-sm font-bold uppercase tracking-[0.04em] text-text">{name}</p>
          <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.22em] text-text-muted">
            {role}
          </p>
        </div>
        <p className="flex shrink-0 items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-text-muted">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-steel" />
          {status}
        </p>
      </div>
    </div>
  );
}
