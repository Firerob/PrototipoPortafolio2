'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color } from 'three';
import { archiveScroll, CAMERA_RANGE, phaseOf, smootherstep } from '@/lib/archiveScroll';
import { sceneLight } from '@/lib/palette';

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
  color = '#c9b79c',
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

  const material = useRef(null);

  /*
    Fade out as the camera dives into the archive.

    This quad has depthTest disabled so it always paints over the scene — fine
    when it is a soft bloom sitting behind a distant prism, fatal once the
    camera is inside: at scale 11 it became a full-screen additive violet veil
    that washed out the entire archive corridor. Fading it with the dive is
    what lets the tilted planes read at all.
  */
  useFrame(() => {
    if (!material.current) return;
    const dive = smootherstep(phaseOf(archiveScroll.progress, CAMERA_RANGE));
    material.current.uniforms.uIntensity.value = intensity * (1 - dive);

    /*
      The bloom rides the scene light's hue rather than a colour of its own.

      This quad sits directly behind the glass, so any disagreement between
      the two is visible as a fringe around the silhouette. Saturation is kept
      well below the prism's 0.42 — it is atmosphere, and a bloom as saturated
      as the object it backs reads as a coloured gel rather than as light.
    */
    material.current.uniforms.uColor.value.setHSL(sceneLight.hue, 0.55, 0.5);
  });

  return (
    <mesh position={position} scale={scale} renderOrder={-3} visible={true}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={material}
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
