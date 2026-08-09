'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { projects } from '@/content/projects';
import type { Project } from '@/types/project';
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
    const phase = smootherstep(phaseOf(archiveScroll.progress, GALLERY_RANGE));
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
          /* Add a `video` field to a project in content/projects.ts to swap
             its procedural preview for real footage. */
          videoSrc={(project as Project & { video?: string }).video}
        />
      ))}
    </group>
  );
}
