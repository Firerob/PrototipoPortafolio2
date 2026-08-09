'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3, type Group, type ShaderMaterial } from 'three';
import type { Project } from '@/types/project';
import { assemblyFraction, orbitPhase, setWorksCount, worksScroll } from '@/lib/worksScroll';
import {
  makeOrbitCardUniforms,
  orbitCardFragment,
  orbitCardVertex,
} from './orbitCardShader';

/*
  Ring and card sizing, set against the camera rather than by eye.

  Camera sits at z = 5.2 with a 42° vertical fov, so the front of the ring is
  (5.2 - ORBIT_RADIUS) away and the viewport is 2·d·tan(21°) tall there. The
  first pass used radius 3.05 with a 1.82-tall card: front distance 2.15,
  visible height 1.74 — the active card covered 105% of the frame, swallowing
  the prism and bleeding off both edges.

  These numbers put the front card at ~62% of frame height: unmistakably the
  focus, while the prism and its neighbours stay visible around it.
*/
const ORBIT_RADIUS = 2.78;
/** Where each card starts: off-screen left, so the sweep reads left-to-right. */
const ENTRY = new Vector3(-13, -1.2, 2.2);

const CARD_W = 0.92;
const CARD_H = 1.24;

/** Smoothed follow of the raw scroll value — see the useFrame comment. */
const SCRUB_LAMBDA = 0.0016;

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
  const scrubbed = useRef(0);
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
    const count = projects.length;

    /*
      Damped follow of the raw scroll value.

      This is the `scrub: 1` feel, applied where it can actually work. GSAP's
      `scrub` only smooths a tween's playhead, and this ScrollTrigger drives a
      value via onUpdate rather than tweening anything — setting `scrub` on it
      is a no-op. Easing the consumed value here gives the same weighted lag,
      and 1 - lambda^dt makes it frame-rate independent so 144Hz and 60Hz
      settle at the same speed.
    */
    scrubbed.current = reducedMotion
      ? worksScroll.progress
      : scrubbed.current +
        (worksScroll.progress - scrubbed.current) * (1 - Math.pow(SCRUB_LAMBDA, dt));

    const progress = scrubbed.current;

    /*
      Ring rotation.

      Two fixes over the previous version, both of which the measured capture
      exposed:

      1. Direction is NEGATIVE. Adding the rotation brought cards to the front
         in reverse index order (5,4,3,2,1) while the caption counted upward,
         so the panel never described the card you were looking at.
      2. The sweep is exactly (count-1)/count turns across the orbit phase,
         not a hand-picked 0.85. Card i now faces the camera at precisely
         orbitPhase == i/(count-1): card 0 as the ring starts turning, the
         last card exactly at the end of the pin, evenly spaced in between.
         worksScroll.setWorksProgress inverts this same expression for the
         caption, so the two cannot drift apart again.
    */
    const phase = orbitPhase(progress, count);
    const rotation = count > 1 ? (phase * (count - 1) * Math.PI * 2) / count : 0;
    const assembly = assemblyFraction(count);

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
      const start = (i / count) * assembly;
      // Window sized so the LAST card still finishes flying in by the time the
      // assembly phase ends. Deriving it from `assembly` (rather than adding a
      // fixed 0.18) keeps that true at any card count.
      const window = assembly / count + assembly * 0.55;
      const arrival = MathUtils.clamp((progress - start) / window, 0, 1);
      // smootherstep: zero velocity AND zero acceleration at both ends, so the
      // card neither jerks off the entry point nor punches into its slot.
      const eased = arrival * arrival * arrival * (arrival * (arrival * 6 - 15) + 10);

      // Orbital slot. Negative rotation so cards front in index order.
      const angle = (i / count) * Math.PI * 2 - rotation;

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
