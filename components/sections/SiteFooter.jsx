import { navLinks, owner } from '@/content/site';

export default function SiteFooter({ className = '' }) {
  return (
    <footer className={`relative px-5 py-10 sm:px-8 ${className}`}>
      {/*
        No border-t and no plate of its own.

        Both were fine while the page below the hero was opaque; over the 3D
        stage the border was a literal hard rule and `bg-void/95` was a lighter
        box with a straight top edge (measured at ΔL 22). The footer now sits
        on the same feathered scrim every section uses, so it fades in from the
        contact section instead of starting.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to bottom, rgba(5,5,8,0) 0%, rgba(5,5,8,0.86) 38%, rgba(5,5,8,0.86) 100%)',
        }}
      />
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-text-muted">
          © {new Date().getFullYear()} {owner.name}
        </p>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-1">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="flex min-h-11 items-center px-3 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-text-muted transition-colors duration-200 hover:text-text"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a
          href="#top"
          className="flex min-h-11 items-center font-mono text-[0.62rem] uppercase tracking-[0.2em] text-text-muted transition-colors duration-200 hover:text-text"
        >
          Back to top
        </a>
      </div>
    </footer>
  );
}
