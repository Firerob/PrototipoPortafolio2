'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  DepthOfField,
  ChromaticAberration,
} from '@react-three/postprocessing';
import { Vector2 } from 'three';
import { opening } from '@/lib/opening';

/*
  Lens numbers, in world units. The prism sits at the origin and the hero
  camera at z ≈ 6, so a focus distance of 0.02 (normalised) puts the plane of
  sharpness right against the lens — everything in the scene is behind it and
  therefore maximally defocused. Snapping to 0.055 lands it on the prism.
*/
const FOCUS_NEAR = 0.02;
const FOCUS_SHARP = 0.055;
const BOKEH_MAX = 9;
const BOKEH_MIN = 0;
const CA_MAX = 0.0055;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The lens: extreme defocus and fringing that resolve to nothing.
 *
 * ── Why this is mounted only during the opening ─────────────────────────────
 *
 * I argued against an EffectComposer on this page once already, and that
 * argument was half right, so it is worth being precise about which half.
 *
 * The canvas runs `alpha: true` with `setClearAlpha(0)` and composites over
 * the fluid simulation underneath. Noise and Vignette are additive full-screen
 * passes: they write colour into every pixel including the transparent ones,
 * which would paint over the fluid layer for the whole session. That is why
 * those two live in CSS in FilmGrain instead.
 *
 * DepthOfField and ChromaticAberration are not that. They are sampling and
 * distortion effects — they move and blur pixels that already exist rather
 * than laying new colour over the frame. But a composer still adds a
 * render-target round trip per frame, and the safest answer to "does the alpha
 * survive three passes" is to not need it to for longer than a moment.
 *
 * So this whole component unmounts the instant the sequence finishes. The
 * composer exists for about four seconds and the page spends the remaining
 * however-many minutes on the plain renderer it had before.
 *
 * It mounts at the FIRST phase, not at the bake where the blur is actually
 * wanted. An EffectComposer compiles its pass shaders on first render, and
 * that compile costs frames; doing it during the black singularity screen —
 * where `defocus` is still 0 and the composer is effectively a pass-through —
 * means the bokeh slam later is a uniform change rather than a compile. That
 * is the whole answer to "no FPS drop at the transition".
 *
 * ── Why refs and useFrame instead of props ──────────────────────────────────
 *
 * Passing `focusDistance={focus}` from React state would re-render this
 * subtree — and rebuild the effect passes — on every frame of the snap. The
 * effect instances are grabbed by ref and their uniforms written directly, so
 * the tween costs one property write per frame and zero reconciliation.
 */
export default function CalibrationEffects() {
  // The pmndrs wrappers forward refs to the underlying postprocessing Effect
  // instances, which is what exposes the writable uniforms below.
  const dof = useRef<any>(null);
  const ca = useRef<any>(null);
  const offset = useRef(new Vector2(0, 0));

  useFrame(() => {
    const { defocus, pulse } = opening;

    /*
      `pulse` only has authority while the lens is still wide open. Letting it
      keep modulating as the image sharpens would leave the finished frame
      breathing, which reads as an unstable render rather than as a lens that
      has settled.
    */
    const wobble = pulse * defocus;
    // f is sharpness: 1 = resolved. Kept as the inverse of `defocus` because
    // every lerp below reads more naturally from blurred toward sharp.
    const f = Math.min(1, Math.max(0, 1 - defocus - wobble * 0.06));

    if (dof.current) {
      // focusDistance is normalised 0..1 across the camera's near/far range,
      // NOT a world distance — a common trip-up that makes the plane of focus
      // land somewhere behind the scene entirely.
      dof.current.circleOfConfusionMaterial.uniforms.focusDistance.value = lerp(
        FOCUS_NEAR,
        FOCUS_SHARP,
        f,
      );
      dof.current.bokehScale = lerp(BOKEH_MAX, BOKEH_MIN, f);
    }

    if (ca.current) {
      // Fringing falls off faster than the blur (squared), so the colour
      // separation is gone slightly before the image finishes resolving —
      // which is the order a real lens does it in.
      const amount = CA_MAX * Math.pow(1 - f, 2);
      offset.current.set(amount, amount * 0.6);
      ca.current.offset = offset.current;
    }
  });

  return (
    /*
      multisampling={0} because MSAA and a depth-sampling effect do not mix:
      DepthOfField reads the depth texture, and a multisampled depth buffer has
      to be resolved before it can be read, which costs a blit per frame for an
      anti-aliasing benefit nobody can see through a bokehScale of 9.

      `enableNormalPass` is off for the same reason — nothing here needs
      normals, and the pass is not free.
    */
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <DepthOfField
        ref={dof}
        focusDistance={FOCUS_NEAR}
        focalLength={0.02}
        bokehScale={BOKEH_MAX}
      />
      {/*
        Only ref and offset are passed, and that is forced by a typings bug
        rather than by choice: ChromaticAberrationProps is
        `Omit<Partial<ConstructorParameters<...>[0]>, 'offset'>`, and because
        that constructor parameter is itself optional the union with
        `undefined` collapses the Partial — blendFunction, radialModulation and
        modulationOffset all vanish from the accepted props.

        No loss here. The effect defaults to normal blending with
        radialModulation off, which is exactly the uniform lateral fringing
        this wants; radial modulation biases the shift toward the frame edges,
        which reads as a fisheye rather than as a lens finding focus.
      */}
      <ChromaticAberration ref={ca} offset={new Vector2(CA_MAX, CA_MAX * 0.6)} />
    </EffectComposer>
  );
}
