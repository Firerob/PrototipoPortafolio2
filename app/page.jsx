import HeroCanvas from '@/components/three/HeroCanvas';
import { PointerProvider } from '@/components/three/PointerProvider';
import HeroSection from '@/components/hero/HeroSection';
import ProjectsOrbit from '@/components/projects/ProjectsOrbit';
import ArchiveSection from '@/components/archive/ArchiveSection';
import WorksSection from '@/components/sections/WorksSection';
import NewsSection from '@/components/sections/NewsSection';
import AboutSection from '@/components/sections/AboutSection';
import ContactSection from '@/components/sections/ContactSection';
import SiteFooter from '@/components/sections/SiteFooter';
import { owner } from '@/content/site';

/*
  Stacking model:

    -z-10   FluidBackground   fixed   (app/layout.jsx)
     z-0    HeroCanvas        fixed   click-through 3D stage
     z-10   content           flows   scrolls over both

  Flow: the hero loads clean because every card is still off-screen. Scrolling
  spins the prism, which drags the cards in from the left onto a ring that
  orbits it. Past the pinned section, opaque content covers the stage.
*/
export default function Page() {
  return (
    <PointerProvider>
      {/* Skip link: the hero is a full-viewport decorative scene, so without
          this a keyboard user tabs the whole HUD before reaching any work. */}
      <a
        href="#works"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-5 focus:py-3 focus:font-mono focus:text-[0.7rem] focus:uppercase focus:tracking-[0.18em] focus:text-white"
      >
        Skip to works
      </a>

      <HeroCanvas word={owner.heroWord} startTrigger="#top" endTrigger="#archive" />

      <HeroSection word={owner.heroWord} brand={owner.mark} />

      {/* Transparent: the cards are meshes orbiting the prism inside the
          fixed canvas, so nothing may sit between this section and it. */}
      <ProjectsOrbit />

      {/* Still transparent: the wave carries the theme change and the tilted
          video corridor is rendered by the shared canvas behind it. */}
      <ArchiveSection />

      {/* From here down the stage is fully covered. bg-void/95 still lets the
          fluid layer read faintly underneath. */}
      <main className="relative z-10 bg-void/95">
        <WorksSection />
        <NewsSection />
        <AboutSection />
        <ContactSection />
      </main>

      <SiteFooter className="relative z-10 bg-void/95" />
    </PointerProvider>
  );
}
