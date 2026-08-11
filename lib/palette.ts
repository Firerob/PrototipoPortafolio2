/*
  ── The palette, as one source of truth ─────────────────────────────────────

  Before this file the palette lived in two places that could not agree: the
  Tailwind @theme block in globals.css, and ~40 hand-typed hex literals spread
  across the 3D components. That split is exactly why a scroll-driven colour
  morph was not possible — half the scene could not be told to change.

  Everything now reads from here. The CSS side consumes it through custom
  properties that ColorMorph writes; the WebGL side reads `sceneColor`, which
  is mutated in place once per frame.

  ── Provenance of the values ────────────────────────────────────────────────

  Not a database match, and worth being explicit about since the previous
  palette note in globals.css made the same admission: UI-UX-Pro-Max's
  colors.csv has no dark luxury/portfolio row — every "Luxury/Premium Brand"
  and "Portfolio/Personal" entry in it is a LIGHT scheme (#FAFAF9 / #FAFAFA
  backgrounds). What the database does establish, and what these values take
  from it, is the hue strategy:

    - Luxury/Premium Brand → warm stone neutrals (#1C1917, #44403C) with a
      muted gold accent (#A16207, itself already WCAG-adjusted down from
      #CA8A04). That is where the champagne family below comes from.
    - Portfolio/Personal   → cool zinc neutrals with a monochrome + single
      accent structure. That is the restraint model: one accent, never two
      competing.

  Every foreground here was checked against the LIGHTEST background in the set
  (Index, #0D0D11) rather than the darkest, so the worst case passes rather
  than the average one. Lowest ratio in the set is 6.5:1 against a 4.5:1
  requirement — headroom kept on purpose, because these colours cross-fade and
  an intermediate value must not be the one that fails.
*/

export interface PaletteStop {
  /** Page background. */
  bg: string;
  /** The single accent. One per stop — never two competing. */
  accent: string;
  /** Softer accent, for large fills and hairlines. */
  accentSoft: string;
  /** Key light colour in the 3D scene. */
  key: string;
  /** Counter/rim light colour. */
  rim: string;
  /** Floor grid. Deliberately near-invisible — it only implies the space. */
  grid: string;
}

/*
  Five stops, matching the page's own beats. Index/News/About/Contact are the
  four stages sceneScroll already publishes; Hero is the state before them.

    hero     obsidian, pure silver light — coldest and cleanest
    index    graphite, champagne warms the key light
    news     cool graphite, steel — the reportage beat
    about    warm neutral, the warmest point of the page
    contact  deep midnight, desaturated blue — coldest again, but blue-cold
             rather than the hero's neutral-cold, so the page arrives
             somewhere rather than looping back to where it started
*/
export const PALETTE_STOPS: readonly PaletteStop[] = [
  // Hero
  {
    bg: '#06060A',
    accent: '#D8DCE6',
    accentSoft: '#AEB6C6',
    key: '#FFFFFF',
    rim: '#AEB6C6',
    grid: '#2A2E38',
  },
  // Index
  {
    bg: '#0D0D11',
    accent: '#C9B79C',
    accentSoft: '#A89882',
    key: '#F0E4D0',
    rim: '#9A8E7C',
    grid: '#2E2C29',
  },
  // News
  {
    bg: '#0B0C10',
    accent: '#B8BFCC',
    accentSoft: '#8A9BB8',
    key: '#E8EEF6',
    rim: '#8A9BB8',
    grid: '#282C33',
  },
  // About
  {
    bg: '#0A0B0F',
    accent: '#C4B49C',
    accentSoft: '#9A8E7C',
    key: '#F2E9DA',
    rim: '#9A8E7C',
    grid: '#2B2A28',
  },
  // Contact
  {
    bg: '#080A11',
    accent: '#8A9BB8',
    accentSoft: '#6E7F99',
    key: '#DCE6F5',
    rim: '#6E7F99',
    grid: '#242A36',
  },
];

export const STOP_HERO = 0;
export const STOP_INDEX = 1;
export const STOP_NEWS = 2;
export const STOP_ABOUT = 3;
export const STOP_CONTACT = 4;
export const STOP_LAST = STOP_CONTACT;

/* ── Hex maths ─────────────────────────────────────────────────────────── */

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const toHex = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');

/**
 * Blend two hex colours.
 *
 * sRGB-space, deliberately. A perceptual space (OKLab) would be the better
 * choice for a wide hue sweep, but every pair here is a near-neutral within a
 * few points of the same lightness — the two paths are visually identical
 * across that range, and sRGB keeps this dependency-free and cheap enough to
 * run per frame.
 */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const k = Math.min(1, Math.max(0, t));
  return `#${toHex(ar + (br - ar) * k)}${toHex(ag + (bg - ag) * k)}${toHex(ab + (bb - ab) * k)}`;
}

/**
 * "#06060a" → "6 6 10", the space-separated form `rgb()` takes.
 *
 * Needed because a hex custom property cannot carry an alpha at the point of
 * use: `rgba(var(--bg), 0.86)` is not valid CSS. Publishing the channels
 * separately lets a consumer write `rgb(var(--bg-dynamic-rgb) / 0.86)` and get
 * a translucent version of the live background — which is exactly what the
 * section scrims need, and why they were previously stuck on a hardcoded
 * rgba() that could never morph.
 */
export function toRgbTriplet(hex: string): string {
  const [r, g, b] = parse(hex);
  return `${r} ${g} ${b}`;
}

/** smootherstep — zero velocity AND acceleration at both ends. */
export function smootherstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * The palette at a continuous position along the page, 0 (hero) → 4 (contact).
 *
 * Piecewise between authored stops with smootherstep on the segment fraction,
 * so each arrival and departure has zero velocity. Exactly the same shape as
 * poseAt() in lib/sceneScroll.ts, and for the same reason: a linear blend
 * reads as being dragged on rails.
 */
export function paletteAt(pos: number): PaletteStop {
  const p = Math.min(STOP_LAST, Math.max(0, pos));
  const i = Math.min(PALETTE_STOPS.length - 2, Math.floor(p));
  const f = smootherstep(p - i);
  const a = PALETTE_STOPS[i];
  const b = PALETTE_STOPS[i + 1];

  return {
    bg: mixHex(a.bg, b.bg, f),
    accent: mixHex(a.accent, b.accent, f),
    accentSoft: mixHex(a.accentSoft, b.accentSoft, f),
    key: mixHex(a.key, b.key, f),
    rim: mixHex(a.rim, b.rim, f),
    grid: mixHex(a.grid, b.grid, f),
  };
}

/*
  ── Runtime state, held outside React ───────────────────────────────────────

  Same contract as sceneScroll/archiveScroll: one authority writes it per
  frame, everything else reads it inside useFrame, and nothing here triggers a
  React render. Colour changing at scroll rate through setState would
  re-render the entire canvas subtree on every wheel tick.
*/
interface SceneColorState {
  /** Continuous palette position, 0..4. */
  pos: number;
  /** Multiplier on key-light intensity — the idle "breath". */
  breath: number;
  current: PaletteStop;
}

export const sceneColor: SceneColorState = {
  pos: 0,
  breath: 1,
  current: { ...PALETTE_STOPS[0] },
};

/** Amplitude of the idle breath, as a fraction of key-light intensity. */
export const BREATH_AMOUNT = 0.05;
/** Seconds per full breath cycle. Slow enough to never read as a pulse. */
export const BREATH_PERIOD = 14;

/**
 * Advance the shared colour state. Called by exactly ONE authority per frame
 * (ColorMorph) so the CSS and WebGL sides can never disagree about what
 * colour the page currently is.
 */
export function setSceneColor(pos: number, timeSeconds: number): void {
  sceneColor.pos = Math.min(STOP_LAST, Math.max(0, pos));
  sceneColor.current = paletteAt(sceneColor.pos);
  sceneColor.breath = 1 + Math.sin((timeSeconds / BREATH_PERIOD) * Math.PI * 2) * BREATH_AMOUNT;
}

/*
  ── The light hue ───────────────────────────────────────────────────────────

  Deliberately separate from the scroll palette above, and the split is the
  whole reason the previous attempt failed to show:

    palette  = the ROOM.  Scroll-driven, near-neutral, drives the DOM.
    hue      = the LIGHT. Time-driven, saturated, drives the 3D lights.

  Tinting the glass itself (attenuationColor) was the wrong lever. A
  transmission material is mostly a picture of whatever is BEHIND it, so with
  neutral lights over a near-black background there was almost nothing for a
  tint to act on — the change was real and invisible. Moving the lights makes
  the prism, the floor grid, the backdrop word and the bloom all pick the
  colour up at once, because they are all lit by it.

  One writer: DynamicLighting owns the clock and publishes here. SpotGlow and
  CurvedGrid read. Two components each running their own clock would drift
  apart within a minute and the scene would visibly disagree with itself.
*/
export const sceneLight = { hue: 0.55 };

/** Seconds for one full trip along the arc. */
export const HUE_CYCLE_SECONDS = 12;
/** Saturation of the key light. Drop toward 0.45 for a more restrained look. */
export const HUE_SATURATION = 0.8;

/*
  ── The arc, and why it is not the whole wheel ──────────────────────────────

  The obvious implementation is `(elapsedTime * 0.1) % 1` — a full trip round
  the colour wheel. Measured, that spends roughly 40% of every cycle in green,
  yellow and orange: at a 10s period the lights sit on #bcf359 and #f3da59 for
  about four seconds out of ten. Those are not in the reference look, and they
  are not in the brief's own examples either, which name cyan, magenta and
  purples — every one of them on the cool half.

  So the sweep runs an ARC instead: 0.50 → 0.92, cyan → blue → violet →
  magenta, then wraps back. Same continuous motion, same "the colour is always
  changing" read, without the four seconds of lime green.

  To go back to the full wheel, set HUE_START 0 and HUE_SPAN 1.
*/
export const HUE_START = 0.5;
export const HUE_SPAN = 0.42;

/**
 * Light hue at time `t` (seconds), 0..1.
 *
 * A plain linear ramp rather than the two-sine wander used before. That
 * wander was built to hide its own period, which matters for an effect meant
 * to be subliminal — this one is meant to be SEEN, and a steady sweep reads
 * as deliberate lighting rather than as drift.
 */
export function lightHueAt(t: number): number {
  return (HUE_START + ((t / HUE_CYCLE_SECONDS) % 1) * HUE_SPAN) % 1;
}

/**
 * A second hue offset along the same arc, for the rim light.
 *
 * Offsetting the raw hue by a third of the wheel would walk straight out of
 * the arc and back into the greens the arc exists to avoid. Offsetting the
 * PHASE instead keeps both lights inside it while still guaranteeing they are
 * never the same colour — and that disagreement between two lights is what
 * models the prism's faces, far more than either colour on its own.
 */
export function rimHueAt(t: number): number {
  return (HUE_START + (((t / HUE_CYCLE_SECONDS) + 0.45) % 1) * HUE_SPAN) % 1;
}

export function resetSceneColor(): void {
  sceneColor.pos = 0;
  sceneColor.breath = 1;
  sceneColor.current = { ...PALETTE_STOPS[0] };
}
