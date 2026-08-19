import HeroCanvas from '@/components/three/HeroCanvas';
import { PointerProvider } from '@/components/three/PointerProvider';
import HeroSection from '@/components/hero/HeroSection';
import ProjectsOrbit from '@/components/projects/ProjectsOrbit';
import ProjectDetailPortal from '@/components/projects/ProjectDetailPortal';
import ArchiveSection from '@/components/archive/ArchiveSection';
import ProjectsIndex from '@/components/index/ProjectsIndex';
import StudiesSection from '@/components/studies/StudiesSection';
import AboutSection from '@/components/about/AboutSection';
import ContactSection from '@/components/contact/ContactSection';
import SiteFooter from '@/components/sections/SiteFooter';
import CinematicGenesisOpening from '@/components/hero/CinematicGenesisOpening';
import ColorMorph from '@/components/ColorMorph';
import IndexArrival from '@/components/transitions/IndexArrival';
import StudiesArrival from '@/components/transitions/StudiesArrival';
import AboutArrival from '@/components/transitions/AboutArrival';
import ContactArrival from '@/components/transitions/ContactArrival';
import CorridorDepth from '@/components/transitions/CorridorDepth';
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

      {/*
        The stage now runs the whole page, not just down to the archive.

        endTrigger was "#archive", which parked the renderer the moment the
        corridor scrolled past — everything below it was a flat void
        background. It reaches #contact so the post-hero world in
        GlobalSceneController has a canvas to live in; it still parks for the
        footer, where nothing is drawing.
      */}
      {/* Drives the palette for BOTH the DOM (CSS custom properties) and the
          3D scene (the sceneColor store) from one computation per frame, so
          the canvas and the page can never disagree about what colour the
          site currently is. Renders nothing. */}
      <ColorMorph />

      <HeroCanvas word={owner.heroWord} startTrigger="#top" endTrigger="#contact" />

      {/* The opening: singularity, wireframe ignition, material bake, optic
          calibration. Unmounts itself once the lens resolves, and is absent
          entirely under reduced motion. */}
      <CinematicGenesisOpening />

      <HeroSection word={owner.heroWord} brand={owner.mark} />

      {/* Transparent: the cards are meshes orbiting the prism inside the
          fixed canvas, so nothing may sit between this section and it. */}
      <ProjectsOrbit />

      {/* Still transparent: the wave carries the theme change and the tilted
          video corridor is rendered by the shared canvas behind it. */}
      <ArchiveSection />

      {/* Closes the light archive room with the mirror of the wave that opened
          it, and hands the corridor over to the index. */}
      <IndexArrival />

      {/*
        The stage is NOT covered from here down any more. <main> is
        transparent and each section carries its own SceneScrim, so the 3D
        world runs behind the whole page and the text still has something to
        sit on. See SceneScrim for the contrast reasoning.

        Every section is wrapped in CorridorDepth, and every boundary is a
        scroll-driven crossing rather than a static border, so the lower half
        of the page keeps the same spatial language as the 3D half above it.

        Each crossing is built around what the section it opens actually is —
        a signal acquired for the feed, the page forced apart for the profile,
        an uplink fired for the transmitter — but they all share one grammar:
        the same mono chapter handoff, meter and status word. That is what
        keeps four bespoke set pieces reading as one system.

        The CorridorDepth wrappers must stay the OUTERMOST element around each
        section: they animate opacity, and a second isolating layer above them
        would flatten ProjectRow's mix-blend-difference titles.
      */}
      <main className="relative z-10">
        <CorridorDepth>
          <ProjectsIndex />
        </CorridorDepth>

        {/* Studies is a wall of measurements, so its crossing is an
            instrument settling onto a clean reading out of noise. */}
        <StudiesArrival />

        <CorridorDepth>
          <StudiesSection />
        </CorridorDepth>

        {/* The page is pried open to get into About. */}
        <AboutArrival />

        <CorridorDepth>
          <AboutSection profileSrc="/about/profile.jpg" />
        </CorridorDepth>

        {/* The outbound half of the StudiesArrival pair: that one resolves an
            incoming signal, this one fires one. */}
        <ContactArrival />

        <CorridorDepth>
          <ContactSection />
        </CorridorDepth>
      </main>

      <SiteFooter className="relative z-10" />

      {/* Reachable from a click on any works-orbit or archive-corridor card —
          see lib/projectDetail.ts for why this needs its own portal instead
          of reusing ProjectsIndex's local modal state. */}
      <ProjectDetailPortal />
    </PointerProvider>
  );
}
