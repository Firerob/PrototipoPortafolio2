'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Vector2 } from 'three';

export interface PointerApi {
  /**
   * Normalised pointer, -1..1 on both axes, origin at the viewport centre.
   * Mutated in place — read it inside useFrame, never render from it.
   */
  readonly vector: Vector2;
}

const PointerContext = createContext<PointerApi | null>(null);

/**
 * Owns the single global pointer listener and hands the live vector down
 * through context.
 *
 * Why a window listener instead of R3F's `state.pointer`: the backdrop canvas
 * is `pointer-events: none` so it never blocks scrolling or clicks, which
 * means R3F receives no pointer events at all and `state.pointer` would stay
 * pinned at (0, 0). Tracking the window is the only way to have both a
 * click-through canvas and a cursor-reactive scene.
 *
 * Context does reach inside <Canvas>: R3F wraps canvas children in a context
 * bridge (`its-fine`), so consumers on both sides of the reconciler boundary
 * read the same provider. Verified against @react-three/fiber v9.
 *
 * The value is a stable object holding a mutated Vector2 rather than state.
 * Publishing pointer coordinates through useState would re-render every
 * consumer on every mouse move and make the 60fps target unreachable.
 */
export function PointerProvider({ children }: { children: ReactNode }) {
  const api = useMemo<PointerApi>(() => ({ vector: new Vector2(0, 0) }), []);

  useEffect(() => {
    const { vector } = api;

    const onMove = (event: PointerEvent) => {
      /*
        Touch is not cursor intent — it is the scroll gesture. The canvas is
        pointer-events:none, so a finger dragging to scroll never means "look
        over there"; feeding it into the parallax makes the scene sway with
        every scroll on every phone, which is both visually wrong and a
        touchmove handler doing lerp math on the one input path mobile Safari
        and Chrome are most protective of. Only mouse and pen intentionally
        move without scrolling, so only they get to drive the parallax.
      */
      if (event.pointerType === 'touch') return;

      vector.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -((event.clientY / window.innerHeight) * 2 - 1),
      );
    };

    // Recentre when the cursor leaves or the tab loses focus, otherwise the
    // scene stays frozen at whatever tilt it held on the way out.
    const onLeave = () => vector.set(0, 0);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('blur', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, [api]);

  return <PointerContext.Provider value={api}>{children}</PointerContext.Provider>;
}

/** Live pointer vector. Throws if used outside the provider. */
export function usePointerVector(): Vector2 {
  const context = useContext(PointerContext);
  if (!context) {
    throw new Error('usePointerVector must be used within a <PointerProvider>.');
  }
  return context.vector;
}
