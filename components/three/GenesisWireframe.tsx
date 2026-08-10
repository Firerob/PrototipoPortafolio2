'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ShaderMaterial, Vector2, Vector3 } from 'three';
import { isWireframePhase, opening } from '@/lib/opening';

/*
  ── Why scene.overrideMaterial and not a traverse ───────────────────────────

  The obvious build is `scene.traverse(o => o.material.wireframe = true)`, and
  it is the wrong tool three times over:

    - It has to remember and restore every original material, and materials
      here are shared between meshes, so "restore" is not a simple map.
    - MeshTransmissionMaterial (the prism) does its own render passes; setting
      `wireframe` on it produces a mess rather than a wireframe.
    - It cannot do a radial reveal at all. Wireframe is a boolean per material;
      the shockwave needs a per-FRAGMENT decision.

  `scene.overrideMaterial` is one assignment that forces every mesh through one
  material, and one `= null` to undo it with nothing left behind. Because that
  material is ours, the reveal front can be real: the fragment shader discards
  everything outside the expanding radius and lights a rim exactly at it.
*/

const vertex = /* glsl */ `
  varying vec3 vWorld;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  precision highp float;

  uniform vec2  uResolution;
  uniform vec2  uCentre;     // shockwave origin, 0..1 screen space
  uniform float uWave;       // 0..1, front position
  uniform vec3  uLine;
  uniform vec3  uRim;
  uniform float uOpacity;

  varying vec3 vWorld;

  void main() {
    /*
      Screen-space distance from the origin, normalised so 1.0 is the furthest
      corner. Using gl_FragCoord rather than a world-space radius on purpose:
      the brief's wave covers the SCREEN, and a world-space sphere expanding
      through a scene with objects at wildly different depths reaches the
      corners at times that have nothing to do with what the viewer sees.
    */
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 d = (uv - uCentre) * vec2(uResolution.x / uResolution.y, 1.0);
    float dist = length(d) / length(vec2(uResolution.x / uResolution.y, 1.0));

    float front = uWave;
    if (dist > front) discard;

    // Rim: a thin hot band riding the leading edge, falling off inward. This
    // is what makes it read as a front travelling THROUGH the geometry rather
    // than as a circular mask being scaled up over a finished image.
    float rim = smoothstep(front, front - 0.09, dist);
    vec3 colour = mix(uRim, uLine, rim);

    // Lines fade in slightly behind the front so the structure settles rather
    // than snapping on at full strength.
    float settle = smoothstep(front, front - 0.22, dist);
    gl_FragColor = vec4(colour, uOpacity * (0.35 + 0.65 * settle));
  }
`;

/**
 * Phases 0–1: the whole scene as a neon wireframe, revealed by a radial front.
 *
 * ── How the hand-off to real materials avoids a pop ─────────────────────────
 *
 * There is no cross-fade between an override material and the real ones — the
 * override REPLACES them, so while it is set the real materials are not being
 * rendered at all and there is nothing to fade between.
 *
 * The sequence solves this itself, and it is worth noticing that the brief
 * already ordered it correctly: the override is dropped on the same frame the
 * massive bokeh arrives. A `bokehScale` of 9 across the entire frame is a very
 * effective cover — the switch happens underneath a blur strong enough that no
 * edge in the image is legible. The blur is not a workaround bolted on to hide
 * a seam; it is the reason the seam can exist at all.
 */
export default function GenesisWireframe() {
  const { scene, size, viewport } = useThree();

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        wireframe: true,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uResolution: { value: new Vector2(1, 1) },
          uCentre: { value: new Vector2(0.5, 0.5) },
          uWave: { value: 0 },
          uLine: { value: new Vector3(0.42, 0.36, 1.0) },
          uRim: { value: new Vector3(0.55, 0.95, 1.0) },
          uOpacity: { value: 1 },
        },
      }),
    [],
  );

  // Disposed on unmount: a ShaderMaterial holds a compiled program, and this
  // one is created outside R3F's reconciler so nothing else will free it.
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const wire = isWireframePhase(opening.phase);

    /*
      Assigned every frame while active rather than once on phase change.
      Meshes mount and unmount during the opening — drei's Environment, the
      Suspense boundaries around the prism and the backdrop word — and a
      one-shot assignment made at phase entry would miss anything that arrived
      afterwards, leaving a few objects rendering their real materials in the
      middle of a wireframe scene.
    */
    if (wire) {
      if (scene.overrideMaterial !== material) scene.overrideMaterial = material;

      const u = material.uniforms;
      u.uResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
      u.uCentre.value.set(opening.sparkX, 1 - opening.sparkY);
      u.uWave.value = opening.wave;
    } else if (scene.overrideMaterial === material) {
      // Exactly one frame's work to hand the scene back.
      scene.overrideMaterial = null;
    }
  });

  // Also clear on unmount, in case the component is removed mid-phase — an
  // override left behind would render the entire site as wireframe forever.
  useEffect(
    () => () => {
      if (scene.overrideMaterial === material) scene.overrideMaterial = null;
    },
    [scene, material],
  );

  return null;
}
