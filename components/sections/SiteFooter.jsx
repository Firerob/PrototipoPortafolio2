import { navLinks, owner } from '@/content/site';

export default function SiteFooter({ className = '' }) {
  return (
    <footer className={`border-t border-hairline px-5 py-10 sm:px-8 ${className}`}>
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
