'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { archiveScroll, CAMERA_RANGE, phaseOf, smootherstep } from '@/lib/archiveScroll';
import { fitFactor, isNarrowViewport } from '@/lib/responsive3d';

/*
  The giant word sits INSIDE the canvas, not behind it as HTML.

  Tempting as an HTML layer is (crisper type, real IBM Plex, zero GPU cost),
  it would then render behind the whole canvas — including the grid. The brief
  puts the word in front of the grid and behind the prism, which only works if
  it shares the depth buffer. It also means the transmission material actually
  refracts the letterforms, which is most of the effect.

  It carries no accessible name of its own: the canvas has an aria-label and
  the real <h1> lives in the DOM overlay, so announcing it here would just
  duplicate the heading. That matters more now the word CHANGES — a rotating
  string exposed to assistive tech would be an unrequested live region
  announcing a new value every few seconds.
*/

/** The rotation. Order is the read: what the studio does, then where it does
 *  it, then how to reach it. */
const WORDS = ['WORKS', 'FRONTEND', 'SYSTEMS', 'LABS', 'CONTACT'];

/*
  ⬅️  AJUSTA AQUÍ LA VELOCIDAD

  Seconds each word holds before the next one takes over. The light's own
  sweep (HUE_CYCLE_SECONDS in lib/palette.ts) is 12s, so at 4s the word turns
  over exactly three times per colour cycle and the two land on the same beat
  every time. Any divisor of 12 — 2, 3, 4, 6 — keeps that lock; other values
  drift against the colour, which is not wrong, just less deliberate.
*/
const WORD_SECONDS = 4;

/*
  How long the cross-fade takes at each end of a word's life.

  This is not only styling. troika regenerates the glyph geometry when `text`
  changes, and that regeneration is ASYNC — its own docs note a sync "won't
  complete until next frame at the earliest". A hard cut would therefore show
  either the old word for an extra frame or a blank one. Swapping while the
  fill is at zero makes the whole regeneration unobservable, so the fade is
  what buys the technique its correctness, not just its polish.
*/
const FADE_SECONDS = 0.55;

/** Authored size, for the 16:9 desktop frame. Scaled down proportionally on
 *  anything narrower — see lib/responsive3d.ts. */
const FONT_SIZE = 3.4;

/*
  Peak fill.

  Was 0.075 — chosen when this was a barely-there tint, and far too faint for
  a word that is now meant to be read and to be visibly distorted by the glass
  in front of it. 0.6 is a considered ceiling rather than the 0.8 the brief
  suggested: the hero's <h1>, the nav and the scroll cue all sit over this
  area, and body copy on a moving field is exactly the contrast case the
  vignette in HeroSection exists to protect. Push it toward 0.8 if the word
  should dominate; the HUD is what pays for it.
*/
const PEAK_FILL = 0.6;

/** smootherstep — zero velocity AND acceleration at both ends. A linear ramp
 *  reads as a dimmer being turned; this reads as a word arriving. */
const ease = (t) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

export default function BackdropWord({
  /** Kept as the opening word so the site's own heroWord still leads. */
  word,
  words = WORDS,
  reducedMotion = false,
  /*
    Troika fetches its default typeface (Roboto) from the Google CDN on first
    paint. To keep the page self-hosted AND on-brand, drop
    IBMPlexSans-Bold.woff into /public/fonts/ and pass it here:
      <BackdropWord font="/fonts/IBMPlexSans-Bold.woff" />
    Left undefined the component still renders — just in Troika's default face.
  */
  font,
}) {
  const ref = useRef(null);
  /** Last index actually written. Guards the swap so `text` and the expensive
   *  sync() that follows it happen once per word, not once per frame. */
  const shown = useRef(-1);
  /** Last fontSize written, so the troika re-layout only runs on resize. */
  const sized = useRef(0);

  // `word` leads if given, and is not repeated later in the rotation.
  const list = useMemo(
    () => (word ? [word, ...words.filter((w) => w !== word)] : words),
    [word, words],
  );

  useFrame((state) => {
    const node = ref.current;
    if (!node) return;

    const t = state.clock.elapsedTime;

    /*
      ── Responsive size ───────────────────────────────────────────────────

      Straight proportional fit, not the softened one the prism uses. This
      word is authored to bleed past both edges by about 40%, and that bleed
      IS the composition — keeping it constant is the whole point. At the
      authored fontSize a phone shows roughly one letter of a five-letter
      word (measured: 5.3x the visible width).

      Guarded on change because fontSize is a troika layout property: writing
      it re-runs glyph layout, so setting it every frame would re-layout the
      text sixty times a second. It only moves on resize, and an orientation
      change is a resize — which is exactly why this needs no reload and no
      breakpoint listener.
    */
    const size = FONT_SIZE * fitFactor(state.viewport.width);
    if (Math.abs(size - sized.current) > 0.001) {
      sized.current = size;
      node.fontSize = size;
      node.sync();
    }

    /*
      Lift the word on a portrait frame. With the prism scaled down and
      centred, a phone stacks the two closer than the desktop composition ever
      does; a small offset keeps the word reading behind the object rather
      than through it.

      Written every frame, outside the guard above, and deliberately so:
      `position` is a declared prop on the <Text> below, and R3F re-applies
      declared props on any re-render. Setting it once inside the resize guard
      would let a stray re-render silently snap the word back to the desktop
      offset with nothing to correct it until the next resize. Unlike
      fontSize, position is not a layout property — no re-sync, no cost.
    */
    node.position.y = isNarrowViewport(state.viewport.width, state.viewport.height)
      ? 0.55
      : 0.15;

    /*
      ── EL ÍNDICE ─────────────────────────────────────────────────────────

      floor(t / WORD_SECONDS) advances by exactly one every WORD_SECONDS; the
      modulo wraps it back to the start of the list. Change WORD_SECONDS above
      and nothing else needs to move.
    */
    const index = reducedMotion ? 0 : Math.floor(t / WORD_SECONDS) % list.length;

    if (index !== shown.current) {
      shown.current = index;
      node.text = list[index];
      /*
        Explicit sync, rather than leaning on the automatic one troika runs in
        onBeforeRender. Both work, but the automatic path starts a frame later,
        and starting the regeneration at the exact moment the fill hits zero is
        what keeps it inside the fade window rather than trailing out of it.
      */
      node.sync();
    }

    /*
      ── LA OPACIDAD ───────────────────────────────────────────────────────

      Two ramps, taking whichever is lower: one rising over the first
      FADE_SECONDS of the word's life, one falling over its last. Their
      minimum is a plateau at full fill with a smooth shoulder at each end.

      The index above flips exactly when `phase` wraps to 0 — the instant the
      rising ramp is at zero — so the swap always happens in the dark.
    */
    const phase = t % WORD_SECONDS;
    const fadeIn = ease(phase / FADE_SECONDS);
    const fadeOut = ease((WORD_SECONDS - phase) / FADE_SECONDS);
    const cycle = reducedMotion ? 1 : Math.min(fadeIn, fadeOut);

    /*
      Fade out on the archive dive.

      The word is a pale tint chosen to sit on a near-black background. Once
      the wave flips the page to light it inverts into a large dark smear
      across the middle of the corridor, so it leaves with the rest of the
      hero. Multiplied with the word cycle rather than replacing it, so the
      two fades compose instead of fighting.
    */
    const dive = smootherstep(phaseOf(archiveScroll.progress, CAMERA_RANGE));

    node.fillOpacity = PEAK_FILL * cycle * (1 - dive);

    /*
      A settle of 0.8% on the way in. Deliberately below the threshold where
      it reads as a "pop" — at this size it is felt as the word coming to rest
      rather than seen as a scale animation. Remove this line and the
      transition is still correct, just flatter.
    */
    if (!reducedMotion) node.scale.setScalar(0.992 + 0.008 * fadeIn);
  });

  return (
    <Text
      ref={ref}
      font={font}
      position={[0, 0.15, -4]}
      fontSize={FONT_SIZE}
      letterSpacing={-0.045}
      anchorX="center"
      anchorY="middle"
      color="#ffffff"
      fillOpacity={0}
      // Behind everything else in the transparent pass; without depthWrite off
      // it punches a hole in the grid glow drawn after it.
      renderOrder={-1}
      material-toneMapped={false}
      material-depthWrite={false}
      material-transparent
    >
      {list[0]}
    </Text>
  );
}
