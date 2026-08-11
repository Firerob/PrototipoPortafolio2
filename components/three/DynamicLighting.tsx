'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type AmbientLight, type PointLight, type SpotLight } from 'three';
import { usePointerVector } from './PointerProvider';
import { isWireframePhase, opening } from '@/lib/opening';
import { HUE_SATURATION, lightHueAt, rimHueAt, sceneLight } from '@/lib/palette';

/*
  Frame-rate independent approach factor: MathUtils.lerp(a, b, 0.1) converges
  twice as fast at 120Hz as at 60Hz, so the scene would literally feel
  different on different monitors.
*/
const smoothing = (lambda: number, dt: number) => 1 - Math.pow(lambda, dt);

/** Ambient level once the scene is live. */
const AMBIENT_LIVE = 0.25;
/** During the opening's wireframe phases the background must read as
 *  near-black, so only the spark and the lit prism are visible. */
const AMBIENT_OPENING = 0.05;

/** Base key intensity, before the idle breath modulates it. */
const KEY_INTENSITY = 34;
const RIM_INTENSITY = 11;

/**
 * The scene's lights: cursor-drifting, hue-cycling, and quietly breathing.
 *
 * These two lights are the ONLY chromatic element in the 3D scene, and
 * everything else picks its colour up from them rather than carrying its own:
 * the prism refracts them, the floor grid and the bloom read the published
 * hue directly, and the backdrop word is pure white so it takes the light
 * cleanly. That is the whole trick — colouring the objects individually is
 * what failed before, because a transmission material lit by white is grey no
 * matter what tint you give the glass.
 *
 * ── Why the lights drift with the cursor at all ─────────────────────────────
 *
 * Moving the key light rather than only the camera is what makes the prism's
 * specular highlight travel across its faces. Camera-only parallax slides the
 * whole image; moving the light changes how the object is lit, which is the
 * cue that actually reads as depth.
 */
export default function DynamicLighting({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const key = useRef<SpotLight>(null);
  const rim = useRef<PointLight>(null);
  const ambient = useRef<AmbientLight>(null);
  const pointer = usePointerVector();
  /** Own clock rather than state.clock.elapsedTime: this one is fed the same
   *  delta-clamped dt as everything else here, so a tab switch cannot jump
   *  the hue by however many seconds the tab was hidden. */
  const clock = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    // Slower than the camera on purpose: lights trailing the cursor feel like
    // mass. Matching speeds makes the whole scene look welded together.
    const t = smoothing(0.05, dt);
    const px = reducedMotion ? 0 : pointer.x;
    const py = reducedMotion ? 0 : pointer.y;

    /*
      ── The single writer for the light hue ───────────────────────────────

      This used to read sceneColor.current.key — the scroll palette — and set
      the lights to it every frame. That is why every attempt to give the
      prism a colour "did nothing": whatever tint the glass was given, the
      light landing on it was reset to near-white 60 times a second, and a
      transmission material lit by white over a black background is grey.

      Now the palette drives the ROOM (the DOM background, via ColorMorph)
      and this drives the LIGHT. One writer each, no fight.
    */
    clock.current += reducedMotion ? 0 : dt;
    const hue = lightHueAt(clock.current);
    sceneLight.hue = hue;

    if (key.current) {
      key.current.position.x = MathUtils.lerp(key.current.position.x, px * 2.6, t);
      key.current.position.y = MathUtils.lerp(key.current.position.y, 2.4 + py * 1.1, t);
      key.current.color.setHSL(hue, HUE_SATURATION, 0.5);
      /*
        The idle breath, and the only place it is applied.

        ColorMorph computes it as a single scalar so every consumer breathes on
        one clock. It rides intensity rather than colour: a hue that wanders
        while nothing else moves reads as a colour-management bug, whereas a
        light that swells 5% reads as a room with air in it. Held at exactly 1
        under reduced motion.
      */
      key.current.intensity =
        KEY_INTENSITY * (reducedMotion ? 1 : 1 + Math.sin(clock.current * 0.45) * 0.05);
    }

    if (rim.current) {
      // Counter-moving: opposes the key so the silhouette stays separated from
      // the background at every cursor position.
      rim.current.position.x = MathUtils.lerp(rim.current.position.x, 3.5 - px * 2.2, t);
      rim.current.position.y = MathUtils.lerp(rim.current.position.y, -1.6 - py * 0.8, t);
      /*
        A different point on the same arc — see rimHueAt for why the offset is
        applied to the phase rather than to the hue. The two lights are never
        the same colour, which is what puts cyan on one face of the prism
        while violet rakes another; a shape lit by one hue from both sides is
        flat however saturated it is.
      */
      rim.current.color.setHSL(rimHueAt(clock.current), HUE_SATURATION * 0.85, 0.5);
    }

    if (ambient.current) {
      const want = isWireframePhase(opening.phase) ? AMBIENT_OPENING : AMBIENT_LIVE;
      ambient.current.intensity = MathUtils.lerp(ambient.current.intensity, want, t);
    }
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={AMBIENT_LIVE} />
      <spotLight
        ref={key}
        position={[0, 2.4, -3.2]}
        target-position={[0, 0, 0]}
        angle={0.72}
        penumbra={1}
        intensity={KEY_INTENSITY}
        distance={18}
      />
      <pointLight ref={rim} position={[3.5, -1.6, 2.4]} intensity={RIM_INTENSITY} />
    </>
  );
}
