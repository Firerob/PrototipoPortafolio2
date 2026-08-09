import Reveal from './Reveal';

/**
 * Shared section header: monospace index + label above a sans-serif title.
 * The index is decorative numbering, not content, so it is hidden from the
 * accessibility tree — a screen reader reading "0 1 Works" is noise.
 */
export default function SectionHeading({ index, label, title, id }) {
  return (
    <Reveal className="mb-10 sm:mb-14">
      <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-text-muted">
        <span aria-hidden="true" className="text-accent-soft">
          {index}
        </span>
        <span className="h-px w-8 bg-hairline" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <h2
        id={id}
        className="mt-4 max-w-[20ch] font-sans text-[clamp(1.75rem,4.5vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em] text-text"
      >
        {title}
      </h2>
    </Reveal>
  );
}
