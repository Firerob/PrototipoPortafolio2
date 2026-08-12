/**
 * Categories double as the filter bar's tabs, in this order.
 *
 * These are the axes the work is actually split along — what is being
 * researched, not what medium it was published in. A study belongs to exactly
 * one: if a piece is a shader written for a real-time installation, file it
 * under whichever question it was made to answer.
 */
export const STUDY_CATEGORIES = [
  'ALL',
  'SHADERS',
  'CGI & RENDER',
  'INTERACTIVE',
  'REAL-TIME',
] as const;

export type StudyCategory = (typeof STUDY_CATEGORIES)[number];
/** Every category except the ALL pseudo-tab, which no entry can carry. */
export type StudyItemCategory = Exclude<StudyCategory, 'ALL'>;

/**
 * Drives the research core rendered behind the section — see
 * components/three/StudiesCore.tsx. Selecting a study eases every one of
 * these toward its value rather than cutting to it, which is what makes the
 * core read as one instrument being retuned instead of a slideshow.
 */
export interface StudyParams {
  /** Vertex displacement on the core's surface, 0 (still) .. 1 (roiling). */
  distortion: number;
  /** Autorotation and breathing rate. 1 is the base tempo. */
  speed: number;
  /** Scanline frequency across the core's surface. Roughly 2 (bare) .. 14
   *  (dense instrument chatter). */
  facet: number;
}

export interface Study {
  /**
   * Rendered into the HUD stamp as `SYS_STUDY_04`, so the shape matters:
   * one hyphen, which becomes the underscore.
   */
  id: string;
  /** ISO date. Rendered with a fixed locale so SSR and client agree. */
  date: string;
  category: StudyItemCategory;
  title: string;
  /** One or two lines on the card. What was measured, built or found. */
  excerpt: string;
  /** Full text, one string per paragraph, shown in the HUD reader. */
  body: string[];
  /** Terminal-style tags, lowercase with underscores. */
  tags: string[];
  /**
   * Gradient stops for the card banner and the reader's media slot. Always
   * set — it is the fallback whenever no `image` or `video` exists, and the
   * two together are what keep the grid from ever showing a hole.
   */
  tint: [string, string];
  /**
   * Still for the banner, e.g. '/studies/dispersion.jpg'. Paths are relative
   * to /public and get the deployment base path applied at render — see
   * lib/asset.ts, and do NOT hand-write the prefix here.
   *
   * Takes precedence over `video`: a still is decoded once, where a clip
   * holds a decoder open for every card on screen at the same time.
   */
  image?: string;
  /** Alt text for `image`. Required whenever an image is set. */
  alt?: string;
  /** Optional clip, e.g. '/studies/dispersion.mp4'. Same base-path rule. */
  video?: string;
  status?: 'PUBLISHED' | 'COMPLETE' | 'ONGOING' | 'DRAFT' | 'ARCHIVED';
  params: StudyParams;
}
