/*
  Root-absolute URLs for files in /public.

  Next rewrites URLs for the mechanisms it controls — routes, /_next/* chunks,
  next/font — but a raw `src="/work/foo.png"` on a plain <img> is not one of
  them. This repo deploys to GitHub Pages under a subpath
  (/PrototipoPortafolio2/), so an unprefixed path resolves against the domain
  root and 404s in production while working perfectly in local dev. That is
  exactly the trap already documented for the fluid simulation's dithering
  texture in lib/fluid/fluidConfig.ts; this is the shared fix.

  next/image would handle the prefix itself, but `output: 'export'` with
  `images: { unoptimized: true }` means it buys no optimisation here anyway —
  so a plain <img> plus this helper is the smaller, more predictable path.
*/
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Prefix a /public path with the deployment base path.
 *
 * `asset('/work/thing.png')` → '/work/thing.png' locally,
 * '/PrototipoPortafolio2/work/thing.png' on Pages.
 *
 * Absolute URLs are passed through untouched, so a project can point at
 * externally hosted media without a special case at the call site.
 */
export function asset(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
