import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/*
  GitHub Pages serves this repo at https://firerob.github.io/PrototipoPortafolio2/
  — a subpath, not the domain root, because the repo isn't named
  `firerob.github.io`. basePath/assetPrefix are what make every Next-managed
  URL (routes, /_next/* chunks, next/font) resolve under that subpath instead
  of 404ing.

  Only set in CI (see .github/workflows/deploy.yml), not locally: `npm run
  dev`/`build` on this machine still serve from `/`, so local work is
  unaffected.
*/
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages only serves static files — no Node server for Next's image
  // optimizer or SSR to run on. `output: 'export'` makes `next build` emit
  // plain static HTML/CSS/JS into `out/` instead.
  output: 'export',
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  // Static export has no server, so next/image's optimization endpoint isn't
  // available. Unused today (no next/image in the codebase) but harmless and
  // forward-compatible if one is added later.
  images: { unoptimized: true },
  // Pages serves each route as a real folder (about/index.html) rather than
  // rewriting extensionless paths, so routes need a trailing slash to resolve.
  trailingSlash: true,

  // three ships untranspiled ESM in some subpaths; drei pulls several of them in.
  transpilePackages: ['three'],
  turbopack: {
    // Pin the workspace root. There is a stray package-lock.json in the user's
    // home directory, and without this Turbopack walks up to C:\Users\Felipe
    // looking for the workspace root.
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
