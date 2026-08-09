'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { about, owner } from '@/content/site';
import ProfileCard3D from './ProfileCard3D';
import ScrambleText from './ScrambleText';
import StatCounter, { type Stat } from './StatCounter';
import TechStack, { type TechItem } from './TechStack';

interface AboutSectionProps {
  /** e.g. '/images/profile.jpg'. Omitted renders the designed placeholder. */
  profileSrc?: string;
}

export default function AboutSection({ profileSrc }: AboutSectionProps) {
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced === true;

  const stats = (about.stats ?? []) as Stat[];
  const stack = (about.stack ?? []) as TechItem[];

  /** Lines fade up in sequence. Identical markup regardless of the motion
   *  preference — only the timing changes, so SSR and client always agree. */
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
      id="about"
      aria-labelledby="about-heading"
      className="scroll-mt-24 border-t border-hairline px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-[1600px]">
        <motion.div {...line(0)} className="mb-12 sm:mb-16">
          <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-text-muted">
            <span aria-hidden="true" className="text-accent-soft">05</span>
            <span className="h-px w-8 bg-hairline" aria-hidden="true" />
            <span>Profile</span>
          </div>
          <h2
            id="about-heading"
            className="mt-3 font-sans text-[clamp(1.75rem,4.5vw,3rem)] font-bold leading-none tracking-[-0.03em] text-text"
          >
            About
          </h2>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* ── Profile card ───────────────────────────────────────────── */}
          <motion.div
            {...line(0.05)}
            className="mx-auto w-full max-w-[420px] lg:col-span-5 lg:mx-0 lg:max-w-none"
          >
            <ProfileCard3D
              profileSrc={profileSrc}
              name={owner.name}
              role={owner.role}
              coords={about.coords}
              status={owner.status === 'Open for work' ? 'AVAILABLE' : 'ONLINE'}
            />
          </motion.div>

          {/* ── Bio, stack, stats ──────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <motion.div {...line(0.1)}>
              {/* Scrambled kicker. The real string is exposed via aria-label,
                  so the decode never reaches assistive tech as gibberish. */}
              <ScrambleText
                as="p"
                text="ABOUT THE ARTIST / CREATIVE DEVELOPER"
                speed={2}
                className="block font-mono text-[0.62rem] uppercase tracking-[0.28em] text-accent-soft"
              />
            </motion.div>

            <motion.p
              {...line(0.16)}
              className="mt-6 max-w-[22ch] font-sans text-[clamp(1.45rem,3.2vw,2.25rem)] font-semibold leading-[1.16] tracking-[-0.02em] text-text"
            >
              {about.lead}
            </motion.p>

            <div className="mt-7 max-w-[62ch] space-y-5">
              {about.body.map((paragraph, i) => (
                <motion.p
                  key={i}
                  {...line(0.22 + i * 0.07)}
                  className="text-[0.98rem] leading-[1.75] text-text-muted"
                >
                  {paragraph}
                </motion.p>
              ))}
            </div>

            {stack.length > 0 && (
              <motion.div {...line(0.34)} className="mt-10">
                <TechStack items={stack} label="Stack" />
              </motion.div>
            )}

            {stats.length > 0 && (
              <motion.dl
                {...line(0.4)}
                className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3"
              >
                {stats.map((stat, i) => (
                  <StatCounter key={stat.label} stat={stat} index={i} />
                ))}
              </motion.dl>
            )}

            <motion.div {...line(0.46)} className="mt-12">
              <h3 className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-text-muted">
                Capabilities
              </h3>
              <ul className="mt-4 border-t border-white/10">
                {about.capabilities.map((capability) => (
                  <li
                    key={capability}
                    className="border-b border-white/10 py-3 text-[0.95rem] text-text"
                  >
                    {capability}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
