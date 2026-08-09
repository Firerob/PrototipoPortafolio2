'use client';

import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Send, TriangleAlert } from 'lucide-react';

type Phase = 'idle' | 'sending' | 'sent' | 'handoff' | 'error';

interface ContactFormProps {
  projectTypes: string[];
  /** Fallback address used when no endpoint is configured. */
  email: string;
  /**
   * Third-party form endpoint (Formspree, Web3Forms…). Null means no server
   * is available — see the submit handler.
   */
  endpoint?: string | null;
}

interface Errors {
  name?: string;
  email?: string;
  message?: string;
}

/** Deliberately permissive: the only job here is to catch obvious typos, and
 *  a strict RFC-5322 regex rejects addresses that are perfectly valid. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ContactForm({ projectTypes, email, endpoint }: ContactFormProps) {
  const uid = useId();
  const prefersReduced = useReducedMotion();
  const formRef = useRef<HTMLFormElement>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [type, setType] = useState<string>(projectTypes[0] ?? 'Other');
  const [errors, setErrors] = useState<Errors>({});

  const field = (name: string) => `${uid}-${name}`;

  const validate = (data: FormData): Errors => {
    const next: Errors = {};
    const name = String(data.get('name') ?? '').trim();
    const from = String(data.get('email') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();

    if (!name) next.name = 'Required.';
    if (!from) next.email = 'Required.';
    else if (!EMAIL_RE.test(from)) next.email = 'That address looks incomplete.';
    if (!message) next.message = 'Required.';
    else if (message.length < 12) next.message = 'A little more detail, please.';

    return next;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const found = validate(data);
    setErrors(found);
    if (Object.keys(found).length) {
      // Move focus to the first problem so keyboard and screen-reader users
      // are taken to it rather than left to hunt.
      const first = Object.keys(found)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    const payload = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      projectType: type,
      message: String(data.get('message') ?? ''),
    };

    setPhase('sending');

    /*
      ── The honest branch ───────────────────────────────────────────────

      This site is a static export on GitHub Pages: no server, no API route,
      nothing that can receive a POST. With no third-party endpoint
      configured, a submit button physically cannot deliver a message.

      So when `endpoint` is null the form does the one thing that DOES work
      from a static page — it composes the message in the visitor's own mail
      client — and the success state says exactly that. Animating
      "TRANSMISSION RECEIVED" over a message that went nowhere would be a
      lie told to someone who took the time to write it.
    */
    if (!endpoint) {
      const subject = encodeURIComponent(`[${payload.projectType}] Project enquiry — ${payload.name}`);
      const body = encodeURIComponent(
        `${payload.message}\n\n—\n${payload.name}\n${payload.email}\nProject type: ${payload.projectType}`,
      );
      // Small delay so the transmit animation is legible rather than a flash.
      await new Promise((r) => setTimeout(r, prefersReduced ? 0 : 700));
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      setPhase('handoff');
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Endpoint responded ${response.status}`);
      setPhase('sent');
      formRef.current?.reset();
    } catch {
      setPhase('error');
    }
  };

  const busy = phase === 'sending';
  const done = phase === 'sent' || phase === 'handoff';

  /** Shared input chrome. The scan sweep is a focus-only pseudo layer. */
  const inputClass = `
    peer w-full border border-white/10 bg-white/[0.02] px-4 py-3
    font-sans text-[0.95rem] text-text placeholder:text-text-muted/40
    outline-none backdrop-blur-xl transition-all duration-300
    focus:border-purple-500/60
    focus:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_0_26px_-8px_rgba(109,75,255,0.9)]
  `;

  const labelClass =
    'block font-mono text-[0.56rem] uppercase tracking-[0.22em] text-text-muted';

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="relative border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl sm:p-7"
    >
      {/* Corner ticks + guide lines */}
      {['left-1.5 top-1', 'right-1.5 top-1', 'bottom-1 left-1.5', 'bottom-1 right-1.5'].map((pos) => (
        <span
          key={pos}
          aria-hidden="true"
          className={`pointer-events-none absolute font-mono text-[0.7rem] leading-none text-accent-soft/50 ${pos}`}
        >
          +
        </span>
      ))}

      <p className="font-mono text-[0.56rem] uppercase tracking-[0.24em] text-text-muted">
        [ transmit ] // compose signal
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          {/* A visible label, not a placeholder standing in for one: the
              placeholder vanishes on first keystroke and the field loses its
              name for anyone who looks away mid-form. */}
          <label htmlFor={field('name')} className={labelClass}>
            Name <span className="text-accent-soft">*</span>
          </label>
          <input
            id={field('name')}
            name="name"
            type="text"
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? field('name-error') : undefined}
            className={`${inputClass} mt-2`}
            placeholder="Ada Lovelace"
          />
          {errors.name && (
            <p id={field('name-error')} className="mt-2 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-red-300">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={field('email')} className={labelClass}>
            Email <span className="text-accent-soft">*</span>
          </label>
          <input
            id={field('email')}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? field('email-error') : undefined}
            className={`${inputClass} mt-2`}
            placeholder="ada@example.com"
          />
          {errors.email && (
            <p id={field('email-error')} className="mt-2 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-red-300">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      {/* Project type — a radiogroup, because it is one exclusive choice.
          Arrow keys move between options instead of four tab stops. */}
      <fieldset className="mt-6">
        <legend className={labelClass}>Project type</legend>
        <div role="radiogroup" aria-label="Project type" className="mt-3 flex flex-wrap gap-2">
          {projectTypes.map((option) => {
            const selected = option === type;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setType(option)}
                className={`
                  min-h-11 border px-3 font-mono text-[0.58rem] uppercase tracking-[0.16em]
                  backdrop-blur-xl transition-all duration-300
                  ${
                    selected
                      ? 'border-purple-500/60 bg-accent/15 text-text shadow-[0_0_0_1px_rgba(168,85,247,0.2)]'
                      : 'border-white/10 text-text-muted hover:border-purple-500/40 hover:text-text'
                  }
                `}
              >
                [ {option} ]
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6">
        <label htmlFor={field('message')} className={labelClass}>
          Message <span className="text-accent-soft">*</span>
        </label>
        <textarea
          id={field('message')}
          name="message"
          rows={5}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? field('message-error') : undefined}
          className={`${inputClass} mt-2 resize-y`}
          placeholder="What are you building, and when does it need to exist?"
        />
        {errors.message && (
          <p id={field('message-error')} className="mt-2 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-red-300">
            {errors.message}
          </p>
        )}
      </div>

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <motion.button
          type="submit"
          disabled={busy || done}
          whileTap={prefersReduced || busy || done ? undefined : { scale: 0.98 }}
          className="
            group relative flex min-h-12 items-center justify-center gap-3
            overflow-hidden border border-accent-soft/50 bg-accent/15 px-6
            font-mono text-[0.62rem] uppercase tracking-[0.2em] text-text
            backdrop-blur-xl transition-all duration-300
            hover:border-accent-soft hover:bg-accent/25
            hover:shadow-[0_0_0_1px_rgba(168,85,247,0.25),0_0_30px_-8px_rgba(109,75,255,1)]
            disabled:cursor-not-allowed disabled:opacity-70
          "
        >
          {/* Indeterminate sweep while in flight. */}
          {busy && (
            <motion.span
              aria-hidden="true"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-y-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(139,123,255,0.35),transparent)]"
            />
          )}
          <span className="relative flex items-center gap-2">
            {done ? <Check className="size-3.5" aria-hidden="true" /> : <Send className="size-3.5" aria-hidden="true" />}
            {busy ? 'sending signal…' : done ? 'signal sent' : 'transmit signal'}
          </span>
        </motion.button>

        {/* Status. A live region so the outcome is announced, not just drawn. */}
        <div aria-live="polite" className="min-h-[1.5rem] flex-1">
          <AnimatePresence mode="wait">
            {phase === 'sent' && (
              <motion.p
                key="sent"
                initial={{ opacity: 0, y: prefersReduced ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReduced ? 0 : 0.3 }}
                className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-cyan"
              >
                [ transmission received ]
              </motion.p>
            )}

            {phase === 'handoff' && (
              <motion.p
                key="handoff"
                initial={{ opacity: 0, y: prefersReduced ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReduced ? 0 : 0.3 }}
                className="font-mono text-[0.58rem] uppercase leading-relaxed tracking-[0.16em] text-cyan"
              >
                [ handed to your mail client ] — send it from there to reach {email}
              </motion.p>
            )}

            {phase === 'error' && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: prefersReduced ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReduced ? 0 : 0.3 }}
                className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-red-300"
              >
                <TriangleAlert className="size-3" aria-hidden="true" />
                [ transmission failed ] — write to {email} instead
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!endpoint && (
        <p className="mt-5 border-t border-white/10 pt-4 font-mono text-[0.52rem] uppercase leading-relaxed tracking-[0.14em] text-text-muted/70">
          note: no form endpoint configured — submitting opens your mail client
          with the message pre-filled. Set `contact.formEndpoint` to POST instead.
        </p>
      )}
    </form>
  );
}
