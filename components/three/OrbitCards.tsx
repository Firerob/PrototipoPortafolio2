'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3, type Group, type ShaderMaterial } from 'three';
import type { Project } from '@/types/project';
import { setWorksCount, worksScroll } from '@/lib/worksScroll';
import {
  makeOrbitCardUniforms,
  orbitCardFragment,
  orbitCardVertex,
} from './orbitCardShader';

/** Radius of the ring the cards settle onto, around the prism at the origin. */
const ORBIT_RADIUS = 3.05;
/** Full turns the ring makes across the whole scroll. */
const ORBIT_TURNS = 0.85;
/** Where each card starts: off-screen left, so the sweep reads left-to-right. */
const ENTRY = new Vector3(-13, -1.2, 2.2);

const CARD_W = 1.34;
const CARD_H = 1.82;

/** Fraction of total scroll spent assembling the ring; the rest is orbiting. */
const ASSEMBLY = 0.45;

// Allocated once. Building Vector3s inside useFrame would mean hundreds of
// short-lived objects per second and periodic GC hitches.
const slot = new Vector3();

interface OrbitCardsProps {
  projects: Project[];
  reducedMotion?: boolean;
}

/**
 * Project cards as 3D panels that fly in and orbit the prism.
 *
 * Scroll does two things at once: it spins the prism (see Prism.jsx) and it
 * drags these cards in from off-screen left, one after another, onto a ring
 * that keeps turning around the model.
 *
 * All of it runs in ONE useFrame that walks the card array. Per-card useFrame
 * callbacks would mean N closures and N reads of the same scroll value every
 * frame; the single loop keeps cost proportional to card count with no
 * per-card overhead.
 */
export default function OrbitCards({ projects, reducedMotion = false }: OrbitCardsProps) {
  const groups = useRef<(Group | null)[]>([]);
  const materials = useRef<(ShaderMaterial | null)[]>([]);
  const { camera } = useThree();

  const uniformSets = useMemo(
    () => projects.map((project) => makeOrbitCardUniforms(project.tint)),
    [projects],
  );

  useLayoutEffect(() => {
    setWorksCount(projects.length);
  }, [projects.length]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const progress = worksScroll.progress;
    const count = projects.length;

    for (let i = 0; i < count; i += 1) {
      const group = groups.current[i];
      const material = materials.current[i];
      if (!group) continue;

      /*
        Staggered arrival.

        Each card gets its own slice of the assembly phase, overlapping its
        neighbours, so they stream in as a sequence instead of appearing as one
        block. The slices deliberately overlap (the /count window is wider than
        the i/count spacing) — a strict queue looks mechanical.
      */
      const start = (i / count) * ASSEMBLY;
      const arrival = MathUtils.clamp((progress - start) / (ASSEMBLY / count + 0.18), 0, 1);
      // smootherstep: zero velocity AND zero acceleration at both ends, so the
      // card neither jerks off the entry point nor punches into its slot.
      const eased = arrival * arrival * arrival * (arrival * (arrival * 6 - 15) + 10);

      // Orbital slot. The ring keeps rotating after assembly finishes, so the
      // cards revolve around the prism for the rest of the scroll.
      const angle =
        (i / count) * Math.PI * 2 + progress * ORBIT_TURNS * Math.PI * 2;

      slot.set(
        Math.sin(angle) * ORBIT_RADIUS,
        // Gentle vertical wave: a perfectly flat ring reads as a 2D circle.
        Math.sin(angle * 2 + i) * 0.34,
        Math.cos(angle) * ORBIT_RADIUS,
      );

      if (reducedMotion) {
        // No flight, no spin — cards sit in their slots, fully present.
        group.position.copy(slot);
        group.scale.setScalar(1);
      } else {
        group.position.lerpVectors(ENTRY, slot, eased);
        group.scale.setScalar(MathUtils.lerp(0.55, 1, eased));
      }

      /*
        Billboard to the camera.

        Facing outward from the ring centre would be more "physical", but the
        cards on the far side would then present their backs and the project
        artwork would be unreadable for half the orbit. Copying the camera's
        quaternion keeps every card legible; depth still does the work of
        showing which ones are behind the prism.
      */
      group.quaternion.copy(camera.quaternion);

      if (material) {
        const u = material.uniforms;
        u.uArrival.value = reducedMotion ? 1 : eased;
        // cos(angle) is +1 at the front of the ring and -1 at the back, which
        // is exactly the "how much is this card facing me" term the shader
        // wants for dimming and grid softness.
        u.uFacing.value = MathUtils.clamp((Math.cos(angle) + 1) * 0.5 + 0.18, 0, 1);
        if (!reducedMotion) u.uTime.value += dt;
      }

      // Cards that have not started arriving cost nothing: no draw call, no
      // shader invocation.
      group.visible = reducedMotion || arrival > 0.001;
    }
  });

  return (
    <group>
      {projects.map((project, i) => (
        <group
          key={project.id}
          ref={(node) => {
            groups.current[i] = node;
          }}
          visible={false}
        >
          <mesh>
            {/* Segmented: the arrival bow is a vertex displacement, so a 1x1
                quad would have no interior vertices to bend. */}
            <planeGeometry args={[CARD_W, CARD_H, 16, 20]} />
            <shaderMaterial
              ref={(node) => {
                materials.current[i] = node;
              }}
              uniforms={uniformSets[i]}
              vertexShader={orbitCardVertex}
              fragmentShader={orbitCardFragment}
              transparent
              // Depth writing off so the ring's own cards blend cleanly through
              // each other; three sorts transparent objects back-to-front, and
              // the cards are far enough apart for that to be correct.
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
