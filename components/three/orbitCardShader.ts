import { Color, type IUniform, type Texture } from 'three';

/*
  Card geometry, declared here rather than in OrbitCards because the fragment
  shader needs the aspect ratio to cover-fit media and a second copy of these
  numbers would silently skew every photograph the day someone resized a card.
  OrbitCards imports them for its planeGeometry.
*/
export const CARD_W = 0.92;
export const CARD_H = 1.24;
const CARD_ASPECT = (CARD_W / CARD_H).toFixed(6);

export interface OrbitCardUniforms {
  [key: string]: IUniform;
  uTintA: IUniform<Color>;
  uTintB: IUniform<Color>;
  /** 0 while off-screen, 1 once settled in orbit. Drives fade and dissolve. */
  uArrival: IUniform<number>;
  /** 1 when the card faces the camera head-on, 0 at the back of the ring. */
  uFacing: IUniform<number>;
  uTime: IUniform<number>;
  /** Project media, once loaded. Null until then. */
  uMap: IUniform<Texture | null>;
  uHasMap: IUniform<number>;
  uMapAspect: IUniform<number>;
}

export const orbitCardVertex = /* glsl */ `
  uniform float uArrival;

  varying vec2  vUv;
  varying float vEdge;

  void main() {
    vUv = uv;
    vEdge = dot(position.xy, position.xy);

    vec3 transformed = position;

    // Cards arrive slightly bowed and flatten as they settle — the panel reads
    // as a physical sheet being pulled into place rather than a sprite fading
    // in on the spot.
    transformed.z += (0.25 - vEdge) * (1.0 - uArrival) * 1.4;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

export const orbitCardFragment = /* glsl */ `
  uniform vec3      uTintA;
  uniform vec3      uTintB;
  uniform float     uArrival;
  uniform float     uFacing;
  uniform float     uTime;
  uniform sampler2D uMap;
  /** 0 = generated panel, 1 = real media. Set once the texture resolves. */
  uniform float     uHasMap;
  /** Source aspect (w/h) so the media can be cover-fitted to the card. */
  uniform float     uMapAspect;

  varying vec2  vUv;
  varying float vEdge;

  // Analytic hairline grid; fwidth holds the lines at one pixel however far
  // the card has receded around the ring.
  float gridMask(vec2 uv, float cells, float softness) {
    vec2 coord = uv * cells;
    vec2 delta = fwidth(coord) * softness;
    vec2 g = abs(fract(coord - 0.5) - 0.5) / delta;
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    vec2 centred = vUv - 0.5;

    // Rounded-corner mask in the shader — no alpha texture needed.
    vec2 q = abs(centred) * 2.0;
    float corner = length(max(q - vec2(0.88, 0.90), 0.0));
    float shape = 1.0 - smoothstep(0.09, 0.13, corner);
    if (shape < 0.004) discard;

    float ramp = clamp(vUv.x * 0.5 + vUv.y * 0.8, 0.0, 1.0);
    vec3 base = mix(uTintA, uTintB, ramp);

    /*
      ── Cover-fit, done in the shader ──────────────────────────────────────

      The sources are whatever the camera roll produced — portrait phone
      stills at 3:4 and 9:16 clips — and the card is a fixed landscape-ish
      quad. Stretching UVs to fill it would squash faces, which is the one
      distortion a viewer always notices.

      So the UVs are scaled about the centre by the ratio of the two aspects,
      exactly what CSS object-fit: cover does: match the axis that would
      otherwise letterbox, and let the other overflow and crop. CARD_ASPECT
      must stay in step with CARD_W/CARD_H in OrbitCards.
    */
    if (uHasMap > 0.5) {
      float cardAspect = ${CARD_ASPECT};
      vec2 uv = vUv - 0.5;
      if (uMapAspect > cardAspect) {
        // Source is wider than the card: crop the sides.
        uv.x *= cardAspect / uMapAspect;
      } else {
        // Source is taller: crop top and bottom.
        uv.y *= uMapAspect / cardAspect;
      }
      base = texture2D(uMap, uv + 0.5).rgb;
    }

    // Cards at the back of the orbit dim rather than vanish, so the ring still
    // reads as a solid object surrounding the prism.
    float depthDim = mix(0.34, 1.0, uFacing);

    /*
      The blueprint grid is the panel's own texture when there is no media,
      and would be scaffolding printed over a photograph when there is — so it
      drops to a fifth of its strength over real footage. Enough to keep the
      cards reading as one system, not enough to look like a defect.
    */
    float grid = gridMask(vUv, 7.0, mix(2.6, 1.0, uFacing)) * mix(1.0, 0.2, uHasMap);
    vec3 color = base * depthDim + grid * 0.18 * uFacing;

    /*
      Rim light as a thin BORDER, measured to the nearest edge in UV space.

      The first version used a radial term (dot(position.xy, position.xy)),
      which brightens outward from the centre in an ellipse — on screen that
      read as a dark elliptical stain sitting in the middle of every card,
      because the centre received none of the lift the edges did. Distance to
      the nearest edge gives an even hairline all the way around instead.
    */
    vec2 toEdge = min(vUv, 1.0 - vUv);
    float border = min(toEdge.x, toEdge.y);
    float rim = 1.0 - smoothstep(0.0, 0.05, border);
    color += vec3(0.58, 0.52, 1.0) * rim * 0.75 * uFacing;

    // Entry dissolve: a scan wipe travelling up the card as it arrives.
    float wipe = smoothstep(uArrival * 1.35 - 0.35, uArrival * 1.35, vUv.y + 0.0001);
    float alpha = shape * (1.0 - wipe) * mix(0.0, 0.94, uArrival);

    // A faint leading edge on the wipe so the card materialises along a line.
    color += vec3(0.6, 0.9, 1.0) * (1.0 - smoothstep(0.0, 0.06, abs(vUv.y - uArrival * 1.35))) * 0.8 * (1.0 - uArrival);

    // Very low-contrast scan drift; never enough to read as flicker.
    color += (0.5 + 0.5 * sin((vUv.y + uTime * 0.04) * 190.0)) * 0.012;

    if (alpha < 0.004) discard;

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export function makeOrbitCardUniforms(tint: [string, string]): OrbitCardUniforms {
  return {
    uTintA: { value: new Color(tint[0]) },
    uTintB: { value: new Color(tint[1]) },
    uArrival: { value: 0 },
    uFacing: { value: 1 },
    uTime: { value: 0 },
    // Null until the media resolves; uHasMap keeps the shader on the
    // generated panel until then, so a slow file never shows an empty card.
    uMap: { value: null },
    uHasMap: { value: 0 },
    uMapAspect: { value: 1 },
  };
}
