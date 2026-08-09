import type { QuaternionLike } from '@/types/project';

/*
  Types for the existing JavaScript frameState module, so the new TypeScript
  components get real checking on it without rewriting the hero.
*/

export declare const pointer: { x: number; y: number };
export declare const orientation: QuaternionLike;
export declare function bindPointer(): () => void;
export declare function damp(lambda: number, dt: number): number;
