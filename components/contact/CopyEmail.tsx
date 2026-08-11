'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, TriangleAlert } from 'lucide-react';

type CopyState = 'idle' | 'copied' | 'failed';

interface CopyEmailProps {
  email: string;
}

/**
 * Email banner that copies to the clipboard, with an animated confirmation.
 *
 * Two things this handles that a naive `navigator.clipboard.writeText(...)`
 * does not: the API is undefined outside a secure context (plain http on a
 * LAN, some in-app webviews), and it rejects when the document is not
 * focused. Both are silent failures that leave the visitor thinking they
 * copied an address they did not — so there is a real fallback and a real
 * failure state.
 */
export default function CopyEmail({ email }: CopyEmailProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<number | undefined>(undefined);
  const prefersReduced = useReducedMotion();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    window.clearTimeout(timer.current);

    const legacyFallback = () => {
      // execCommand is deprecated but it is still the only thing that works
      // in an insecure context, which is exactly when the modern API is gone.
      const field = document.createElement('textarea');
      field.value = email;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(field);
      return ok;
    };

    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        ok = true;
      } else {
        ok = legacyFallback();
      }
    } catch {
      ok = legacyFallback();
    }

    setState(ok ? 'copied' : 'failed');
    timer.current = window.setTimeout(() => setState('idle'), 2400);
  }, [email]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={copy}
        className="
          group relative flex w-full items-center justify-between gap-4
          overflow-hidden border border-white/10 bg-white/[0.03] px-5 py-5
          text-left backdrop-blur-xl transition-all duration-300
          hover:border-purple-500/50
          hover:shadow-[0_0_0_1px_rgba(168,85,247,0.18),0_0_34px_-10px_rgba(109,75,255,0.9)]
          sm:px-7 sm:py-6
        "
      >
        {/* Corner ticks */}
        {['left-1.5 top-1', 'right-1.5 top-1', 'bottom-1 left-1.5', 'bottom-1 right-1.5'].map((pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className={`pointer-events-none absolute font-mono text-[0.7rem] leading-none text-text-muted/50 transition-colors duration-300 group-hover:text-accent-soft ${pos}`}
          >
            +
          </span>
        ))}

        <span className="min-w-0">
          <span className="block font-mono text-[0.55rem] uppercase tracking-[0.24em] text-text-muted">
            direct channel
          </span>
          <span className="mt-2 block truncate font-sans text-[clamp(1rem,2.6vw,1.6rem)] font-bold tracking-[-0.01em] text-text">
            {email}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-text-muted transition-colors duration-300 group-hover:text-steel">
          <Copy className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">copy</span>
        </span>
      </button>

      {/*
        The confirmation is a live region so the outcome reaches screen
        readers too — a purely visual toast tells a sighted user the copy
        worked and leaves everyone else guessing.
      */}
      <div aria-live="polite" className="sr-only">
        {state === 'copied' && `${email} copied to clipboard`}
        {state === 'failed' && 'Could not copy. Select the address manually.'}
      </div>

      <AnimatePresence>
        {state !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: prefersReduced ? 0 : 8, scale: prefersReduced ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: prefersReduced ? 0 : -6, scale: prefersReduced ? 1 : 0.98 }}
            transition={{ duration: prefersReduced ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
            className={`
              pointer-events-none absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 -translate-y-full
              items-center gap-2 border px-3 py-2 font-mono text-[0.56rem] uppercase tracking-[0.18em]
              backdrop-blur-xl
              ${
                state === 'copied'
                  ? 'border-steel/40 bg-ink/90 text-steel'
                  : 'border-red-500/40 bg-ink/90 text-red-300'
              }
            `}
          >
            {state === 'copied' ? (
              <>
                <Check className="size-3" />
                [ copied to clipboard ]
              </>
            ) : (
              <>
                <TriangleAlert className="size-3" />
                [ copy blocked — select manually ]
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
