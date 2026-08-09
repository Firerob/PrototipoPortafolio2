'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const TILT = 8;

export interface Social {
  label: string;
  handle?: string;
  href: string;
}

interface SocialMatrixProps {
  socials: Social[];
}

/** One tilting card. Split out so each gets its own springs — sharing motion
 *  values across the grid would make every card lean toward one cursor. */
function SocialCard({ social, disabled }: { social: Social; disabled: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const prefersReduced = useReducedMotion();

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 180, damping: 20, mass: 0.5 };
  const rotateY = useTransform(useSpring(px, spring), [-0.5, 0.5], [-TILT, TILT]);
  const rotateX = useTransform(useSpring(py, spring), [-0.5, 0.5], [TILT, -TILT]);

  const tiltable = !prefersReduced;

  return (
    <motion.a
      ref={ref}
      href={social.href}
      target={disabled ? undefined : '_blank'}
      rel={disabled ? undefined : 'noopener noreferrer'}
      /*
        A placeholder href of '#' is not a link — it looks clickable and goes
        nowhere. Marked disabled and taken out of the tab order until a real
        URL exists, so nobody tabs into a dead end.
      */
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      onClick={disabled ? (e) => e.preventDefault() : undefined}
      style={tiltable ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
      onPointerMove={
        tiltable
          ? (event) => {
              const rect = ref.current?.getBoundingClientRect();
              if (!rect) return;
              px.set((event.clientX - rect.left) / rect.width - 0.5);
              py.set((event.clientY - rect.top) / rect.height - 0.5);
            }
          : undefined
      }
      onPointerLeave={
        tiltable
          ? () => {
              px.set(0);
              py.set(0);
            }
          : undefined
      }
      className={`
        group relative flex min-h-[104px] flex-col justify-between overflow-hidden
        border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl
        transition-[border-color,box-shadow] duration-300
        ${
          disabled
            ? 'cursor-not-allowed opacity-45'
            : 'hover:border-purple-500/50 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.18),0_0_28px_-10px_rgba(109,75,255,0.9)]'
        }
      `}
    >
      {/* Sheen that crosses on hover */}
      {!disabled && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)] transition-transform duration-700 ease-out group-hover:translate-x-[420%]"
        />
      )}

      <span className="relative flex items-start justify-between gap-2">
        <span className="font-sans text-sm font-bold uppercase tracking-[0.02em] text-text">
          {social.label}
        </span>
        <ArrowUpRight
          className={`size-3.5 shrink-0 transition-all duration-300 ${
            disabled
              ? 'text-text-muted/40'
              : 'text-text-muted group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-cyan'
          }`}
          aria-hidden="true"
        />
      </span>

      <span className="relative font-mono text-[0.56rem] lowercase tracking-[0.12em] text-text-muted">
        {disabled ? 'link pending' : (social.handle ?? social.href.replace(/^https?:\/\//, ''))}
      </span>
    </motion.a>
  );
}

export default function SocialMatrix({ socials }: SocialMatrixProps) {
  return (
    <div>
      <h3 className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-text-muted">
        Social matrix
      </h3>
      <ul className="mt-4 grid grid-cols-2 gap-3 [perspective:900px] lg:grid-cols-4">
        {socials.map((social) => (
          <li key={social.label}>
            <SocialCard social={social} disabled={!social.href || social.href === '#'} />
          </li>
        ))}
      </ul>
    </div>
  );
}
