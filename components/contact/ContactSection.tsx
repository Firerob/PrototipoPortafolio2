'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { contact, owner } from '@/content/site';
import ContactForm from './ContactForm';
import CopyEmail from './CopyEmail';
import LiveClock from './LiveClock';
import SocialMatrix, { type Social } from './SocialMatrix';
import SceneScrim from '@/components/ui/SceneScrim';
import ScrollFade from '@/components/ui/ScrollFade';

export default function ContactSection() {
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced === true;

  const open = owner.status === 'Open for work';

  const line = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '0px 0px -12% 0px' },
    transition: {
      duration: reduced ? 0 : 0.55,
      delay: reduced ? 0 : delay,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  });

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="relative scroll-mt-24 overflow-hidden px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-14"
    >
      <SceneScrim />
      {/* Single soft accent wash. The 3D stage is long covered by this point,
          so the glow is what carries the palette down to the page's end. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 size-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/12 blur-[130px]"
      />

      <div className="mx-auto max-w-[1600px]">
        {/* ── Live status console ────────────────────────────────────────── */}
        <motion.div
          {...line(0)}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-white/10 bg-white/[0.02] px-4 py-3 backdrop-blur-xl"
        >
          <span className="flex items-center gap-2.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-text-muted">
            <span className="relative flex size-2">
              {/* The ping is the only continuously-running animation here; it
                  inherits the global reduced-motion reset, so it stills. */}
              <span
                aria-hidden="true"
                className={`absolute inline-flex size-full animate-ping rounded-full opacity-70 ${
                  open ? 'bg-cyan' : 'bg-text-muted'
                }`}
              />
              <span
                aria-hidden="true"
                className={`relative inline-flex size-2 rounded-full ${open ? 'bg-cyan' : 'bg-text-muted'}`}
              />
            </span>
            status:{' '}
            <span className="text-text">
              {open ? 'open for new projects / freelance' : 'currently booked'}
            </span>
          </span>

          <LiveClock timezone={contact.timezone} />

          <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-text-muted">
            freq: <span className="text-text">{contact.frequency}</span>{' '}
            <span className="text-text-muted/50">//</span> encrypted
          </span>
        </motion.div>

        {/* ── Heading ────────────────────────────────────────────────────── */}
        <ScrollFade className="mt-12 sm:mt-16">
          <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-text-muted">
            <span aria-hidden="true" className="text-accent-soft">06</span>
            <span className="h-px w-8 bg-hairline" aria-hidden="true" />
            <span>Signal Transmitter</span>
          </div>
          <h2
            id="contact-heading"
            className="mt-3 font-sans text-[clamp(1.75rem,4.5vw,3rem)] font-bold leading-none tracking-[-0.03em] text-text"
          >
            Contact
          </h2>
          <p className="mt-5 max-w-[34ch] font-sans text-[clamp(1.1rem,2.4vw,1.6rem)] font-semibold leading-[1.25] tracking-[-0.02em] text-text">
            {contact.lead}
          </p>
        </ScrollFade>

        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <motion.div {...line(0.12)} className="lg:col-span-7">
            <ContactForm
              projectTypes={contact.projectTypes}
              email={contact.email}
              endpoint={contact.formEndpoint}
            />
          </motion.div>

          <div className="flex flex-col gap-10 lg:col-span-5">
            <motion.div {...line(0.18)}>
              <CopyEmail email={contact.email} />
            </motion.div>

            <motion.div {...line(0.24)}>
              <SocialMatrix socials={contact.socials as Social[]} />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
