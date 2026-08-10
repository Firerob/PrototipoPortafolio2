'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DoubleSide, type Mesh, ShaderMaterial, Vector2, Vector3 } from 'three';
import { isWireframePhase, opening } from '@/lib/opening';

/*
  ── Why this no longer touches scene.overrideMaterial ───────────────────────

  The previous build forced every mesh in the scene through one wireframe
  material: the curved floor grid (120x120 segments), the backdrop word, the
  orbit cards, the archive corridor planes — everything, all at once. That
  reads as "raw crossed boxes", not as a sculpture materialising, because none
  of those meshes are the thing the opening is about.

  So the wireframe is now two purpose-built draws instead of a scene-wide
  override:

    - `hero`: the prism's own geometry, wireframe:true on its own material,
      revealed by the same radial shockwave front as before.
    - `floor`: a single quad with an analytic grid drawn in the fragment
      shader (not real mesh wireframe), coarse and radially faded so it reads
      as an instrument floor rather than a wall of lines.

  Everything else — the real Prism, CurvedGrid, BackdropWord, SpotGlow, the
  orbit cards, the archive corridor — stays invisible (HeroScene toggles a
  group's `visible`) until the bake, exactly like before, just without ever
  having been forced into a wireframe pass in the first place.
*/

const heroVertex = /* glsl */ `
  varying vec3 vWorld;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const heroFragment = /* glsl */ `
  precision highp float;

  uniform vec2  uResolution;
  uniform vec2  uCentre;     // shockwave origin, 0..1 screen space
  uniform float uWave;       // 0..1, front position
  uniform vec3  uLine;
  uniform vec3  uRim;
  uniform float uOpacity;

  varying vec3 vWorld;

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 d = (uv - uCentre) * vec2(uResolution.x / uResolution.y, 1.0);
    float dist = length(d) / length(vec2(uResolution.x / uResolution.y, 1.0));

    float front = uWave;
    if (dist > front) discard;

    // Rim: a thin hot band riding the leading edge, falling off inward — a
    // front travelling THROUGH the geometry rather than a mask scaling up.
    float rim = smoothstep(front, front - 0.09, dist);
    vec3 colour = mix(uRim, uLine, rim);

    float settle = smoothstep(front, front - 0.22, dist);
    gl_FragColor = vec4(colour, uOpacity * (0.35 + 0.65 * settle));
  }
`;

/*
  Floor: a shader-drawn grid on a 2-triangle quad, not a dense wireframe mesh.

  `fwidth` keeps the line a constant hairline width in screen space regardless
  of distance, `uFade` kills it toward the plane's edge so there is no visible
  boundary, and `uWave` — the same value driving the hero shockwave — reveals
  it radially outward from the spark so the floor and the sculpture ignite
  together rather than the floor simply being "on" from frame one.
*/
const floorVertex = /* glsl */ `
  varying vec2 vCoord;
  varying float vDist;

  void main() {
    vCoord = position.xy;
    vDist = length(position.xy);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const floorFragment = /* glsl */ `
  precision highp float;

  uniform vec3  uLine;
  uniform float uCell;
  uniform float uFade;
  uniform float uWave;
  uniform float uMaxDist;
  uniform float uOpacity;

  varying vec2  vCoord;
  varying float vDist;

  float gridMask(vec2 coord, float weight) {
    vec2 delta = fwidth(coord) * weight;
    vec2 g = abs(fract(coord - 0.5) - 0.5) / delta;
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    float radial = vDist / uMaxDist;
    if (radial > uWave) discard;

    float line = gridMask(vCoord / uCell, 1.0);

    // Squared falloff toward the plane's edge — an instrument floor fading
    // into dark, not a lit rectangle with a visible seam.
    float fade = 1.0 - smoothstep(uFade * 0.12, uFade, vDist);
    fade *= fade;

    float alpha = line * fade * uOpacity;
    if (alpha < 0.003) discard;

    gl_FragColor = vec4(uLine, alpha);
  }
`;

/** World-space half-extent of the floor quad. Kept modest: this floor only
 *  has to read during a ~2s wireframe phase, not cover the whole scene. */
const FLOOR_MAX_DIST = 20;

/**
 * Phases 0–1: the prism as a neon wireframe silhouette over an elegant,
 * radially-faded instrument floor — both revealed by the shockwave front.
 */
export default function GenesisWireframe() {
  const { size, viewport } = useThree();
  const hero = useRef<Mesh>(null);
  const floor = useRef<Mesh>(null);

  const heroMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: heroVertex,
        fragmentShader: heroFragment,
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

  const floorMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: floorVertex,
        fragmentShader: floorFragment,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: {
          uLine: { value: new Vector3(0.3, 0.85, 1.0) },
          uCell: { value: 2.2 },
          uFade: { value: 15 },
          uWave: { value: 0 },
          uMaxDist: { value: FLOOR_MAX_DIST },
          uOpacity: { value: 0.55 },
        },
      }),
    [],
  );

  // Disposed on unmount: each ShaderMaterial holds a compiled program, and
  // these are created outside R3F's reconciler so nothing else frees them.
  useEffect(
    () => () => {
      heroMaterial.dispose();
      floorMaterial.dispose();
    },
    [heroMaterial, floorMaterial],
  );

  useFrame(() => {
    const wire = isWireframePhase(opening.phase);

    if (hero.current) hero.current.visible = wire;
    if (floor.current) floor.current.visible = wire;
    if (!wire) return;

    const hu = heroMaterial.uniforms;
    hu.uResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
    hu.uCentre.value.set(opening.sparkX, 1 - opening.sparkY);
    hu.uWave.value = opening.wave;

    floorMaterial.uniforms.uWave.value = opening.wave;
  });

  return (
    <>
      {/* Same geometry and position as the real Prism (components/hero/Prism.jsx)
          so the wireframe silhouette lands exactly where the glass object
          will be once the bake hands over to it. */}
      <mesh ref={hero} position={[0, 0.05, 0]} material={heroMaterial} visible={false}>
        <cylinderGeometry args={[1.18, 1.18, 1.18, 3, 1]} />
      </mesh>

      {/* 2 triangles — the grid pattern is drawn analytically in the fragment
          shader, so density is a uniform (`uCell`), never a vertex count. */}
      <mesh
        ref={floor}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -2.1, 0]}
        material={floorMaterial}
        renderOrder={-2}
        visible={false}
      >
        <planeGeometry args={[FLOOR_MAX_DIST * 2, FLOOR_MAX_DIST * 2, 1, 1]} />
      </mesh>
    </>
  );
}
