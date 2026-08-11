'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DoubleSide } from 'three';
import { sceneLight } from '@/lib/palette';

/*
  A shader grid rather than drei's <Grid>: the brief calls for cybernetic
  curvature, and <Grid> is flat by construction. Here the vertex stage bends
  the plane down by r^2 so the horizon falls away, and the fragment stage
  draws the lines analytically — fwidth keeps them a constant hairline width
  on screen no matter how far they recede, which is what stops the far field
  turning into moire mush.
*/

const vertexShader = /* glsl */ `
  uniform float uCurve;
  varying vec2 vCoord;
  varying float vDist;

  void main() {
    vec3 transformed = position;
    float r2 = dot(position.xy, position.xy);

    // Plane is authored in XY then rotated -90deg about X, so local +z maps to
    // world +y. Subtracting here bends the far field downward.
    transformed.z -= r2 * uCurve;

    vCoord = position.xy;
    vDist = length(position.xy);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3  uLineColor;
  uniform vec3  uGlowColor;
  uniform float uCell;
  uniform float uSection;
  uniform float uFade;
  uniform float uTime;

  varying vec2  vCoord;
  varying float vDist;

  // Screen-space-constant line width via the derivative of the grid coord.
  float gridMask(vec2 coord, float weight) {
    vec2 delta = fwidth(coord) * weight;
    vec2 g = abs(fract(coord - 0.5) - 0.5) / delta;
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    float fine    = gridMask(vCoord / uCell, 1.0);
    float section = gridMask(vCoord / uSection, 1.25);

    // Squared falloff: hides the plane's finite edge without any fog cost.
    float fade = 1.0 - smoothstep(uFade * 0.08, uFade, vDist);
    fade *= fade;

    // Slow outward scan pulse — the one ambient motion in the scene.
    float sweep = 0.66 + 0.34 * (0.5 + 0.5 * sin(vDist * 0.32 - uTime * 0.75));

    /*
      Original weights, restored.

      A previous pass cut these to (fine 0.09 + section 0.26) chasing "almost
      invisible", and combined with a near-black line colour the floor stopped
      reading at all — which removed the depth cue the whole scene was built
      on. The horizon falling away is what tells you this is a space rather
      than a backdrop, and it cannot do that job if you cannot see it.
    */
    vec3  color = uLineColor * fine * 0.55 + uGlowColor * section;
    float alpha = (fine * 0.28 + section * 0.72) * fade * sweep;

    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export default function CurvedGrid({ reducedMotion = false, segments = 120 }) {
  const material = useRef(null);

  const uniforms = useMemo(
    () => ({
      uCurve: { value: 0.0075 },
      uCell: { value: 1.0 },
      uSection: { value: 5.0 },
      uFade: { value: 46.0 },
      uTime: { value: 0 },
      uLineColor: { value: new Color('#aeb6c6') },
      uGlowColor: { value: new Color('#c9b79c') },
    }),
    [],
  );

  useFrame((_, delta) => {
    const node = material.current;
    if (!node) return;

    /*
      The floor is lit by the same hue as everything else.

      This material is unlit — an analytic shader, not a Lambert surface — so
      it cannot pick a light colour up the way the prism does. Reading the hue
      DynamicLighting publishes is how it joins in anyway, and it is why the
      floor sweeps through cyan/violet/magenta in step with the glass rather
      than sitting at a fixed colour while the object above it changes.

      An earlier pass pointed these at the palette's `grid` entry, a near-black
      (#2A2E38 and friends) authored for a floor meant to be subliminal. Unlit
      dark grey on a near-black background has almost no delta to show, which
      is half of why the grid appeared to vanish; the alpha cut was the other
      half. Both are undone.

      Runs even under reduced motion, because this is colour rather than
      motion; only uTime below is frozen.
    */
    node.uniforms.uLineColor.value.setHSL(sceneLight.hue, 0.55, 0.62);
    // Section lines sit a little further round the wheel than the fine ones,
    // so the two grid scales stay distinguishable instead of merging into one
    // flat colour as the hue sweeps.
    node.uniforms.uGlowColor.value.setHSL((sceneLight.hue + 0.08) % 1, 0.7, 0.55);

    if (reducedMotion) return;
    node.uniforms.uTime.value += Math.min(delta, 1 / 30);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.1, 0]} renderOrder={-2}>
      {/* 120 segments per side on desktop is enough to make the r^2 bend read
          as a smooth curve rather than faceted steps; mobile halves that
          more than once (see HeroScene) since the vertex load scales with
          the square of this number and the curve is viewed from further
          away on a smaller screen, where the facets are not visible anyway. */}
      <planeGeometry args={[120, 120, segments, segments]} />
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
