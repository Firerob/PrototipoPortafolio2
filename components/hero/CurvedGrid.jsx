'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DoubleSide } from 'three';

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

    vec3  color = uLineColor * fine * 0.55 + uGlowColor * section;
    float alpha = (fine * 0.28 + section * 0.72) * fade * sweep;

    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export default function CurvedGrid({ reducedMotion = false }) {
  const material = useRef(null);

  const uniforms = useMemo(
    () => ({
      uCurve: { value: 0.0075 },
      uCell: { value: 1.0 },
      uSection: { value: 5.0 },
      uFade: { value: 46.0 },
      uTime: { value: 0 },
      uLineColor: { value: new Color('#4be1ff') },
      uGlowColor: { value: new Color('#6d4bff') },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (reducedMotion || !material.current) return;
    material.current.uniforms.uTime.value += Math.min(delta, 1 / 30);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.1, 0]} renderOrder={-2}>
      {/* 120 segments per side: enough to make the r^2 bend read as a smooth
          curve rather than faceted steps, still a trivial vertex load. */}
      <planeGeometry args={[120, 120, 120, 120]} />
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
