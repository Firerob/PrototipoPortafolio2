'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { navLinks as LINKS } from '@/content/site';

/*
  Entrance timing follows quick-reference §7: ease-out on entry, and only the
  nav + gizmo animate in. The 3D scene is already the moving element — a third
  competing animation is the "animate everything that moves" anti-pattern.

  Reduced motion collapses the timings to zero but leaves every style value
  untouched. The server has no way to read the viewer's motion preference, so
  swapping variants for `initial={false}` on the client is a guaranteed
  hydration mismatch; identical markup with a zero duration is not.
*/
const containerVariants = (reduced) => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: reduced ? 0 : 0.06,
      delayChildren: reduced ? 0 : 0.15,
    },
  },
});

const itemVariantsFor = (reduced) => ({
  hidden: { opacity: 0, y: -8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] },
  },
});

export default function Navbar({ brand, reducedMotion = false }) {
  const [open, setOpen] = useState(false);

  const itemVariants = itemVariantsFor(reducedMotion);

  return (
    <motion.header
      variants={containerVariants(reducedMotion)}
      initial="hidden"
      animate="show"
      className="pointer-events-none absolute inset-x-0 top-0 z-20 px-5 pt-5 sm:px-8 sm:pt-7"
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-[1600px] items-center justify-between gap-4"
      >
        <motion.a
          variants={itemVariants}
          href="#top"
          // Tighter tracking than a short acronym would take: a full name at
          // 0.18em turns into a stretched banner at narrow widths.
          className="pointer-events-auto flex min-h-11 items-center whitespace-nowrap font-sans text-[0.95rem] font-bold leading-none tracking-[0.16em] text-text transition-opacity duration-200 hover:opacity-70 sm:text-[1.1rem]"
        >
          {brand}
        </motion.a>

        {/* Desktop links */}
        <motion.ul
          variants={itemVariants}
          className="pointer-events-auto hidden items-center gap-1 md:flex"
        >
          {LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="flex min-h-11 items-center px-3 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-text-muted transition-colors duration-200 hover:text-text"
              >
                {link.label}
              </a>
            </li>
          ))}
        </motion.ul>

        <div className="flex items-center gap-2">
          <motion.a
            variants={itemVariants}
            href="#contact"
            className="group pointer-events-auto relative flex min-h-11 items-center gap-2 rounded-full border border-accent-soft/40 bg-accent/10 px-5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-text backdrop-blur-sm transition-colors duration-200 hover:border-accent-soft hover:bg-accent/20"
          >
            {/* The glow is a sibling layer, not a box-shadow transition:
                animating shadow spread repaints; opacity is compositor-only. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full opacity-60 shadow-[0_0_18px_-2px_var(--color-accent)] transition-opacity duration-300 group-hover:opacity-100"
            />
            <span className="relative">Contact / Recruit</span>
            <ArrowUpRight className="relative size-3.5" strokeWidth={2} aria-hidden="true" />
          </motion.a>

          <motion.button
            variants={itemVariants}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-hairline text-text transition-colors duration-200 hover:border-accent-soft md:hidden"
          >
            {open ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
          </motion.button>
        </div>
      </nav>

      {/* Mobile panel. Kept in the DOM but hidden so aria-controls always
          resolves to a real element. */}
      <ul
        id="mobile-nav"
        hidden={!open}
        className="pointer-events-auto mt-4 flex flex-col gap-1 rounded-2xl border border-hairline bg-ink/80 p-2 backdrop-blur-md md:hidden"
      >
        {LINKS.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-xl px-4 font-mono text-[0.75rem] uppercase tracking-[0.22em] text-text-muted transition-colors duration-200 hover:bg-surface hover:text-text"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </motion.header>
  );
}
