export interface Project {
  id: string;
  /** ISO date, rendered with a fixed locale to keep SSR and client in step. */
  date: string;
  title: string;
  subtitle: string;
  /** Terminal-style tags, e.g. "unreal_engine". Lowercase with underscores. */
  tags: string[];
  /** Gradient stops for the placeholder panel until real artwork exists. */
  tint: [string, string];
  /**
   * Optional still, e.g. '/work/wear-go-land.png'. Paths are relative to
   * /public and get the deployment base path applied at render — see
   * lib/asset.ts, and do NOT hand-write the prefix here.
   *
   * Takes precedence over `video` in the index preview: a still is decoded
   * once, where a clip costs a decoder and a per-frame upload for a panel
   * that is only visible on hover.
   */
  image?: string;
  /**
   * Optional preview clip, e.g. '/work/wear-go-land.mp4'. When present the
   * archive corridor plays it, and the index falls back to it when no `image`
   * is set. Same base-path rule as above.
   */
  video?: string;
  /** Alt text for `image`. Required whenever an image is set — the panel is
   *  decorative today, but a real screenshot of the work is content. */
  alt?: string;
}

/** Read-only snapshot of a quaternion, for HUD widgets that only display it. */
export interface QuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}
