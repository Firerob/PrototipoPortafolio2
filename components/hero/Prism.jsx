'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, MeshTransmissionMaterial } from '@react-three/drei';
import { Euler, MathUtils, Quaternion } from 'three';
import { damp, orientation } from '@/lib/frameState';
import { usePointerVector } from '@/components/three/PointerProvider';
import { worksScroll } from '@/lib/worksScroll';

// Allocated once at module scope. Creating a Quaternion inside useFrame would
// mean ~60 short-lived objects per second per instance and periodic GC hitches.
const targetQuat = new Quaternion();
const scratchEuler = new Euler();

/**
 * The central glass/chrome prism.
 *
 * A 3-segment cylinder is an exact triangular prism, which reads as the
 * stylised logo mark while staying a 24-triangle primitive.
 */
export default function Prism({ reducedMotion = false, quality = 'high' }) {
  const mesh = useRef(null);
  const spin = useRef(0);
  const pointer = usePointerVector();

  useFrame((_, delta) => {
    const node = mesh.current;
    if (!node) return;

    // Clamp: after a tab switch, delta can arrive as several seconds and the
    // prism would snap through a full rotation in one frame.
    const dt = Math.min(delta, 1 / 30);

    if (!reducedMotion) spin.current += dt * 0.24;

    /*
      Scroll drives the prism's rotation on top of its idle spin.

      This is the motor of the whole sequence: the model turning is what the
      cards appear to be dragged in by. Reading the scroll value here rather
      than animating the mesh from GSAP keeps one authority over the
      quaternion — two writers would fight and the prism would stutter.
    */
    const scrollSpin = reducedMotion ? 0 : worksScroll.progress * Math.PI * 2.4;

    // Pointer parallax: cursor position becomes a small euler offset layered
    // on top of the idle spin, then slerped so the prism trails the cursor
    // with inertia instead of snapping to it.
    const tiltX = reducedMotion ? 0 : -pointer.y * 0.34;
    const tiltY = reducedMotion ? 0 : pointer.x * 0.5;

    scratchEuler.set(tiltX + 0.16, spin.current + scrollSpin + tiltY, tiltY * 0.14);
    targetQuat.setFromEuler(scratchEuler);
    node.quaternion.slerp(targetQuat, damp(0.0015, dt));

    /*
      The model recedes as the ring assembles.

      This has to happen IN the scene, not by fading the canvas element: the
      cards share that element, so dimming it would dim them too — right at the
      moment they are supposed to be arriving. Shrinking the prism instead
      gives the cards room and reads as depth rather than as a fade-out.
    */
    const recede = reducedMotion
      ? 1
      : MathUtils.lerp(1, 0.68, Math.min(worksScroll.progress / 0.4, 1));
    node.scale.setScalar(recede);

    // Publish for the HUD gizmo. Plain assignment — no setState, no re-render.
    orientation.x = node.quaternion.x;
    orientation.y = node.quaternion.y;
    orientation.z = node.quaternion.z;
    orientation.w = node.quaternion.w;
  });

  const high = quality === 'high';

  return (
    <mesh ref={mesh} position={[0, 0.05, 0]}>
      <cylinderGeometry args={[1.18, 1.18, 1.18, 3, 1]} />
      <MeshTransmissionMaterial
        // Refraction + dispersion: the giant word and the grid behind the
        // prism are what actually shows through, so the backdrop is doing
        // double duty as the refraction subject.
        transmission={1}
        thickness={1.7}
        ior={1.76}
        roughness={0.05}
        chromaticAberration={0.38}
        anisotropicBlur={0.28}
        distortion={0.22}
        distortionScale={0.4}
        temporalDistortion={0.08}
        // Iridescence is what separates "glass" from the oil-slick chrome look.
        iridescence={1}
        iridescenceIOR={1.62}
        iridescenceThicknessRange={[100, 900]}
        color="#dfe6ff"
        attenuationColor="#7d6bff"
        attenuationDistance={2.4}
        // Cost dials. MeshTransmissionMaterial re-renders the scene into an FBO
        // every frame, so resolution/samples are the two knobs that decide
        // whether this holds 60fps. PerformanceMonitor flips `quality`.
        resolution={high ? 512 : 192}
        samples={high ? 6 : 2}
        backside={false}
        toneMapped={false}
      />
      {/* Glowing edge wire — reads as the chrome bevel against the dark grid. */}
      <Edges scale={1.001} threshold={15} color="#9c8dff" />
    </mesh>
  );
}
