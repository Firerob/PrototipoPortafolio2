'use client';

import { Canvas } from '@react-three/fiber';
import HeroScene from './HeroScene';

interface BackdropCanvasProps {
  word: string;
  reducedMotion?: boolean;
  font?: string;
  /** False parks the renderer entirely — no rAF, no draw calls. */
  active?: boolean;
}

export default function BackdropCanvas({
  word,
  reducedMotion = false,
  font,
  active = true,
}: BackdropCanvasProps) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      // alpha so the fluid simulation underneath shows through the scene.
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.35, 6], fov: 38, near: 0.1, far: 90 }}
      role="img"
      aria-label={`Decorative three-dimensional scene: a slowly rotating glass prism above a receding neon grid, with the word ${word} behind it. The scene follows your pointer. All page content is available as text.`}
      onCreated={({ gl }) => gl.setClearAlpha(0)}
    >
      <HeroScene word={word} reducedMotion={reducedMotion} font={font} />
    </Canvas>
  );
}
