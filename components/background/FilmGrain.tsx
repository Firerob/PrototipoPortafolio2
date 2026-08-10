/**
 * Cinematic texture over the whole page: organic grain plus a vignette.
 *
 * ── Why this is CSS and not @react-three/postprocessing ─────────────────────
 *
 * The brief asked for Noise, Vignette and slight chromatic aberration through
 * an EffectComposer. Two of the three are here; the third is not, and the
 * reason is specific rather than a shrug.
 *
 * The canvas runs with `alpha: true` and deliberately composites over the
 * fluid simulation underneath it — that is the whole reason BackdropCanvas
 * calls `gl.setClearAlpha(0)`. An EffectComposer renders the scene into a
 * render target and then runs full-screen passes over it, and those passes
 * write opaque pixels across the entire frame. Dropping one in would fill
 * every transparent region of the canvas and hide the fluid layer completely.
 * Making it preserve alpha through a Noise and a Vignette pass is possible but
 * it is a rewrite of how the two layers combine, not a plug-in.
 *
 * It would also add ~150KB to a bundle already carrying three and drei, and a
 * full-screen render-target round trip per frame on top of a WebGL scene and a
 * fluid sim.
 *
 * Grain and vignette do not need any of that — they are a flat overlay, which
 * is what they are in a compositor anyway. Chromatic aberration genuinely
 * cannot be done this way; at the "minimal" strength the brief asks for it is
 * the least visible of the three, and it is the honest thing to leave out
 * rather than fake.
 *
 * ── The grain itself ────────────────────────────────────────────────────────
 *
 * An inline SVG feTurbulence as a data URI: no network request, no image
 * asset, and it tiles at any resolution because it is generated per-pixel.
 * `baseFrequency` at 0.8 gives a fine sensor-grain size rather than the
 * blotchy clouds a low frequency produces.
 */
const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
       <filter id="n">
         <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
         <feColorMatrix type="saturate" values="0"/>
       </filter>
       <rect width="180" height="180" filter="url(#n)" opacity="0.42"/>
     </svg>`,
  );

export default function FilmGrain() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
      {/*
        Vignette. Sits under the grain so the grain is not itself darkened at
        the corners — real film grain is uniform across the frame; it is the
        exposure that falls off.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 100% at 50% 45%, transparent 42%, rgba(0,0,0,0.28) 78%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      {/*
        `soft-light` rather than `overlay` or plain opacity: it lifts and dips
        around the mid-point without crushing the blacks, so the void
        background stays void instead of turning into grey static. Opacity is
        low enough to read as texture rather than as noise — at 0.05 it is
        invisible on a phone and obvious on a calibrated monitor, which is
        where this kind of detail is supposed to live.
      */}
      <div
        className="absolute inset-0 mix-blend-soft-light opacity-[0.055]"
        style={{ backgroundImage: `url("${GRAIN}")`, backgroundRepeat: 'repeat' }}
      />
    </div>
  );
}
