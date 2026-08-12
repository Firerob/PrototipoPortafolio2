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

  /*
    ── Detail view ───────────────────────────────────────────────────────────
    Everything below feeds the modal opened by clicking a row in the Deep
    Index. All of it is optional and the modal renders only the parts that
    exist, so a project can ship with nothing here and still open cleanly.
  */

  /**
   * Full-resolution file for the zoom/fullscreen layer, e.g.
   * '/work/full/blur.jpg'. Falls back to `image` when absent, so this is only
   * worth setting when the card-sized file is too small to hold up
   * full-screen. Same base-path rule as `image` — no hand-written prefix.
   */
  full?: string;
  /** Long-form description. One string per paragraph. */
  body?: string[];
  /**
   * Spec sheet, rendered in order as a definition list: client, year, tools,
   * role, anything else. Free-form on purpose — projects do not share a fixed
   * set of facts, and a fixed shape would force empty rows.
   *
   * These are checkable public claims. Do not put a client's name here unless
   * the work was really for them.
   */
  credits?: { label: string; value: string }[];
  /** Destination for the detail view's call to action. Omitted hides it. */
  href?: string;
  /** Label for that button. Defaults to 'View full project'. */
  hrefLabel?: string;
}

/** Read-only snapshot of a quaternion, for HUD widgets that only display it. */
export interface QuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}
