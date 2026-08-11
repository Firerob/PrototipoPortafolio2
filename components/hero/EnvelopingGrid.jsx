'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Color } from 'three';
import { sceneLight } from '@/lib/palette';

/*
  ── The room the scene is inside of ─────────────────────────────────────────

  CurvedGrid is a floor: it bends away at the edges, but it lies flat at
  y = -2.1 and there is nothing above or around it, so the scene reads as an
  object sitting on a surface in a void. This is the enclosure — a wide open
  cylinder with the camera inside it, so the prism is in a SPACE rather than
  on a plane. The two are complementary and both are wanted; this does not
  replace the floor.

  ── Why sin() lines and not fract()/fwidth() ────────────────────────────────

  The usual analytic grid is `fract(coord * N)` with fwidth for a constant
  screen-space width, which is exactly what CurvedGrid does. It cannot be used
  around a cylinder: the angular coordinate wraps from 1 back to 0 at the
  seam, fwidth sees that wrap as an enormous derivative, and the result is a
  bright vertical scar down one side of the room that no amount of tuning
  removes.

  `abs(sin(theta * N))` has no seam by construction — it is already periodic,
  so the wrap costs nothing. The trade is that line width is no longer
  constant in screen space, and here that trade is free: this surface is
  always far away and always out of focus behind the subject, so the softer
  falloff on distant lines reads as depth rather than as an artefact.
*/

const vertexShader = /* glsl */ `
  varying vec3 vLocal;

  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3  uLineColor;
  uniform vec3  uGlowColor;
  uniform float uTime;
  uniform float uHeight;
  uniform float uColumns;
  uniform float uRings;
  uniform float uOpacity;

  varying vec3 vLocal;

  void main() {
    // Angle around the cylinder. Seamless because every use of it below goes
    // through sin(), which is periodic — see the note in the component.
    float ang = atan(vLocal.z, vLocal.x);

    // Vertical columns: thin bands wherever sin(ang * N) crosses zero.
    float columns = 1.0 - smoothstep(0.0, 0.10, abs(sin(ang * uColumns)));

    // Horizontal rings, drifting slowly upward so the room is never static.
    float y = vLocal.y / uHeight;
    float rings = 1.0 - smoothstep(0.0, 0.06, abs(sin((y + uTime * 0.012) * uRings)));

    /*
      Vertical falloff, strongest at eye level and gone at both ends.

      Without it the cylinder terminates in two hard circles at the top and
      bottom of frame — the exact "hard box" edge the rest of this codebase
      goes to some trouble to avoid. Squared so the fade is gentle in the
      middle and decisive at the extremes.
    */
    float band = 1.0 - abs(y) * 2.0;
    band = clamp(band, 0.0, 1.0);
    band *= band;

    vec3  color = uLineColor * columns + uGlowColor * rings;
    float alpha = (columns * 0.5 + rings * 0.62) * band * uOpacity;

    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

/** Wide enough to contain every authored camera position — the hero sits at
 *  z 6, the archive dive drops to 0.55 and the Contact pose pulls back to
 *  8.6, all comfortably inside 16. A radius the camera could cross would flip
 *  the viewer to the outside of a BackSide mesh and the room would vanish. */
const RADIUS = 16;
const HEIGHT = 26;

export default function EnvelopingGrid({ reducedMotion = false, segments = 96 }) {
  const material = useRef(null);

  const uniforms = useMemo(
    () => ({
      uLineColor: { value: new Color('#7aa0d8') },
      uGlowColor: { value: new Color('#a07ad8') },
      uTime: { value: 0 },
      uHeight: { value: HEIGHT },
      uColumns: { value: 24 },
      uRings: { value: 26 },
      // Deliberately faint. This is the far wall of the room; at parity with
      // the floor it would compete with the subject standing in front of it.
      uOpacity: { value: 0.5 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const node = material.current;
    if (!node) return;

    /*
      Lit by the same hue as everything else. Like CurvedGrid this material is
      unlit — an analytic shader has no normals to catch a light with — so
      reading the hue DynamicLighting publishes is how it joins the scene
      instead of sitting at a fixed colour while the glass in front of it
      sweeps through cyan and magenta.

      The rings run a little further round the arc than the columns so the two
      line sets stay tellable apart instead of merging into one flat colour.
    */
    node.uniforms.uLineColor.value.setHSL(sceneLight.hue, 0.5, 0.6);
    node.uniforms.uGlowColor.value.setHSL((sceneLight.hue + 0.06) % 1, 0.62, 0.55);

    if (reducedMotion) return;
    node.uniforms.uTime.value += Math.min(delta, 1 / 30);
  });

  return (
    <mesh renderOrder={-4}>
      {/* openEnded: the caps would be two discs across the top and bottom of
          the frame. radialSegments only has to be fine enough that the
          silhouette is not visibly faceted — the lines themselves are drawn
          in the fragment stage, so they cost nothing per segment. */}
      <cylinderGeometry args={[RADIUS, RADIUS, HEIGHT, segments, 1, true]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        // The camera is INSIDE the cylinder, so the faces pointing at it are
        // the back ones. FrontSide would cull the entire room away.
        side={BackSide}
      />
    </mesh>
  );
}
