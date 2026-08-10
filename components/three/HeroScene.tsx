'use client';

import {
  Suspense,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import {
  type AmbientLight,
  MathUtils,
  type Group,
  type PerspectiveCamera,
  type PointLight,
  type SpotLight,
} from 'three';
import BackdropWord from '@/components/hero/BackdropWord';
import CurvedGrid from '@/components/hero/CurvedGrid';
import Prism from '@/components/hero/Prism';
import SpotGlow from '@/components/hero/SpotGlow';
import OrbitCards from './OrbitCards';
import { projects } from '@/content/projects';
import { usePointerVector } from './PointerProvider';
import ArchiveGallery from '@/components/archive/ArchiveGallery';
import {
  archiveScroll,
  CAMERA_RANGE,
  phaseOf,
  smootherstep,
} from '@/lib/archiveScroll';
import {
  poseAt,
  sceneScroll,
  smootherstep as smootherstepScene,
} from '@/lib/sceneScroll';
import GlobalSceneController from './GlobalSceneController';
import CalibrationEffects from './CalibrationEffects';
import GenesisWireframe from './GenesisWireframe';
import { isWireframePhase, opening, subscribeOpeningPhase } from '@/lib/opening';

/*
  Frame-rate independent lerp factor.

  MathUtils.lerp(a, b, 0.1) converges twice as fast on a 120Hz display as on a
  60Hz one — the scene would literally feel different on different monitors.
  Feeding it 1 - lambda^dt instead makes the approach speed a property of time
  rather than of frame count.
*/
const smoothing = (lambda: number, dt: number) => 1 - Math.pow(lambda, dt);

/** Camera parallax plus the archive fly-through.
 *
 *  Both live in ONE rig on purpose. Two components writing camera.position in
 *  the same frame is the classic way to get a stuttering camera: whichever
 *  useFrame runs last wins, and the order is not guaranteed. Here the archive
 *  dive computes the base position and the pointer parallax is layered on top
 *  as a shrinking offset, so there is a single authority.
 */
/** Hero field of view, matching the <Canvas camera> prop in BackdropCanvas. */
const HERO_FOV = 38;

function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  const pointer = usePointerVector();

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = smoothing(0.02, dt);

    const dive = smootherstep(phaseOf(archiveScroll.progress, CAMERA_RANGE));

    /*
      Fly through the prism.

      z travels 6 → 0.55, which crosses the prism's own radius, so the camera
      genuinely passes through the glass rather than stopping in front of it.
      The target y drifts up slightly so the corridor beyond opens below the
      eyeline instead of arriving dead flat.
    */
    const baseZ = MathUtils.lerp(6, 0.55, dive);
    const baseY = MathUtils.lerp(0.35, 0.1, dive);

    // Parallax fades out as the dive proceeds: keeping full cursor sway while
    // flying through a tunnel reads as a wobble, not as depth.
    const sway = reducedMotion ? 0 : 1 - dive * 0.85;

    /*
      ── The single camera authority ─────────────────────────────────────────

      Everything that wants to move the camera does it HERE. The hero parallax,
      the archive dive and now the post-hero world all resolve to one target
      per frame, and the camera eases toward that one target.

      GlobalSceneController deliberately does not touch camera.position; it
      publishes a pose through the sceneScroll store and this reads it. Two
      useFrame callbacks writing the same property is the classic scroll-scene
      stutter — whichever ran last wins, and React guarantees nothing about
      that order.

      The blend is on the TARGETS, not on the camera. Blending two already-
      eased positions would compound the easing and the handover would drag.
    */
    const pose = poseAt(sceneScroll.stage);
    const w = smootherstepScene(sceneScroll.presence);

    // Parallax survives into the post-hero world, at about half strength: it
    // is what keeps the field feeling like a space the viewer is inside of
    // rather than a picture behind the text.
    const postSway = reducedMotion ? 0 : 0.5;

    const wantX = MathUtils.lerp(pointer.x * 0.42 * sway, pose.px + pointer.x * 0.3 * postSway, w);
    const wantY = MathUtils.lerp(baseY + pointer.y * 0.26 * sway, pose.py + pointer.y * 0.2 * postSway, w);
    const wantZ = MathUtils.lerp(baseZ, pose.pz, w);

    camera.position.x = MathUtils.lerp(camera.position.x, wantX, t);
    camera.position.y = MathUtils.lerp(camera.position.y, wantY, t);
    camera.position.z = MathUtils.lerp(camera.position.z, wantZ, t);

    /*
      Field of view carries the About push-in.

      Moving the camera nearer and narrowing the lens are different things: the
      first changes what is occluded, the second compresses depth. The narrow
      fov at About is what makes it read as a lens push rather than as the
      camera having simply walked forward.

      updateProjectionMatrix is guarded because it rebuilds the matrix — at
      rest the fov is static and there is nothing to rebuild.
    */
    const wantFov = MathUtils.lerp(HERO_FOV, pose.fov, w);
    const cam = camera as PerspectiveCamera;
    if (Math.abs(cam.fov - wantFov) > 0.01) {
      cam.fov = MathUtils.lerp(cam.fov, wantFov, t);
      cam.updateProjectionMatrix();
    }

    // Look further down the corridor as the dive advances so the tilted planes
    // are framed head-on rather than glimpsed off the edge.
    camera.lookAt(
      MathUtils.lerp(0, pose.tx, w),
      MathUtils.lerp(0.05, pose.ty, w),
      MathUtils.lerp(MathUtils.lerp(0, -6, dive), pose.tz, w),
    );
  });

  return null;
}

/**
 * Lights that drift with the cursor.
 *
 * Moving the key light rather than only the camera is what makes the prism's
 * specular highlight travel across its faces. Camera-only parallax slides the
 * whole image; moving the light changes how the object is lit, which is the
 * cue that actually reads as depth.
 */
/** Normal ambient level once the scene is live. */
const AMBIENT_LIVE = 0.25;
/** During the wireframe phases the background must read as near-black, so
 *  only the spark and the shockwave-lit prism are visible. */
const AMBIENT_OPENING = 0.05;

function LightRig({ reducedMotion }: { reducedMotion: boolean }) {
  const key = useRef<SpotLight>(null);
  const rim = useRef<PointLight>(null);
  const ambient = useRef<AmbientLight>(null);
  const pointer = usePointerVector();

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    // Slower than the camera on purpose: lights trailing the cursor feel like
    // mass. Matching speeds makes the whole scene look welded together.
    const t = smoothing(0.05, dt);
    const px = reducedMotion ? 0 : pointer.x;
    const py = reducedMotion ? 0 : pointer.y;

    if (key.current) {
      key.current.position.x = MathUtils.lerp(key.current.position.x, px * 2.6, t);
      key.current.position.y = MathUtils.lerp(key.current.position.y, 2.4 + py * 1.1, t);
    }

    if (rim.current) {
      // Counter-moving rim light: opposes the key so the silhouette stays
      // separated from the background at every cursor position.
      rim.current.position.x = MathUtils.lerp(rim.current.position.x, 3.5 - px * 2.2, t);
      rim.current.position.y = MathUtils.lerp(rim.current.position.y, -1.6 - py * 0.8, t);
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
        intensity={38}
        distance={18}
        color="#7c5cff"
      />
      <pointLight ref={rim} position={[3.5, -1.6, 2.4]} intensity={12} color="#4be1ff" />
    </>
  );
}

/**
 * Background parallax layer.
 *
 * The grid and the glow shift opposite the camera and further than it, so the
 * near object and the far floor separate as the cursor moves. Equal travel at
 * every depth is what makes most "3D parallax" look like a flat sliding sheet.
 */
function BackdropLayer({
  reducedMotion,
  word,
  font,
  isMobile,
}: {
  reducedMotion: boolean;
  word: string;
  font?: string;
  isMobile: boolean;
}) {
  const group = useRef<Group>(null);
  const pointer = usePointerVector();

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;

    const dt = Math.min(delta, 1 / 30);
    const t = smoothing(0.04, dt);
    const px = reducedMotion ? 0 : pointer.x;
    const py = reducedMotion ? 0 : pointer.y;

    node.position.x = MathUtils.lerp(node.position.x, -px * 0.85, t);
    node.position.y = MathUtils.lerp(node.position.y, -py * 0.45, t);
    node.rotation.y = MathUtils.lerp(node.rotation.y, px * 0.05, t);
  });

  return (
    <group ref={group}>
      <SpotGlow />
      {/* 48 segments per side on mobile instead of 120: a quarter of the
          vertex count for a curve that reads at the same fidelity on a
          smaller, further-viewed screen. */}
      <CurvedGrid reducedMotion={reducedMotion} segments={isMobile ? 48 : 120} />
      <Suspense fallback={null}>
        <BackdropWord word={word} font={font} />
      </Suspense>
    </group>
  );
}


/**
 * The hero's furniture — and its exit.
 *
 * The prism, the curved grid, the spot glow and the backdrop word are the
 * subject of the FIRST screen. Once the canvas stopped parking at the archive
 * they stayed in frame for the whole page: the grid filled the bottom half of
 * the index, and the prism sat over the project list as a striped rectangle,
 * because its transmission material was refracting that same grid. Persistent
 * 3D backgrounds look like a bug in exactly this way — old furniture nobody
 * cleared away.
 *
 * So the hero world recedes as the post-hero world arrives. Shrinking AND
 * pushing back, not fading: these objects use four different materials
 * (transmission, shader, line, text) with no shared opacity to animate, and
 * distance is the one treatment that works on all of them at once — the fog
 * that arrives with `presence` finishes the job.
 *
 * The handover happens underneath IndexArrival's wave, which is covering the
 * screen at exactly that scroll position, so none of it is ever seen moving.
 */
function HeroWorld({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;

    const dt = Math.min(delta, 1 / 30);
    const t = smoothing(0.05, dt);
    const hand = smootherstepScene(sceneScroll.presence);

    // 0.08 rather than something like 0.4: the cutoff below has to land while
    // the group is small enough that its disappearance is not a pop.
    const scale = MathUtils.lerp(1, 0.08, hand);
    node.scale.setScalar(MathUtils.lerp(node.scale.x, scale, t));
    node.position.z = MathUtils.lerp(node.position.z, -hand * 14, t);

    node.visible = hand < 0.995;
  });

  return <group ref={group}>{children}</group>;
}

/**
 * Studio lighting baked into an environment map instead of loading an HDRI.
 * drei's `preset` prop pulls a ~2MB .hdr off a CDN; Lightformers give the same
 * job to four emissive quads, and `frames={1}` bakes them exactly once.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={128} frames={1}>
      <color attach="background" args={['#05050a']} />
      <Lightformer form="rect" intensity={3.2} color="#6d4bff" position={[0, 1.5, -4]} scale={[8, 6, 1]} />
      <Lightformer form="rect" intensity={1.8} color="#4be1ff" position={[-4, 0.5, 2]} scale={[4, 6, 1]} rotation-y={Math.PI / 2} />
      <Lightformer form="rect" intensity={1.4} color="#ff5ea8" position={[4, -0.5, 2]} scale={[4, 6, 1]} rotation-y={-Math.PI / 2} />
      <Lightformer form="circle" intensity={2.4} color="#ffffff" position={[0, 5, 1]} scale={5} rotation-x={Math.PI / 2} />
    </Environment>
  );
}

interface HeroSceneProps {
  word: string;
  reducedMotion?: boolean;
  font?: string;
  isMobile?: boolean;
}

/** Scene contents only — the <Canvas> lives in BackdropCanvas. */
export default function HeroScene({ word, reducedMotion = false, font, isMobile = false }: HeroSceneProps) {
  /*
    Dropped to 'low' by PerformanceMonitor when the frame budget slips, or
    seeded there from the start on mobile — feeds the transmission material's
    resolution/samples (see Prism.jsx), which dominate GPU cost by rendering
    the scene to an FBO every frame.

    Seeding rather than waiting for the first onDecline matters here: without
    it every mobile visitor pays for a handful of dropped frames at 'high'
    quality before PerformanceMonitor's own averaging window has enough
    samples to react — a guaranteed stutter on load instead of an occasional
    one under real GPU pressure.
  */
  const [quality, setQuality] = useState<'high' | 'low'>(isMobile ? 'low' : 'high');

  /*
    The composer exists only until the opening finishes.

    useSyncExternalStore rather than useState + useEffect: the phase lives in a
    module store that GSAP and the DOM overlay both write, and this is the
    supported way to read one without tearing during a concurrent render.
    Server snapshot is 'calibrating' so SSR and the first client paint agree.
  */
  const phase = useSyncExternalStore(
    subscribeOpeningPhase,
    () => opening.phase,
    () => 'calibrating' as const,
  );

  // The real scene stays fully hidden (not wireframed — hidden) through the
  // singularity and ignition. It appears in one frame at the bake, under the
  // bokeh slam that already exists to hide a material swap; this is the same
  // trick applied to visibility instead of to a scene-wide override material.
  const sceneReady = !isWireframePhase(phase);

  return (
    <>
      {/*
        `bounds` returns absolute fps thresholds, not a fraction — drei's own
        default is `refreshrate > 100 ? [60,100] : [40,60]`, which is tuned
        for desktop: it wants sustained 60fps before calling anything a
        decline. A mobile GPU can idle at 45-55fps under normal load, so that
        default would either sit permanently in 'low' or flap constantly.
        [24, 48] gives a phone real headroom before either direction fires.

        `ms` (the sampling window `bounds` averages over) is doubled on
        mobile as the debounce: a single dropped frame from a GC pause or a
        scroll-triggered layout can't flip quality on its own; the average
        over a full second has to actually be low.
      */}
      <PerformanceMonitor
        bounds={(refreshrate) => (isMobile ? [24, 48] : refreshrate > 100 ? [60, 100] : [40, 60])}
        ms={isMobile ? 500 : 250}
        onDecline={() => setQuality('low')}
        onIncline={() => setQuality('high')}
      />

      <LightRig reducedMotion={reducedMotion} />

      {/* Environment stays outside HeroWorld: it lights the post-hero field
          too, and it is an env map rather than something in the frame. */}
      <Suspense fallback={null}>
        <StudioEnvironment />
      </Suspense>

      <group visible={sceneReady}>
        <HeroWorld>
          <BackdropLayer reducedMotion={reducedMotion} word={word} font={font} isMobile={isMobile} />
          <Suspense fallback={null}>
            <Prism reducedMotion={reducedMotion} quality={quality} />
          </Suspense>
        </HeroWorld>

        {/*
          The orbit shares the prism's depth buffer, which is the whole point:
          cards on the far side of the ring are genuinely occluded by the model
          instead of being layered over it by a CSS stacking trick. This is only
          possible because there is one canvas for the entire page.

          At scroll 0 every card is still off-screen, so the hero loads clean.
        */}
        <OrbitCards projects={projects} reducedMotion={reducedMotion} />

        {/*
          The archive corridor shares this canvas and therefore this depth
          buffer, so the prism's transmission material actually refracts the
          nearest planes while the camera is passing through it.
        */}
        <ArchiveGallery reducedMotion={reducedMotion} />

        {/*
          The world that carries Index → News → About → Contact. Mounted here so
          it shares this canvas — and therefore this depth buffer and this
          camera — with the hero. A second canvas would be a second WebGL
          context, a second camera to keep in sync, and no shared occlusion.
        */}
        <GlobalSceneController reducedMotion={reducedMotion} />
      </group>

      <CameraRig reducedMotion={reducedMotion} />

      {/*
        Both mount for the whole opening and unmount together at 'live'.
        CalibrationEffects is mounted from the first phase rather than from the
        bake so its pass shaders compile during the black screen — see the note
        in that file about why that is the answer to the FPS question.
      */}
      {phase !== 'live' && (
        <>
          <GenesisWireframe />
          <CalibrationEffects lightweight={isMobile} />
        </>
      )}
    </>
  );
}
