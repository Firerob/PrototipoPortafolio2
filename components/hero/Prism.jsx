'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, MeshTransmissionMaterial } from '@react-three/drei';
import { Euler, MathUtils, Quaternion } from 'three';
import { damp, orientation } from '@/lib/frameState';
import { usePointerVector } from '@/components/three/PointerProvider';
import { worksScroll } from '@/lib/worksScroll';
import { sceneScroll, smootherstep } from '@/lib/sceneScroll';
import { softFitFactor } from '@/lib/responsive3d';

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
export default function Prism({ reducedMotion = false, quality = 'high', isMobile = false }) {
  const mesh = useRef(null);
  const spin = useRef(0);
  const pointer = usePointerVector();

  useFrame((state, delta) => {
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

    /*
      ── Responsive fit ────────────────────────────────────────────────────

      Folded into the scale that was already being written here rather than
      passed as a `scale` prop: this line runs every frame, so a prop would be
      overwritten before it was ever seen.

      state.viewport is recomputed by R3F on every canvas resize, and an
      orientation change IS a resize — so reading it here means the prism
      re-fits itself on rotation with no listener, no breakpoint and no
      reload. At 2.36 units across it was covering 124% of an iPhone 14's
      visible width; softFitFactor brings that to roughly 44%.
    */
    const fit = softFitFactor(state.viewport.width);
    node.scale.setScalar(recede * fit);


    /*
      ── Stop the transmission passes once the hero is gone ─────────────────

      This is a real cost, not a micro-optimisation, and it was being paid on
      every frame of every section below the hero.

      MeshTransmissionMaterial renders the whole scene into its own FBO each
      frame — literally `gl.render(scene, camera)` a second time — and drei
      guards that work with `material.visible` (MeshTransmissionMaterial.js,
      "the buffers cannot be observed while the material is invisible").

      HeroWorld hides this object by setting `visible` on the GROUP above it.
      That stops the mesh being drawn, but it is a different flag: the
      material's own `visible` stays true forever, so the extra full-scene
      render kept running for the entire page while the prism was nowhere on
      screen. Mirroring HeroWorld's own condition here is what actually turns
      it off.
    */
    const material = node.material;
    if (material) {
      const hand = smootherstep(sceneScroll.presence);
      material.visible = hand < 0.995;
    }

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
        thickness={2}
        ior={1.5}
        roughness={0.1}
        chromaticAberration={0.05}
        anisotropicBlur={0.28}
        distortion={0.22}
        distortionScale={0.4}
        temporalDistortion={0.08}
        // Iridescence is what separates "glass" from the oil-slick chrome look.
        iridescence={1}
        iridescenceIOR={1.5}
        iridescenceThicknessRange={[100, 400]}
        /*
          Both deliberately near-white. The glass no longer carries a colour
          of its own — DynamicLighting's two hue-cycling lights do, and this
          material's job is to transmit and split them rather than to add a
          tint that would mute whatever colour arrives.
        */
        color="#ffffff"
        attenuationColor="#f2f4fa"
        attenuationDistance={2.4}
        /*
          ── The cost dials ──────────────────────────────────────────────

          `resolution` is the size of the FBO the whole scene is re-rendered
          into every frame, so its cost is quadratic: 512 is 16x the fill of
          128. Mobile drops to 128 and one sample, which is the single
          largest saving available on this object.

          `samples` is how many taps the blur takes. At roughness 0.1 the
          difference between 6 and 1 is barely legible on a phone screen and
          costs six texture fetches per fragment.
        */
        resolution={isMobile ? 128 : high ? 512 : 256}
        samples={isMobile ? 1 : high ? 6 : 2}
        /*
          On mobile, hand the buffer to three's own transmission pass.

          Verified against drei's source rather than assumed: the extra
          `gl.render(scene, camera)` is guarded by `!transmissionSampler`
          (MeshTransmissionMaterial.js), so turning this ON removes that
          second full-scene render entirely and reuses the one the renderer
          already does for transmissive materials. USE_SAMPLER only changes
          which texture the shader reads — the distortion and chromatic
          aberration maths are untouched, so the look is preserved.

          Desktop keeps the dedicated buffer, where the extra pass is
          affordable and gives the cleaner refraction.
        */
        transmissionSampler={isMobile}
        backside={false}
        toneMapped={false}
      />
      {/* Glowing edge wire — reads as the chrome bevel against the dark grid. */}
      <Edges scale={1.001} threshold={15} color="#aeb6c6" />
    </mesh>
  );
}
