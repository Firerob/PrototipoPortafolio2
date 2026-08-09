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
}

/** Read-only snapshot of a quaternion, for HUD widgets that only display it. */
export interface QuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}
