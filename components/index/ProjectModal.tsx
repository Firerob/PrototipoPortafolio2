'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLenis } from 'lenis/react';
import { ArrowUpRight, Maximize2, X } from 'lucide-react';
import type { Project } from '@/types/project';
import { asset } from '@/lib/asset';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
  reducedMotion: boolean;
}

/**
 * Detail view for one project, opened from a Deep Index row.
 *
 * Two columns on desktop — media left, dossier right — collapsing to a single
 * stacked column below `lg`. The panel itself is the scroll container, so long
 * copy never pushes the media off screen on a laptop.
 *
 * Portalled onto document.body, like StudyModal, so it escapes every stacking
 * context on the page: the fixed R3F canvas, the wave layer and the z-10
 * content wrapper all sit underneath without any z-index arithmetic.
 *
 * The accent is per-project rather than global: `tint[0]` drives the rules,
 * the tag borders and the CTA. The section's own accent is a muted champagne
 * shared by the whole page, and using it here would make seven very different
 * pieces of artwork all sit behind the same colour.
 */
export default function ProjectModal({ project, onClose, reducedMotion }: ProjectModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const lenis = useLenis();

  /** The fullscreen media layer, which sits above the dialog. */
  const [zoomed, setZoomed] = useState(false);

  const open = project !== null;

  // Any change of project closes a zoom left open from the previous one.
  useEffect(() => {
    setZoomed(false);
  }, [project]);

  /*
    Scroll lock.

    Lenis owns the document scroll, so `overflow: hidden` on <body> alone does
    NOT stop it — Lenis keeps applying its own transform and the page slides
    behind the panel. lenis.stop() is the only thing that actually holds it;
    the body rule stays as the fallback for the moment before Lenis has
    initialised.
  */
  useEffect(() => {
    if (!open) return;

    lenis?.stop();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      lenis?.start();
      document.body.style.overflow = previous;
    };
  }, [open, lenis]);

  /* Escape to close, and a focus trap while the dialog is up. */
  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        // Escape peels one layer at a time: the zoom first, the dialog second.
        // Closing both at once loses the reader's place for one keystroke.
        if (zoomed) setZoomed(false);
        else onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const nodes = panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes?.length) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      // Wrap focus at both ends so tab can never reach the page behind.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // Move focus into the panel on the next frame, once it is mounted.
    const raf = requestAnimationFrame(() => {
      panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(raf);
      // Returning focus to the row that opened this is what keeps keyboard
      // navigation from restarting at the top of the document on close.
      restoreTo.current?.focus?.();
    };
  }, [open, onClose, zoomed]);

  const toggleZoom = useCallback(() => setZoomed((v) => !v), []);

  // Portals need the DOM, so nothing renders during SSR.
  if (typeof document === 'undefined') return null;

  const duration = reducedMotion ? 0 : 0.42;
  const accent = project?.tint[0] ?? '#ffffff';
  const media = project?.image ?? project?.video;
  /** Full-resolution file for the zoom layer, falling back to the card file. */
  const fullSrc = project?.full ?? media;

  return createPortal(
    <AnimatePresence>
      {project && (
        <div className="fixed inset-0 z-[60]" role="presentation">
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-void/85 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/*
            Centred dialog rather than the edge drawer StudyModal uses. A
            study is a column of text and reads fine in 560px; this one has to
            hold a portrait image and its dossier side by side, which needs the
            full width of the viewport to divide.
          */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-0 sm:p-6 lg:p-10">
            <motion.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="project-modal-title"
              initial={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.965, y: 22 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.985, y: 12 }
              }
              transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
              /*
                data-lenis-prevent lets this panel scroll internally while
                Lenis is stopped. Without it the wheel inside the dialog does
                nothing, which is a maddening bug to track down.
              */
              data-lenis-prevent
              className="
                pointer-events-auto relative flex h-full w-full max-w-[1400px] flex-col
                overflow-y-auto border border-white/10 bg-ink/95 backdrop-blur-md
                sm:h-auto sm:max-h-full
              "
            >
              {/* Per-project hairline along the top edge. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
              />

              {/* ── Header bar ─────────────────────────────────────────────── */}
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-ink/90 px-5 py-4 backdrop-blur-md sm:px-7">
                <span className="truncate font-mono text-[0.58rem] uppercase tracking-[0.16em] text-text-muted">
                  [ {dateFormatter.format(new Date(`${project.date}T00:00:00Z`)).replace(/-/g, '.')}{' '}
                  <span className="text-text-muted/50">//</span>{' '}
                  {project.id.replace('-', '_').toUpperCase()} ]
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close project"
                  className="flex size-11 shrink-0 items-center justify-center border border-white/10 text-text transition-colors duration-200 hover:border-steel/50 hover:text-steel"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              {/*
                Two columns from `lg` up, stacked below it. 5/7 rather than a
                even split: the media is portrait and a half-width column would
                make it taller than the viewport on a laptop.
              */}
              <div className="grid gap-8 px-5 py-7 sm:px-7 lg:grid-cols-12 lg:gap-12 lg:py-10">
                {/* ── Media ────────────────────────────────────────────────── */}
                <div className="lg:col-span-5">
                  <div className="relative aspect-[4/5] w-full overflow-hidden border border-white/10 bg-surface">
                    {project.image ? (
                      <img
                        src={asset(project.image)}
                        alt={project.alt ?? ''}
                        className="size-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : project.video ? (
                      <video
                        className="size-full object-cover"
                        src={asset(project.video)}
                        muted
                        loop
                        playsInline
                        autoPlay
                        preload="metadata"
                      />
                    ) : (
                      // No media: the same gradient the card falls back to, so
                      // the modal never opens onto an empty box.
                      <div
                        className="size-full"
                        style={{
                          background: `linear-gradient(145deg, ${project.tint[0]} 0%, ${project.tint[1]} 80%)`,
                        }}
                      />
                    )}

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-30"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at center, rgba(255,255,255,0.45) 0.7px, transparent 1.2px)',
                        backgroundSize: '24px 24px',
                      }}
                    />

                    {media && (
                      <button
                        type="button"
                        onClick={toggleZoom}
                        aria-label={`View ${project.title} full screen`}
                        className="absolute bottom-3 right-3 flex size-11 items-center justify-center border border-white/15 bg-void/70 text-text backdrop-blur-sm transition-colors duration-200 hover:text-steel"
                        style={{ borderColor: `${accent}55` }}
                      >
                        <Maximize2 className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <p className="mt-3 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-text-muted">
                    {project.image ? 'still' : project.video ? 'clip · muted loop' : 'no media'}
                    {media && (
                      <>
                        <span className="mx-2 text-text-muted/40">//</span>
                        click to enlarge
                      </>
                    )}
                  </p>
                </div>

                {/* ── Dossier ──────────────────────────────────────────────── */}
                <div className="lg:col-span-7">
                  <h3
                    id="project-modal-title"
                    className="font-sans text-[clamp(1.8rem,4.6vw,3.2rem)] font-bold uppercase leading-[0.98] tracking-[-0.03em] text-text"
                  >
                    {project.title}
                  </h3>

                  <p className="mt-4 max-w-[52ch] font-sans text-[clamp(1rem,1.5vw,1.2rem)] leading-[1.45] text-text-muted">
                    {project.subtitle}
                  </p>

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <li
                        key={tag}
                        className="border bg-surface/50 px-2.5 py-1 font-mono text-[0.58rem] lowercase tracking-[0.12em]"
                        style={{ borderColor: `${accent}40`, color: accent }}
                      >
                        <span aria-hidden="true" className="text-text-muted">&gt; </span>
                        {tag}
                      </li>
                    ))}
                  </ul>

                  {project.body && project.body.length > 0 && (
                    <div className="mt-8 max-w-[62ch] space-y-5">
                      {project.body.map((paragraph, i) => (
                        <p key={i} className="text-[0.98rem] leading-[1.75] text-text-muted">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}

                  {project.credits && project.credits.length > 0 && (
                    <>
                      <h4 className="mt-10 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-text-muted">
                        Specification
                      </h4>
                      {/*
                        A <dl> rather than a grid of <div>s: this is genuinely
                        a set of term/definition pairs, and the semantics are
                        free. sm:grid-cols-2 keeps the pairs adjacent rather
                        than letting a long value strand its own label.
                      */}
                      <dl className="mt-4 grid gap-x-10 border-t border-white/10 sm:grid-cols-2">
                        {project.credits.map((credit) => (
                          <div
                            key={credit.label}
                            className="flex items-baseline justify-between gap-6 border-b border-white/10 py-3"
                          >
                            <dt className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-text-muted">
                              {credit.label}
                            </dt>
                            <dd className="text-right text-[0.92rem] text-text">{credit.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </>
                  )}

                  <div className="mt-10 flex flex-wrap items-center gap-3">
                    {project.href && (
                      <a
                        href={project.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group inline-flex items-center gap-3 border px-6 py-3.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-text transition-colors duration-200"
                        style={{ borderColor: `${accent}70` }}
                      >
                        {project.hrefLabel ?? 'View full project'}
                        <ArrowUpRight
                          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          aria-hidden="true"
                        />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center gap-3 border border-white/10 px-6 py-3.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-text-muted transition-colors duration-200 hover:border-steel/40 hover:text-text"
                    >
                      Close
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/*
            ── Fullscreen media layer ───────────────────────────────────────
            A sibling of the dialog, not a child: nesting it would put it
            inside the panel's own scroll container and `position: fixed`
            would resolve against the transformed panel rather than the
            viewport. object-contain so nothing is cropped — this layer exists
            precisely to show the whole frame.
          */}
          <AnimatePresence>
            {zoomed && fullSrc && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.25 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-void/95 p-4 sm:p-10"
                onClick={() => setZoomed(false)}
              >
                {project.image ? (
                  <motion.img
                    initial={reducedMotion ? undefined : { scale: 0.97 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                    src={asset(fullSrc)}
                    alt={project.alt ?? project.title}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  /*
                    stopPropagation, unlike the still.

                    The layer closes on click, which is right for an image —
                    but this one has controls, and without this every press of
                    play, scrub or volume would bubble up and dismiss the
                    player the user just reached for.
                  */
                  <video
                    className="max-h-full max-w-full object-contain"
                    src={asset(fullSrc)}
                    onClick={(event) => event.stopPropagation()}
                    muted
                    loop
                    playsInline
                    autoPlay
                    controls
                  />
                )}

                <button
                  type="button"
                  onClick={(event) => {
                    // The layer itself closes on click; without this the
                    // button's own click would bubble and fire it twice.
                    event.stopPropagation();
                    setZoomed(false);
                  }}
                  aria-label="Exit full screen"
                  className="absolute right-4 top-4 flex size-11 items-center justify-center border border-white/15 bg-ink/70 text-text backdrop-blur-sm transition-colors duration-200 hover:text-steel sm:right-8 sm:top-8"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
