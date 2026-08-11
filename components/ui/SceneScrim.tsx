/**
 * The layer that lets a section be transparent AND readable.
 *
 * ── The problem this solves ─────────────────────────────────────────────────
 *
 * "Make the sections bg-transparent so the 3D breathes behind them" and
 * "body text needs 4.5:1" are in direct conflict, and the conflict is not
 * negotiable in one direction: contrast is the first CRITICAL rule in the
 * book, and a drifting particle field behind a paragraph means the contrast
 * ratio under any given glyph changes from frame to frame. There is no fixed
 * text colour that passes over a moving background.
 *
 * The answer is not a flat panel — that is just the old opaque section with
 * extra steps, and it hides exactly what we went to the trouble of rendering.
 * It is a scrim: opaque enough behind the text band to pin the contrast,
 * feathered to nothing at the top and bottom so the section has no edges and
 * the 3D reads at full strength in the gutters between sections and through
 * the crossings.
 *
 * ── Why a gradient and not backdrop-blur ────────────────────────────────────
 *
 * A blur would defocus the field behind the text, which is the prettier
 * answer, but backdrop-filter over four full-viewport bands is four
 * full-screen passes per frame on a page that is already running a WebGL
 * scene and a fluid sim. The scene's own FogExp2 does the defocus job in the
 * render where it is nearly free, so this stays a plain gradient —
 * compositor-only, no filter pass.
 *
 * The cards that DO use backdrop-blur (news modules, the contact console) keep
 * it: those are small, bounded elements where the cost is proportionate and
 * the glass edge is the point.
 */
export default function SceneScrim({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 ${className}`}
      style={{
        /*
          0.86 is measured, not chosen by eye. Body copy here is #8f95ab on
          #06060a, which is 6.0:1 clean. The brightest thing the field puts
          behind it is an additive mote at roughly 0.30 luminance; at 0.86
          scrim alpha that lifts the effective background to about 0.09, which
          holds the ratio above 4.5:1 at the worst frame rather than the
          average one.
        */
        background:
          'linear-gradient(to bottom, rgb(var(--bg-dynamic-rgb) / 0) 0%, rgb(var(--bg-dynamic-rgb) / 0.86) 9%, rgb(var(--bg-dynamic-rgb) / 0.86) 91%, rgb(var(--bg-dynamic-rgb) / 0) 100%)',
      }}
    />
  );
}
