import { ArrowUpRight } from 'lucide-react';
import { news } from '@/content/site';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';

// Fixed locale + UTC: relying on the runtime default makes the server and the
// client disagree and React throws a hydration mismatch on the date string.
const formatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function NewsSection() {
  return (
    <section
      id="news"
      aria-labelledby="news-heading"
      className="scroll-mt-24 border-t border-hairline px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto max-w-[1600px]">
        <SectionHeading id="news-heading" index="03" label="Recent" title="News" />

        <ul className="border-t border-hairline">
          {news.map((entry, i) => (
            <li key={entry.date + entry.title}>
              <Reveal delay={Math.min(i, 3) * 0.05}>
                <a
                  href="#news"
                  className="group flex flex-col gap-2 border-b border-hairline py-6 transition-colors duration-200 hover:bg-surface/40 sm:flex-row sm:items-center sm:gap-8 sm:px-2"
                >
                  <time
                    dateTime={entry.date}
                    className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-text-muted sm:w-32"
                  >
                    {formatter.format(new Date(`${entry.date}T00:00:00Z`))}
                  </time>

                  <span className="shrink-0 rounded-full border border-hairline px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-accent-soft sm:w-auto">
                    {entry.tag}
                  </span>

                  <span className="flex-1 text-[0.95rem] leading-relaxed text-text">
                    {entry.title}
                  </span>

                  <ArrowUpRight
                    className="hidden size-4 shrink-0 text-text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-text sm:block"
                    aria-hidden="true"
                  />
                </a>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
