import { about, owner } from '@/content/site';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';

export default function AboutSection() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="scroll-mt-24 border-t border-hairline px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-[1600px]">
        <SectionHeading id="about-heading" index="04" label="Profile" title="About" />

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="max-w-[24ch] font-sans text-[clamp(1.4rem,3vw,2.1rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-text">
                {about.lead}
              </p>
            </Reveal>

            <div className="mt-8 max-w-[62ch] space-y-5">
              {about.body.map((paragraph, i) => (
                <Reveal key={i} delay={0.05 * (i + 1)} as="p">
                  <span className="block text-[0.98rem] leading-[1.7] text-text-muted">
                    {paragraph}
                  </span>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={0.1}>
              <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-text-muted">
                Capabilities
              </h3>
              <ul className="mt-4 border-t border-hairline">
                {about.capabilities.map((capability) => (
                  <li
                    key={capability}
                    className="border-b border-hairline py-3 text-[0.95rem] text-text"
                  >
                    {capability}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.16}>
              <h3 className="mt-10 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-text-muted">
                Tools
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {about.tools.map((tool) => (
                  <li
                    key={tool}
                    className="rounded-full border border-hairline px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-text-muted"
                  >
                    {tool}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.22}>
              <p className="mt-10 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-text-muted">
                {owner.name} — {owner.role}
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
