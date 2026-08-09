'use client';

import { Suspense, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useVideoTexture } from '@react-three/drei';
import { Color, DoubleSide, type Mesh, type ShaderMaterial, type Texture } from 'three';
import type { Project } from '@/types/project';

const PLANE_W = 2.24;
const PLANE_H = 1.28;

/*
  One shader for both cases: `uHasMap` switches between sampling the video
  texture and generating a procedural preview, so there is a single material
  and a single draw path whether or not footage exists.

  The oblique corner mask and the blueprint crosses are computed here rather
  than supplied as an alpha texture — they stay crisp at any distance and cost
  no extra fetch.
*/
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform float uTime;
  uniform float uReveal;
  uniform vec3  uTintA;
  uniform vec3  uTintB;

  varying vec2  vUv;
  varying float vDepth;

  // Blueprint tick marks: a '+' at every grid intersection.
  float crosses(vec2 uv, float cells, float thickness, float arm) {
    vec2 g = fract(uv * cells) - 0.5;
    vec2 d = abs(g);
    float horiz = step(d.y, thickness) * step(d.x, arm);
    float vert  = step(d.x, thickness) * step(d.y, arm);
    return clamp(horiz + vert, 0.0, 1.0);
  }

  void main() {
    /*
      Oblique mask: corners sliced along a shallow chord instead of rounded,
      per the brief's diagonal cuts. Computed in UV space so the cut angle is
      identical on every plane regardless of its tilt.
    */
    vec2 q = abs(vUv - 0.5) * 2.0;
    if ((q.x * 0.34 + q.y) - 1.16 > 0.0) discard;

    vec3 color;
    if (uHasMap > 0.5) {
      color = texture2D(uMap, vUv).rgb;
    } else {
      /*
        Procedural stand-in for missing footage: drifting interference bands
        over the project's own tint pair. Deliberately reads as "signal"
        rather than as a broken image.
      */
      float bands = sin((vUv.y * 26.0) + uTime * 1.3 + sin(vUv.x * 5.0) * 2.0);
      float sweep = sin((vUv.x - uTime * 0.16) * 9.0);
      float mixv = clamp(0.5 + 0.32 * bands + 0.18 * sweep, 0.0, 1.0);
      color = mix(uTintA, uTintB, mixv);
      color += smoothstep(0.986, 1.0, sin(vUv.y * 700.0)) * 0.16;
    }

    color += vec3(0.72, 0.78, 1.0) * crosses(vUv, 9.0, 0.012, 0.05) * 0.5;

    // Edge line so each plane reads as a discrete panel in the depth stack.
    float border = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    color += vec3(0.55, 0.5, 1.0) * (1.0 - smoothstep(0.0, 0.006, border)) * 0.9;

    /*
      Distance haze, floored at 0.45.

      An earlier 0.12 floor was tuned against a dark background; on the
      archive's light background it made the back half of the corridor vanish.
    */
    float haze = 1.0 - smoothstep(6.0, 24.0, vDepth);
    float alpha = uReveal * mix(0.45, 1.0, haze);
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

interface PlaneLayout {
  project: Project;
  /** Position along the corridor, 0-based. */
  slot: number;
  /** Shared 0..1 reveal, computed once per frame by ArchiveGallery. */
  revealRef: RefObject<number>;
  /** Shared depth scroll of the corridor, in world units. */
  travelRef: RefObject<number>;
}

/** The mesh itself. Receives an already-resolved texture (or null) so it never
 *  calls a suspending hook and can therefore never be the thing that stalls. */
function PlaneBody({
  project,
  slot,
  revealRef,
  travelRef,
  texture,
}: PlaneLayout & { texture: Texture | null }) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uHasMap: { value: texture ? 1 : 0 },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uTintA: { value: new Color(project.tint[0]) },
      uTintB: { value: new Color(project.tint[1]) },
    }),
    [texture, project.tint],
  );

  useFrame((_, delta) => {
    const node = mesh.current;
    if (!node) return;
    const dt = Math.min(delta, 1 / 30);
    const reveal = revealRef.current ?? 0;
    const travel = travelRef.current ?? 0;

    node.visible = reveal > 0.001;
    if (!node.visible) return;

    /*
      Corridor layout: planes alternate left/right and recede into -Z, yawed
      to face the centre line. That inward yaw is what produces the perspective
      distortion — a plane parallel to the screen reads as a flat card however
      far away it is.

      Depth is tuned against where the camera ends up (z=0.55 looking at -6)
      and against the frustum there. Earlier passes put the nearest plane 2-3
      units out, which at a 63-degree horizontal fov is closer than the plane
      is wide: one panel filled the frame and the rest flew past the lens.
    */
    const side = slot % 2 === 0 ? -1 : 1;
    const z = -7.6 - slot * 2.8 + travel;

    // Raised into the upper band: at the previous height the nearest plane
    // overlapped the DOM project list along the bottom edge and made it
    // unreadable.
    node.position.set(side * 1.6, (slot % 3) * 0.4 + 0.25, z);
    node.rotation.set(-0.07, side * -0.5, side * 0.04);

    if (material.current) {
      const u = material.current.uniforms;
      u.uTime.value += dt;
      u.uReveal.value = reveal;
    }
  });

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[PLANE_W, PLANE_H, 1, 1]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

/** Video path. Only ever mounted when a real src exists. */
function VideoPlane({ src, ...layout }: PlaneLayout & { src: string }) {
  const texture = useVideoTexture(src, {
    start: true,
    muted: true,
    loop: true,
    playsInline: true,
    crossOrigin: 'anonymous',
  });
  return <PlaneBody {...layout} texture={texture} />;
}

export default function ArchivePlane({
  videoSrc,
  ...layout
}: PlaneLayout & { videoSrc?: string }) {
  /*
    Conditional COMPONENT, not conditional hook.

    The first version called useVideoTexture unconditionally with `src ?? ''`
    on the assumption that drei tolerates an empty source. It does not — it
    suspends forever waiting for a video that never arrives, and the
    <Suspense fallback={null}> wrapped around it silently swallowed the whole
    corridor. A live probe showed the gallery group reporting children: 0
    while every other value looked healthy.

    Splitting the hook into its own component keeps hook order stable inside
    each branch while letting the no-video case mount with no suspending hook
    at all. The Suspense fallback now renders the procedural plane rather than
    null, so a buffering video shows the placeholder instead of a hole.
  */
  if (!videoSrc) return <PlaneBody {...layout} texture={null} />;

  return (
    <Suspense fallback={<PlaneBody {...layout} texture={null} />}>
      <VideoPlane {...layout} src={videoSrc} />
    </Suspense>
  );
}
