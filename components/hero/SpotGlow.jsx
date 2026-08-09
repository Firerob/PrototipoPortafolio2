'use client';

import { useMemo } from 'react';
import { AdditiveBlending, Color } from 'three';

/*
  The violet bloom behind the prism.

  This is a single additive quad with a radial falloff, not postprocessing.
  A real bloom pass would mean @react-three/postprocessing plus two extra
  full-screen render targets on top of the transmission FBO — a large cost for
  one soft circle that never moves.
*/

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3  uColor;
  uniform float uIntensity;
  varying vec2  vUv;

  void main() {
    float d = distance(vUv, vec2(0.5)) * 2.0;
    // pow(...,3) keeps the core hot and the skirt long, which is what makes it
    // read as depth behind the object instead of a flat disc.
    float falloff = pow(1.0 - clamp(d, 0.0, 1.0), 3.0);
    gl_FragColor = vec4(uColor * falloff * uIntensity, falloff);
    #include <colorspace_fragment>
  }
`;

export default function SpotGlow({
  color = '#6d4bff',
  intensity = 1.15,
  position = [0, 0.2, -5.2],
  scale = 11,
}) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
    }),
    [color, intensity],
  );

  return (
    <mesh position={position} scale={scale} renderOrder={-3}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}
