import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
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
