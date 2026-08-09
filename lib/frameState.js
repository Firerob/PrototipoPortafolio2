/*
  Per-frame state deliberately kept OUT of React.

  The hero reads the pointer every frame inside useFrame, and the HUD gizmo
  reads the prism's quaternion every frame. Holding either in useState would
  re-render the whole overlay tree 60x/second and make the 60fps target
  unreachable. These are plain mutable singletons: written by one listener /
  one useFrame, read by whoever needs them, never a render trigger.
*/

/** Normalised pointer, -1..1 on both axes, origin at viewport centre. */
export const pointer = { x: 0, y: 0 };

/** Live quaternion of the prism, published by <Prism> for the HUD to read. */
export const orientation = { x: 0, y: 0, z: 0, w: 1 };

let listeners = 0;

/**
 * Attach the single global pointer listener. Ref-counted so multiple
 * components can call it without stacking duplicate listeners.
 * @returns {() => void} detach
 */
export function bindPointer() {
  if (typeof window === 'undefined') return () => {};

  listeners += 1;
  if (listeners > 1) return releaseOnce();

  window.addEventListener('pointermove', handleMove, { passive: true });
  window.addEventListener('pointerleave', handleLeave, { passive: true });
  window.addEventListener('blur', handleLeave);

  return releaseOnce();
}

function handleMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
}

// Recentre when the cursor leaves or the tab loses focus, otherwise the prism
// stays frozen at whatever tilt it had when the pointer left the window.
function handleLeave() {
  pointer.x = 0;
  pointer.y = 0;
}

function releaseOnce() {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    listeners -= 1;
    if (listeners > 0) return;
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerleave', handleLeave);
    window.removeEventListener('blur', handleLeave);
    handleLeave();
  };
}

/**
 * Frame-rate independent damping factor.
 * `lerp(current, target, damp(0.001, dt))` converges at the same speed on a
 * 144Hz monitor as on a 60Hz one — a bare 0.1 lerp does not.
 */
export function damp(lambda, dt) {
  return 1 - Math.pow(lambda, dt);
}
