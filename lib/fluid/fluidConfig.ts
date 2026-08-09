import type { FluidConfig } from './webglFluid';

/*
  Hues measured from the site's own tokens rather than picked by eye:
    --color-accent  #6d4bff -> 0.6981
    --color-cyan    #4be1ff -> 0.5278
  The simulation only supports one hue at a time (RANDOM_COLORS off), so the
  background component sweeps SPLAT_HUE between these two bounds. Staying
  inside the existing accent pair is what keeps the fluid reading as part of
  the design system instead of a stock rainbow demo — and it sidesteps the
  "AI purple/pink gradients" anti-pattern the style database flags.
*/
export const HUE_ACCENT = 0.6981;
export const HUE_CYAN = 0.5278;

export const fluidBackgroundConfig: FluidConfig = {
  // Velocity field resolution. The visual detail comes from DYE_RESOLUTION;
  // raising this mostly buys simulation accuracy nobody can see at 8% opacity.
  SIM_RESOLUTION: 128,
  // Upstream ships 1024. Halved: this is a backdrop sitting behind two other
  // WebGL canvases, and dye resolution is the single biggest fill-rate cost.
  DYE_RESOLUTION: 512,
  CAPTURE_RESOLUTION: 512,

  /*
    Dissipation raised hard after seeing it render.

    At 1.8 the dye from the initial splat burst hung around as a pale grey
    fog across the whole viewport — it turned the deep-black showcase into
    light grey and destroyed the contrast of every HUD label over it. The
    sections further down, which the fluid does not reach, looked correct,
    which is what isolated it. 4.2 clears the burst in a couple of seconds and
    leaves only what the cursor is actively stirring.
  */
  DENSITY_DISSIPATION: 4.2,
  VELOCITY_DISSIPATION: 1.4,

  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 20,
  // A little vorticity so the flow curls like smoke rather than spreading
  // like a stain. Upstream default is 0 (completely laminar).
  CURL: 3,

  SPLAT_RADIUS: 0.22,
  SPLAT_FORCE: 5200,

  SHADING: true,
  COLORFUL: false,
  COLOR_UPDATE_SPEED: 4,
  PAUSED: false,

  BACK_COLOR: { r: 5, g: 5, b: 8 },
  TRANSPARENT: true,

  // Bloom and sunrays are extra full-screen passes each frame. On a layer
  // that ends up at low opacity behind everything, they cost real milliseconds
  // and change almost nothing — the CSS blur on top does the same job free.
  BLOOM: false,
  BLOOM_ITERATIONS: 8,
  BLOOM_RESOLUTION: 256,
  BLOOM_INTENSITY: 0.8,
  BLOOM_THRESHOLD: 0.6,
  BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: false,
  SUNRAYS_RESOLUTION: 196,
  SUNRAYS_WEIGHT: 1.0,

  RANDOM_COLORS: false,
  SPLAT_HUE: HUE_ACCENT,

  /*
    This is a raw fetch() inside webglFluid.js, not a next/image src or an
    <img> — Next only rewrites asset URLs for the mechanisms it controls, so a
    hardcoded root-absolute path would 404 once the site is served from a
    subpath (GitHub Pages: /PrototipoPortafolio2/...). The basePath has to be
    prefixed by hand here.
  */
  DITHERING_TEXTURE_URL: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fluid/LDR_LLL1_0.png`,
};
