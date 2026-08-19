'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useTexture, useVideoTexture } from '@react-three/drei';
import { Color, DoubleSide, SRGBColorSpace, type Mesh, type ShaderMaterial, type Texture } from 'three';
import type { Project } from '@/types/project';
import { asset } from '@/lib/asset';
import { openProjectDetail } from '@/lib/projectDetail';
import { isNarrowViewport } from '@/lib/responsive3d';

const PLANE_W = 2.24;
const PLANE_H = 1.28;
const PLANE_ASPECT = (PLANE_W / PLANE_H).toFixed(6);

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
  /** Source aspect (w/h) so stills and clips can be cover-fitted to the
   *  plane, the same way orbitCardShader.ts fits project media to a card. */
  uniform float uMapAspect;

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
      /*
        Cover-fit, done in the shader — same technique as orbitCardShader.ts.
        The sources are phone stills and clips in whatever aspect they were
        shot; PLANE_W/PLANE_H is a fixed landscape quad. Scaling the UVs about
        the centre by the ratio of the two aspects crops the overflowing axis
        instead of stretching the image to fill it, which is the one
        distortion a viewer always notices on a face or a line of type.
      */
      float planeAspect = ${PLANE_ASPECT};
      vec2 uv = vUv - 0.5;
      if (uMapAspect > planeAspect) {
        uv.x *= planeAspect / uMapAspect;
      } else {
        uv.y *= uMapAspect / planeAspect;
      }
      color = texture2D(uMap, uv + 0.5).rgb;
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
  // Defaults to the plane's own aspect: with no texture this is unused by
  // the shader's procedural branch anyway, so the default is only ever
  // observed as "no cropping", which is correct for that branch.
  mapAspect = PLANE_W / PLANE_H,
}: PlaneLayout & { texture: Texture | null; mapAspect?: number }) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const { gl } = useThree();
  const hovered = useRef(false);

  const setHover = (state: boolean) => {
    if (hovered.current === state) return;
    hovered.current = state;
    gl.domElement.style.cursor = state ? 'pointer' : 'auto';
  };

  useEffect(() => () => setHover(false), []);

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uHasMap: { value: texture ? 1 : 0 },
      uMapAspect: { value: mapAspect },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uTintA: { value: new Color(project.tint[0]) },
      uTintB: { value: new Color(project.tint[1]) },
    }),
    [texture, mapAspect, project.tint],
  );

  useFrame((state, delta) => {
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

    /*
      Pull the pair in on a narrow viewport.

      The 1.6-unit spread was tuned against the desktop frustum; on a phone's
      much narrower width the near planes were crowding the screen edges. This
      is the same fitFactor-style read of `state.viewport` the hero furniture
      already uses (see lib/responsive3d.ts) — no listener, no breakpoint,
      correct again the instant the device rotates.
    */
    const narrow = isNarrowViewport(state.viewport.width, state.viewport.height);
    const spread = narrow ? 0.95 : 1.6;

    node.position.set(side * spread, (slot % 3) * 0.4 + 0.25, z);
    node.rotation.set(-0.07, side * -0.5, side * 0.04);

    if (material.current) {
      const u = material.current.uniforms;
      u.uTime.value += dt;
      u.uReveal.value = reveal;
    }
  });

  return (
    <mesh
      ref={mesh}
      /*
        Opens this project's detail view — same store the works orbit uses
        (lib/projectDetail.ts), so a project reads identically from either
        gallery. `node.visible` above is read straight off the mesh rather
        than through a React prop: three's raycaster ignores `.visible` on
        its own, so a plane that has not yet reveal-faded in, or one the
        corridor has already withdrawn, must not still catch a click at its
        parked position.
      */
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (!mesh.current?.visible) return;
        event.stopPropagation();
        openProjectDetail(project.id);
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        if (!mesh.current?.visible) return;
        event.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
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

/** Source dimensions, read off whichever element shape the texture wraps —
 *  an HTMLImageElement for a still, an HTMLVideoElement for a clip.
 *  `Texture.image` is typed loosely (three does not know in advance which
 *  element a given texture wraps), so this narrows at runtime instead of
 *  trusting a type. Falls back to the plane's own aspect if a dimension is
 *  not yet known, which only cover-fit math would otherwise divide by zero. */
function aspectOf(image: unknown): number {
  const el = image as { width?: number; height?: number; videoWidth?: number; videoHeight?: number } | null;
  const w = el?.videoWidth || el?.width || 0;
  const h = el?.videoHeight || el?.height || 0;
  return w > 0 && h > 0 ? w / h : PLANE_W / PLANE_H;
}

/** Video path. Only ever mounted when a real src exists. */
function VideoPlane({ src, ...layout }: PlaneLayout & { src: string }) {
  const texture = useVideoTexture(asset(src), {
    start: true,
    muted: true,
    loop: true,
    playsInline: true,
    crossOrigin: 'anonymous',
  });
  return <PlaneBody {...layout} texture={texture} mapAspect={aspectOf(texture.image)} />;
}

/*
  Still path. Only ever mounted when a real src exists — same reasoning as
  VideoPlane below: a conditional COMPONENT rather than a conditional hook
  keeps hook order stable, and useTexture suspends exactly like
  useVideoTexture does, so it needs the same per-plane Suspense boundary.

  drei's useTexture does not set colorSpace for you, and a texture read as
  linear data renders visibly washed out — the same correction OrbitCards and
  StudiesCore already apply to their imperatively-loaded textures, applied
  here to a suspending one instead via a layout effect, since there is no
  load callback to hang it off.
*/
function ImagePlane({ src, ...layout }: PlaneLayout & { src: string }) {
  const texture = useTexture(asset(src));

  useLayoutEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return <PlaneBody {...layout} texture={texture} mapAspect={aspectOf(texture.image)} />;
}

export default function ArchivePlane({
  imageSrc,
  videoSrc,
  ...layout
}: PlaneLayout & { imageSrc?: string; videoSrc?: string }) {
  /*
    Conditional COMPONENT, not conditional hook.

    The first version called useVideoTexture unconditionally with `src ?? ''`
    on the assumption that drei tolerates an empty source. It does not — it
    suspends forever waiting for a video that never arrives, and the
    <Suspense fallback={null}> wrapped around it silently swallowed the whole
    corridor. A live probe showed the gallery group reporting children: 0
    while every other value looked healthy.

    Splitting each path into its own component keeps hook order stable inside
    every branch while letting the no-media case mount with no suspending
    hook at all. The Suspense fallback renders the procedural plane rather
    than null, so a buffering file shows the placeholder instead of a hole.

    Image wins over video, same priority as everywhere else this pair of
    fields is read (ProjectRow, OrbitCards) — a still is decoded once, a clip
    holds a decoder open for the length of the page. Five of the seven
    projects in content/projects.ts carry only an `image`; without this
    branch they rendered as the generic drifting-bands placeholder instead of
    their own artwork, indistinguishable from a project with no media at all.
  */
  if (imageSrc) {
    return (
      <Suspense fallback={<PlaneBody {...layout} texture={null} />}>
        <ImagePlane {...layout} src={imageSrc} />
      </Suspense>
    );
  }

  if (!videoSrc) return <PlaneBody {...layout} texture={null} />;

  return (
    <Suspense fallback={<PlaneBody {...layout} texture={null} />}>
      <VideoPlane {...layout} src={videoSrc} />
    </Suspense>
  );
}
