import { ArrowUpRight } from 'lucide-react';
import { contact, owner } from '@/content/site';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';

/*
  A mailto link rather than a contact form. A form here would need a backend,
  spam handling and validation states to be honest about what happens on
  submit — and landing.csv puts the primary CTA in the footer, not behind a
  form. Swap in a form once there is somewhere for the message to go.
*/
export default function ContactSection() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="relative scroll-mt-24 overflow-hidden border-t border-hairline px-5 py-20 sm:px-8 sm:py-28"
    >
      {/* Single soft accent wash. The hero owns the spectacle; down here the
          accent is deliberately minimal so the CTA is the brightest thing. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/12 blur-[120px]"
      />

      <div className="mx-auto max-w-[1600px]">
        <SectionHeading id="contact-heading" index="05" label="Get in touch" title="Contact" />

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="max-w-[22ch] font-sans text-[clamp(1.6rem,4vw,2.6rem)] font-bold leading-[1.1] tracking-[-0.03em] text-text">
                {contact.lead}
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <a
                href={`mailto:${contact.email}`}
                className="group mt-8 inline-flex min-h-11 items-center gap-3 rounded-full border border-accent-soft/50 bg-accent/10 px-6 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-text transition-colors duration-200 hover:border-accent-soft hover:bg-accent/20"
              >
                <span className="relative">{contact.email}</span>
                <ArrowUpRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={0.12}>
              <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-text-muted">
                Elsewhere
              </h3>
              <ul className="mt-4 border-t border-hairline">
                {contact.socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      className="group flex min-h-11 items-center justify-between border-b border-hairline py-3 text-[0.95rem] text-text-muted transition-colors duration-200 hover:text-text"
                    >
                      {social.label}
                      <ArrowUpRight
                        className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.18}>
              <p className="mt-8 flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-text-muted">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-cyan" />
                {owner.status}
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
