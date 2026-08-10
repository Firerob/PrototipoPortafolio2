'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  IcosahedronGeometry,
  MathUtils,
  MeshBasicMaterial,
  TorusGeometry,
  type Group,
  type Mesh,
} from 'three';
import {
  sceneScroll,
  smoothing,
  stageWeight,
  STAGE_CONTACT,
} from '@/lib/sceneScroll';

/*
  ── Contact's set piece: the signal transmitter ──────────────────────────────

  ContactSection calls itself "06 / Signal Transmitter" and its console reads
  `freq: … // encrypted`; the camera pose authored for this stage in
  lib/sceneScroll.ts is commented "pulled back wide, the field opening out
  around the transmitter". All three already describe this object — it just
  did not exist yet. This is that transmitter: a core that pulses and rings of
  signal broadcast outward from it.

  ── Why rings in the XY plane and not a radar disc on the floor ──────────────

  The obvious build for "transmitter" is a horizontal radar sweep. It cannot
  work at this camera: the Contact pose sits at y -3.4 looking at y -3.0, i.e.
  very slightly UPWARD, so a horizontal plane at the transmitter's own height
  is seen edge-on and renders as a hairline or nothing at all. The view
  direction is almost exactly -Z, so the plane that actually faces this camera
  is XY — which is TorusGeometry's own default orientation, no rotation
  needed. The rings therefore broadcast outward across the frame, which reads
  as transmission rather than as surveillance anyway.

  ── Why plain meshes and MeshBasicMaterial ───────────────────────────────────

  Deliberately boring machinery, chosen after a GPGPU particle field cost this
  page real frames and had to be pulled:

    - Seven meshes is seven draw calls. DeepField's own note puts the
      InstancedMesh threshold at 50+ objects; below it, instancing buys
      nothing and costs per-instance attribute plumbing.
    - MeshBasicMaterial gets scene fog automatically. A raw ShaderMaterial
      does not (three only wires the fog chunks into its built-in materials),
      which previously meant reimplementing the exp2 formula by hand just to
      keep one object consistent with the atmosphere around it.
    - No FBO, no render targets, no custom GLSL: nothing here can fail to
      compile.

  Animation is refs + useFrame only. Nothing calls setState, so the whole
  Contact stage costs zero React renders.
*/

/** Rings in flight at once. Each is the same geometry at a different phase of
 *  one shared lifecycle, so the emission reads as steady rather than bursty. */
const RING_COUNT = 6;
/** Seconds for one ring to travel from the core to full extent. */
const RING_PERIOD = 5.2;
const RING_MIN_RADIUS = 0.22;
const RING_MAX_RADIUS = 2.8;
/** How far a ring drifts toward the camera over its life. The rings are
 *  coplanar to the screen, so this Z travel is the only thing giving the
 *  broadcast real depth instead of reading as a flat 2D ripple. */
const RING_Z_TRAVEL = 1.6;

const SIGNAL = new Color('#4be1ff');
const STRUCTURE = new Color('#6d4bff');

/*
  Peak additive opacity per element.

  SceneScrim's alpha was measured against DeepField's peak — an additive mote
  at ~0.30 luminance — and ContactSection renders that scrim over this. These
  ceilings stay at or under that figure so the section's contrast budget is
  unchanged: the rings are thin (tube 0.012 at unit radius) and mostly do not
  overlap each other, and the core is small.
*/
const RING_PEAK = 0.30;
const CORE_PEAK = 0.26;
const FRAME_PEAK = 0.15;

export default function ContactTransmitter({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const frame = useRef<Mesh>(null);
  const ringRefs = useRef<(Mesh | null)[]>([]);

  /*
    One geometry shared by every ring, authored at unit radius and scaled per
    ring in useFrame — six TorusGeometries at six different radii would be six
    uploads of the same vertices.

    Materials, however, are per-ring: opacity is what carries a ring's whole
    lifecycle, and a shared material would make all six fade in lockstep.
  */
  const ringGeometry = useMemo(() => new TorusGeometry(1, 0.012, 6, 96), []);
  const ringMaterials = useMemo(
    () =>
      Array.from(
        { length: RING_COUNT },
        () =>
          new MeshBasicMaterial({
            color: SIGNAL,
            transparent: true,
            opacity: 0,
            blending: AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [],
  );

  const coreGeometry = useMemo(() => new IcosahedronGeometry(0.3, 1), []);
  const coreMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: SIGNAL,
        wireframe: true,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  // The apparatus the signal comes out of: a static outer hoop, slowly
  // rotating. Without it the rings read as a ripple with no source; with it
  // they read as something being emitted BY a machine.
  const frameGeometry = useMemo(() => new TorusGeometry(3.15, 0.007, 6, 128), []);
  const frameMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: STRUCTURE,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      ringGeometry.dispose();
      ringMaterials.forEach((m) => m.dispose());
      coreGeometry.dispose();
      coreMaterial.dispose();
      frameGeometry.dispose();
      frameMaterial.dispose();
    },
    [ringGeometry, ringMaterials, coreGeometry, coreMaterial, frameGeometry, frameMaterial],
  );

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    /*
      Scoped to the LAST stage, and gated before any work happens.

      stageWeight is a triangle peaking at its own stage, so this is 0 for the
      whole Index and News run, rises across About → Contact, and is 1 at
      Contact. Multiplying by presence keeps it absent through the hero as
      well. Returning early when it is dark means the transmitter costs
      nothing at all anywhere else on the page — the failure mode of the
      component this replaces was precisely that it was always running and
      always somewhere on screen.
    */
    const weight = stageWeight(sceneScroll.stage, STAGE_CONTACT) * sceneScroll.presence;
    node.visible = weight > 0.004;
    if (!node.visible) return;

    const dt = Math.min(delta, 1 / 30);
    const time = state.clock.elapsedTime;
    const t = smoothing(0.03, dt);

    // ── Rings ────────────────────────────────────────────────────────────
    for (let i = 0; i < RING_COUNT; i++) {
      const mesh = ringRefs.current[i];
      const material = ringMaterials[i];
      if (!mesh) continue;

      /*
        Evenly staggered phases of one shared 0..1 lifecycle. Under reduced
        motion the phase is frozen at each ring's offset rather than advanced,
        which leaves a still, legible set of concentric rings — the object is
        still there and still says "transmitter", it simply does not pulse.
      */
      const offset = i / RING_COUNT;
      const phase = reducedMotion ? offset : (time / RING_PERIOD + offset) % 1;

      const radius = MathUtils.lerp(RING_MIN_RADIUS, RING_MAX_RADIUS, phase);
      mesh.scale.setScalar(radius);
      mesh.position.z = phase * RING_Z_TRAVEL;

      /*
        Fast attack, long decay: a ring appears almost immediately at the core
        and thins out over the rest of its travel. A symmetric fade would make
        each ring brightest in the middle of the frame, which reads as a
        pulsing halo rather than as something leaving the transmitter.
      */
      const attack = MathUtils.smoothstep(phase, 0, 0.08);
      const decay = 1 - MathUtils.smoothstep(phase, 0.25, 1);
      material.opacity = RING_PEAK * attack * decay * weight;
    }

    // ── Core ─────────────────────────────────────────────────────────────
    const coreNode = core.current;
    if (coreNode) {
      if (!reducedMotion) {
        coreNode.rotation.y += dt * 0.55;
        coreNode.rotation.x += dt * 0.22;
      }
      // Breathes on a different period from the ring emission, so the core
      // and the rings never look welded to one clock.
      const breathe = reducedMotion ? 1 : 1 + Math.sin(time * 1.7) * 0.14;
      coreNode.scale.setScalar(breathe);
      coreMaterial.opacity = MathUtils.lerp(coreMaterial.opacity, CORE_PEAK * weight, t);
    }

    // ── Apparatus hoop ───────────────────────────────────────────────────
    const frameNode = frame.current;
    if (frameNode) {
      if (!reducedMotion) {
        // Slow, off-axis tumble. Rotating on Z alone would be invisible on a
        // circle; the X tilt is what makes the hoop read as a ring in space.
        frameNode.rotation.z += dt * 0.06;
        frameNode.rotation.x = 0.42 + Math.sin(time * 0.21) * 0.09;
      }
      frameMaterial.opacity = MathUtils.lerp(frameMaterial.opacity, FRAME_PEAK * weight, t);
    }
  });

  return (
    /*
      Right of frame centre and slightly low.

      Frame centre at this depth is (0.05, -3.10) with a half-width of ~11.9
      and half-height ~6.7 (Contact pose, fov 62). x 2.6 puts the transmitter
      about a fifth of the way out to the right edge — clear of the contact
      form, which occupies the left seven of twelve columns, and over the
      sparser email/socials column instead.
    */
    <group ref={group} position={[2.6, -3.5, -2.5]} visible={false}>
      <mesh ref={frame} geometry={frameGeometry} material={frameMaterial} />

      <mesh ref={core} geometry={coreGeometry} material={coreMaterial} />

      {ringMaterials.map((material, i) => (
        <mesh
          key={i}
          ref={(node) => {
            ringRefs.current[i] = node;
          }}
          geometry={ringGeometry}
          material={material}
        />
      ))}
    </group>
  );
}
