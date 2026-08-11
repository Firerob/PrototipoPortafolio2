import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import FluidBackground from '@/components/background/FluidBackground';
import FilmGrain from '@/components/background/FilmGrain';
import SmoothScroll from '@/components/providers/SmoothScroll';
import { owner } from '@/content/site';
import './globals.css';

/* IBM Plex, not Orbitron: the reference site's own stylesheets resolve to
   ibm-plex-sans-jp + "IBM Plex Mono". next/font self-hosts both, so there is
   no runtime request to fonts.gstatic.com. */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata = {
  title: `${owner.name} — ${owner.role}`,
  description:
    'Real-time graphics, shaders and motion systems. Interactive WebGL portfolio.',
};

export const viewport = {
  themeColor: '#06060a',
  // No maximum-scale / user-scalable=no — disabling zoom is a listed
  // anti-pattern (quick-reference §5 Layout & Responsive).
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="bg-void font-sans text-text antialiased">
        {/* Lenis wraps everything so it owns the document scroll, and its
            bridge keeps GSAP's ScrollTrigger on the same clock. */}
        <SmoothScroll>
          {/* Mounted once for the whole app. The body keeps its opaque colour:
              the root background paints below negative-z-index children, so
              the fluid layers on top of it rather than being hidden by it. */}
          <FluidBackground />
          {children}
          {/* Above everything, including the crossings — grain and vignette are a
              property of the image, not of any one layer. */}
          <FilmGrain />
        </SmoothScroll>
      </body>
    </html>
  );
}
