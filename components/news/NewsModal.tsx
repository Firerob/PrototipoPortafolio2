'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLenis } from 'lenis/react';
import { X } from 'lucide-react';
import type { NewsItem } from '@/types/news';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface NewsModalProps {
  item: NewsItem | null;
  onClose: () => void;
  reducedMotion: boolean;
}

/**
 * HUD reader panel.
 *
 * Rendered through a portal on document.body so it escapes every stacking
 * context on the page — the fixed 3D canvas, the wave layer and the z-10
 * content wrapper all sit below it without any z-index arithmetic.
 */
export default function NewsModal({ item, onClose, reducedMotion }: NewsModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const lenis = useLenis();

  const open = item !== null;

  /*
    Scroll lock, and the project-specific part of it.

    Lenis owns the document scroll here, so `overflow: hidden` on <body> alone
    does NOT stop it — Lenis keeps applying its own transform and the page
    slides behind the panel. lenis.stop() is the only thing that actually
    holds it. The body rule stays as the fallback for the moment before Lenis
    has initialised.
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
        onClose();
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
      // Returning focus to the card that opened this is what keeps keyboard
      // navigation from restarting at the top of the document on close.
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);

  // Portals need the DOM, so nothing renders during SSR.
  if (typeof document === 'undefined') return null;

  const duration = reducedMotion ? 0 : 0.42;

  return createPortal(
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-[60]" role="presentation">
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="news-modal-title"
            initial={{ x: reducedMotion ? 0 : '100%', opacity: reducedMotion ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reducedMotion ? 0 : '100%', opacity: reducedMotion ? 0 : 1 }}
            transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
            /*
              data-lenis-prevent lets this panel scroll internally while Lenis
              is stopped. Without it the wheel inside the reader does nothing,
              which is a maddening bug to track down.
            */
            data-lenis-prevent
            className="
              absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col
              overflow-y-auto border-l border-white/10 bg-ink/95 backdrop-blur-md
            "
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-ink/90 px-5 py-4 backdrop-blur-md sm:px-7">
              <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-text-muted">
                [ {dateFormatter.format(new Date(`${item.date}T00:00:00Z`)).replace(/-/g, '.')}{' '}
                <span className="text-text-muted/50">//</span> SYS.
                {item.id.replace('-', '_').toUpperCase()} ]
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close reader"
                className="flex size-11 shrink-0 items-center justify-center border border-white/10 text-text transition-colors duration-200 hover:border-purple-500/50 hover:text-steel"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="px-5 py-7 sm:px-7">
              <span className="inline-flex items-center border border-accent-soft/35 px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-accent-soft">
                [ {item.category} ]
              </span>

              <h3
                id="news-modal-title"
                className="mt-5 font-sans text-[clamp(1.4rem,3.4vw,2.05rem)] font-bold uppercase leading-[1.1] tracking-[-0.02em] text-text"
              >
                {item.title}
              </h3>

              {/* Media slot. Reserves its ratio so swapping in a real clip
                  causes no layout shift. */}
              <div className="relative mt-6 aspect-video w-full overflow-hidden border border-white/10">
                {item.video ? (
                  <video
                    className="size-full object-cover"
                    src={item.video}
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload="none"
                  />
                ) : (
                  <div
                    className="size-full"
                    style={{
                      background: `linear-gradient(122deg, ${item.tint[0]} 0%, ${item.tint[1]} 85%)`,
                    }}
                  />
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-60"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at center, rgba(255,255,255,0.5) 0.7px, transparent 1.2px)',
                    backgroundSize: '22px 22px',
                  }}
                />
              </div>

              <div className="mt-7 space-y-5">
                {item.body.map((paragraph, i) => (
                  <p key={i} className="text-[0.95rem] leading-[1.75] text-text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>

              <ul className="mt-8 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <li
                    key={tag}
                    className="border border-white/10 bg-surface/50 px-2.5 py-1 font-mono text-[0.58rem] lowercase tracking-[0.12em] text-accent-soft"
                  >
                    <span aria-hidden="true" className="text-text-muted">&gt; </span>
                    {tag}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-4">
                <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-text-muted">
                  status: <span className="text-steel">{item.status ?? 'PUBLISHED'}</span>
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
