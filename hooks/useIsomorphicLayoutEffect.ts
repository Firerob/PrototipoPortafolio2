import { useEffect, useLayoutEffect } from 'react';

/**
 * useLayoutEffect on the client, useEffect on the server.
 *
 * GSAP setup wants layout timing so measurements happen before paint, but
 * useLayoutEffect logs a warning during server rendering — it cannot run there
 * and React says so. This is the standard GSAP-in-React shim: same behaviour
 * in the browser, silent on the server.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
