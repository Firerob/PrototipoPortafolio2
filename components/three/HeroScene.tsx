'use client';

import { Suspense, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { MathUtils, type Group, type PointLight, type SpotLight } from 'three';
import BackdropWord from '@/components/hero/BackdropWord';
import CurvedGrid from '@/components/hero/CurvedGrid';
import Prism from '@/components/hero/Prism';
import SpotGlow from '@/components/hero/SpotGlow';
import OrbitCards from './OrbitCards';
import { projects } from '@/content/projects';
import { usePointerVector } from './PointerProvider';

/*
  Frame-rate independent lerp factor.

  MathUtils.lerp(a, b, 0.1) converges twice as fast on a 120Hz display as on a
  60Hz one — the scene would literally feel different on different monitors.
  Feeding it 1 - lambda^dt instead makes the approach speed a property of time
  rather than of frame count.
*/
const smoothing = (lambda: number, dt: number) => 1 - Math.pow(lambda, dt);

/** Camera parallax. Moving the camera keeps the grid's vanishing point fixed,
 *  so the floor reads as a real space the viewer leans around inside. */
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  const pointer = usePointerVector();

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const dt = Math.min(delta, 1 / 30);
    const t = smoothing(0.02, dt);

    camera.position.x = MathUtils.lerp(camera.position.x, pointer.x * 0.42, t);
    camera.position.y = MathUtils.lerp(camera.position.y, 0.35 + pointer.y * 0.26, t);
    camera.lookAt(0, 0.05, 0);
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
function LightRig({ reducedMotion }: { reducedMotion: boolean }) {
  const key = useRef<SpotLight>(null);
  const rim = useRef<PointLight>(null);
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
  });

  return (
    <>
      <ambientLight intensity={0.25} />
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
function BackdropLayer({ reducedMotion, word, font }: { reducedMotion: boolean; word: string; font?: string }) {
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
      <CurvedGrid reducedMotion={reducedMotion} />
      <Suspense fallback={null}>
        <BackdropWord word={word} font={font} />
      </Suspense>
    </group>
  );
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
}

/** Scene contents only — the <Canvas> lives in BackdropCanvas. */
export default function HeroScene({ word, reducedMotion = false, font }: HeroSceneProps) {
  // Dropped to 'low' by PerformanceMonitor when the frame budget slips; feeds
  // the transmission material's resolution/samples, which dominate GPU cost.
  const [quality, setQuality] = useState<'high' | 'low'>('high');

  return (
    <>
      <PerformanceMonitor onDecline={() => setQuality('low')} onIncline={() => setQuality('high')} />

      <LightRig reducedMotion={reducedMotion} />
      <BackdropLayer reducedMotion={reducedMotion} word={word} font={font} />

      <Suspense fallback={null}>
        <StudioEnvironment />
        <Prism reducedMotion={reducedMotion} quality={quality} />
      </Suspense>

      {/*
        The orbit shares the prism's depth buffer, which is the whole point:
        cards on the far side of the ring are genuinely occluded by the model
        instead of being layered over it by a CSS stacking trick. This is only
        possible because there is one canvas for the entire page.

        At scroll 0 every card is still off-screen, so the hero loads clean.
      */}
      <OrbitCards projects={projects} reducedMotion={reducedMotion} />

      <CameraRig reducedMotion={reducedMotion} />
    </>
  );
}
