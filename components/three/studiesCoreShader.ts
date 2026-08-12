import { Color, type IUniform, type Texture } from 'three';

/*
  The glass core at the centre of Studies — see StudiesCore.tsx for the
  object as a whole (this shader is only its inner solid; the outer wireframe
  shell around it is a plain MeshBasicMaterial, cheap and undistorted).

  A custom shader is a deliberate exception here, not the default this
  codebase reaches for. ContactTransmitter's header argues for "deliberately
  boring machinery" — plain meshes, no GLSL — because that object is
  atmosphere sitting behind body copy. This one is the opposite case: it is
  THE subject of the Studies stage, selected by name from a manifest, the
  thing every other element on screen defers to. That is the same bar
  orbitCardShader.ts and Prism.jsx clear elsewhere on this page, and this
  object clears it for the same reason they do.
*/

export interface StudiesCoreUniforms {
  [key: string]: IUniform;
  uTime: IUniform<number>;
  /** Vertex displacement amount, eased toward the selected study's value. */
  uDistortion: IUniform<number>;
  /** Scanline frequency across the surface. */
  uFacet: IUniform<number>;
  uTintA: IUniform<Color>;
  uTintB: IUniform<Color>;
  /** stageWeight × presence × arrival-ease — the one opacity authority. */
  uWeight: IUniform<number>;
  /** The study currently resolved onto the core, once its file has loaded. */
  uMap: IUniform<Texture | null>;
  uHasMap: IUniform<number>;
  /** What uMap held before the current selection, for the crossfade. */
  uMapPrev: IUniform<Texture | null>;
  uHasMapPrev: IUniform<number>;
  /** 0 at the moment of selection, 1 once the crossfade has settled. */
  uCrossfade: IUniform<number>;
}

export const studiesCoreVertex = /* glsl */ `
  uniform float uTime;
  uniform float uDistortion;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vSphereUv;

  /*
    Three sine terms at incommensurate frequencies, sampled at the vertex's
    own position. No single-frequency wobble here: one sine displaces a
    sphere into a smooth ellipsoid, which reads as a shape change rather than
    as surface activity. Multiplying three together breaks that symmetry
    cheaply, without a noise texture or a simplex implementation.
  */
  float wobble(vec3 p, float t) {
    return sin(p.x * 3.1 + t) * sin(p.y * 2.7 - t * 0.8) * sin(p.z * 3.4 + t * 1.3);
  }

  void main() {
    vec3 n = normalize(position);

    /*
      Equirectangular UV from the vertex's own direction, not the geometry's
      own uv attribute. IcosahedronGeometry's built-in UVs duplicate vertices
      along a seam to unwrap a near-sphere onto a flat rectangle, which reads
      as a torn texture right where two triangles share an edge but not a UV
      coordinate. Deriving UV from the normal instead needs no seam at all —
      every triangle computes its own coordinate from where it actually is.
    */
    vSphereUv = vec2(
      atan(n.z, n.x) / 6.28318530718 + 0.5,
      asin(clamp(n.y, -1.0, 1.0)) / 3.14159265359 + 0.5
    );

    float displacement = wobble(position, uTime) * uDistortion * 0.4;
    vec3 displaced = position + n * displacement;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * n);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const studiesCoreFragment = /* glsl */ `
  uniform vec3      uTintA;
  uniform vec3      uTintB;
  uniform float     uFacet;
  uniform float     uTime;
  uniform float     uWeight;
  uniform sampler2D uMap;
  uniform sampler2D uMapPrev;
  uniform float     uHasMap;
  uniform float     uHasMapPrev;
  uniform float     uCrossfade;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vSphereUv;

  void main() {
    vec3 normal  = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // Fresnel rim: glancing angles read bright, face-on reads dark. Needs
    // nothing beyond the normal and view direction already in hand, and it
    // is the whole reason this surface reads as glass rather than as paint.
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.2);

    float ramp = clamp(vSphereUv.y * 0.6 + vSphereUv.x * 0.4, 0.0, 1.0);
    vec3 base = mix(uTintA, uTintB, ramp);

    /*
      Facet scanlines: a travelling frequency band standing in for instrument
      activity across the surface. uFacet is the per-study parameter, so a
      dense SHADERS study reads as busier than a slow, deliberate one — the
      same field that drives the telemetry meter in the DOM panel also drives
      what the object is visibly doing.
    */
    float scan = 0.5 + 0.5 * sin(vSphereUv.y * uFacet * 40.0 + uTime * 0.6);
    base += scan * 0.05;

    // Cross-fade between the previous and current study's artwork. With
    // neither loaded (uHasMap 0, the resting state every entry ships in
    // today) this is inert and the core runs on tint + fresnel + scan alone.
    if (uHasMap > 0.5) {
      vec3 mapped = texture2D(uMap, vSphereUv).rgb;
      if (uHasMapPrev > 0.5) {
        vec3 prevMapped = texture2D(uMapPrev, vSphereUv).rgb;
        mapped = mix(prevMapped, mapped, uCrossfade);
      }
      base = mix(base, mapped, 0.7);
    }

    vec3 color = base + fresnel * vec3(0.9, 0.95, 1.0) * 0.9;

    float alpha = (0.32 + fresnel * 0.55) * uWeight;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export function makeStudiesCoreUniforms(): StudiesCoreUniforms {
  return {
    uTime: { value: 0 },
    uDistortion: { value: 0.3 },
    uFacet: { value: 6 },
    uTintA: { value: new Color('#4be1ff') },
    uTintB: { value: new Color('#241350') },
    uWeight: { value: 0 },
    uMap: { value: null },
    uHasMap: { value: 0 },
    uMapPrev: { value: null },
    uHasMapPrev: { value: 0 },
    uCrossfade: { value: 1 },
  };
}
