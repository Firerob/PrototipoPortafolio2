'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { projects } from '@/content/projects';
import {
  archiveScroll,
  GALLERY_RANGE,
  phaseOf,
  smootherstep,
} from '@/lib/archiveScroll';
import ArchivePlane from './ArchivePlane';

interface ArchiveGalleryProps {
  reducedMotion?: boolean;
}

/**
 * The tilted video-plane corridor revealed once the camera is inside.
 *
 * Lives in the same canvas as the prism and the orbit, so it shares the depth
 * buffer: the prism's glass genuinely refracts the nearest planes as the
 * camera passes through it, which no amount of DOM layering could fake.
 *
 * The phase is computed ONCE here per frame and handed to every plane through
 * shared refs. Each plane recomputing phaseOf() from the store would be the
 * same arithmetic done N times a frame for an identical result.
 */
export default function ArchiveGallery({ reducedMotion = false }: ArchiveGalleryProps) {
  const group = useRef<Group>(null);
  const reveal = useRef(0);
  const travel = useRef(0);

  useFrame(() => {
    /*
      The corridor has to LEAVE now.

      It used to hold at full reveal forever, because the gallery phase pins at
      1 once the archive is behind you and nothing ever took it back down. That
      was invisible while the canvas parked at #archive. Now that the stage
      runs the whole page, those video planes hang in the frame behind the
      index, the news grid and the profile card — the "ghost geometry" that
      makes a persistent 3D background look like a bug rather than a world.

      `exit` is already written by IndexArrival as it closes the light room, so
      the corridor withdraws on exactly the beat that replaces it.
    */
    const phase =
      smootherstep(phaseOf(archiveScroll.progress, GALLERY_RANGE)) *
      (1 - smootherstep(archiveScroll.exit));
    reveal.current = phase;
    // Planes drift toward the camera as the gallery phase advances, so the
    // corridor keeps moving after the camera itself has settled.
    // Small on purpose: the corridor should breathe, not stampede past the
    // lens. 5.5 units pushed the near planes straight through the camera.
    travel.current = reducedMotion ? 1.2 : phase * 2.5;

    if (group.current) group.current.visible = phase > 0.001;
  });

  return (
    <group ref={group} visible={false}>
      {projects.map((project, i) => (
        <ArchivePlane
          key={project.id}
          project={project}
          slot={i}
          revealRef={reveal}
          travelRef={travel}
          /*
            Image wins over video, same priority ArchivePlane documents and
            the rest of the site already uses. Set `image` or `video` on a
            project in content/projects.ts to swap its procedural preview for
            real artwork; with neither, the plane falls back to the
            drifting-bands placeholder.
          */
          imageSrc={project.image}
          videoSrc={project.video}
        />
      ))}
    </group>
  );
}
