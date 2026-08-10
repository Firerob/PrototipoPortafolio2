'use client';

import { Canvas } from '@react-three/fiber';
import { useIsMobile } from '@/hooks/useIsMobile';
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
  const isMobile = useIsMobile();

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      /*
        alpha so the fluid simulation underneath shows through the scene.

        antialias is the other half of the mobile cost cut: MSAA on a
        tile-based mobile GPU is a resolve pass on every tile every frame,
        and at the capped DPR below the jagged edges it buys against are
        already close to sub-pixel. Desktop keeps it — there the cost is
        negligible next to the transmission material's own FBO passes.
      */
      gl={{ alpha: true, antialias: !isMobile, powerPreference: 'high-performance' }}
      // Desktop keeps the 1.75 ceiling; mobile is capped at 1.5, which is
      // still crisp on a phone's smaller physical screen while cutting the
      // fragment-shader workload — the actual cost driver, since it scales
      // with pixel count, not with viewport CSS size.
      dpr={isMobile ? [1, 1.5] : [1, 1.75]}
      camera={{ position: [0, 0.35, 6], fov: 38, near: 0.1, far: 90 }}
      role="img"
      aria-label={`Decorative three-dimensional scene: a slowly rotating glass prism above a receding neon grid, with the word ${word} behind it. The scene follows your pointer. All page content is available as text.`}
      onCreated={({ gl }) => gl.setClearAlpha(0)}
    >
      <HeroScene word={word} reducedMotion={reducedMotion} font={font} isMobile={isMobile} />
    </Canvas>
  );
}
