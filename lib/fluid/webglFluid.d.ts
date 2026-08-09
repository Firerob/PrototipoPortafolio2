export interface FluidConfig {
  SIM_RESOLUTION: number;
  DYE_RESOLUTION: number;
  CAPTURE_RESOLUTION: number;
  DENSITY_DISSIPATION: number;
  VELOCITY_DISSIPATION: number;
  PRESSURE: number;
  PRESSURE_ITERATIONS: number;
  CURL: number;
  SPLAT_RADIUS: number;
  SPLAT_FORCE: number;
  SHADING: boolean;
  COLORFUL: boolean;
  COLOR_UPDATE_SPEED: number;
  PAUSED: boolean;
  BACK_COLOR: { r: number; g: number; b: number };
  TRANSPARENT: boolean;
  BLOOM: boolean;
  BLOOM_ITERATIONS: number;
  BLOOM_RESOLUTION: number;
  BLOOM_INTENSITY: number;
  BLOOM_THRESHOLD: number;
  BLOOM_SOFT_KNEE: number;
  SUNRAYS: boolean;
  SUNRAYS_RESOLUTION: number;
  SUNRAYS_WEIGHT: number;
  RANDOM_COLORS: boolean;
  /** Hue in 0..1. Only used when RANDOM_COLORS is false. */
  SPLAT_HUE: number;
  /** Absolute URL of the dithering texture, served from /public. */
  DITHERING_TEXTURE_URL: string;
}

export interface FluidHandle {
  destroy(): void;
  setPaused(paused: boolean): void;
}

export declare function createFluidSimulation(
  canvas: HTMLCanvasElement,
  config: FluidConfig,
): FluidHandle;
