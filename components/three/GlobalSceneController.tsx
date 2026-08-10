'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FogExp2 } from 'three';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { MathUtils } from 'three';
import {
  resetSceneScroll,
  sceneScroll,
  smoothing,
  setScenePresence,
  setSceneStage,
  STAGE_LAST,
} from '@/lib/sceneScroll';
import DeepField from './DeepField';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

/**
 * Orchestrates the 3D world across Index → News → About → Contact.
 *
 * ── What this component does and, importantly, does NOT do ──────────────────
 *
 * It owns the ScrollTriggers and the post-hero scene contents. It does NOT
 * write `camera.position`.
 *
 * That split is not fussiness. HeroScene's CameraRig already writes the camera
 * every frame for the hero parallax and the archive dive, and two components
 * writing camera.position in the same frame is the classic scroll-scene
 * stutter: whichever useFrame ran last wins, and React makes no promise about
 * that order. So there is exactly one camera authority on this page, in
 * CameraRig, and this component publishes a target for it to read through the
 * `sceneScroll` store. Same contract the archive dive already uses.
 *
 * The scroll → value mapping is one trigger over the whole post-hero run
 * rather than one per section — see the note in lib/sceneScroll.ts for why
 * four overlapping triggers produce a stutter at every boundary.
 *
 * `scrub` is deliberately absent. Scrub smooths a TWEEN's playhead, and this
 * trigger tweens nothing; it writes a plain float in onUpdate. The smoothing
 * belongs where the value is consumed — CameraRig eases toward the pose with a
 * frame-rate-independent lerp, so the feel is identical at 60Hz and 144Hz,
 * which a scrub value cannot promise. Lenis has already smoothed the scroll
 * position feeding it.
 */
export default function GlobalSceneController({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const { scene } = useThree();
  const fog = useRef<FogExp2 | null>(null);

  useIsomorphicLayoutEffect(() => {
    /*
      Fog, added imperatively rather than as <fogExp2 attach="fog" />.

      The hero must stay unfogged — the prism reads as glass because nothing is
      washing it out — so the fog has to arrive with the post-hero world and
      leave with it. Attaching it declaratively would apply it to the whole
      canvas lifetime. Density is driven from presence below.

      It also does real work beyond mood: the threejs guidance notes fog culls
      distant geometry out of visual relevance, and the mote field extends to
      z = -20.
    */
    const instance = new FogExp2(0x05050a, 0);
    fog.current = instance;
    scene.fog = instance;

    return () => {
      if (scene.fog === instance) scene.fog = null;
      fog.current = null;
    };
  }, [scene]);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const index = document.querySelector('#index');
      const contact = document.querySelector('#contact');
      if (!index || !contact) return;

      /*
        Elements resolved against the document, not passed as selector strings.

        gsap.context(fn, scope) scopes selector lookups to `scope`, and this
        component renders inside a WebGL canvas — it has no DOM subtree at all,
        so '#index' would resolve to nothing. HeroCanvas hit exactly this and
        the comment there says the same thing.
      */
      const main = ScrollTrigger.create({
        trigger: index,
        start: 'top bottom',
        endTrigger: contact,
        end: 'bottom bottom',
        invalidateOnRefresh: true,
        // Measured after the pins above it inflate the page height.
        refreshPriority: -2,
        onUpdate: (self) => setSceneStage(self.progress * STAGE_LAST),
        onRefresh: (self) => setSceneStage(self.progress * STAGE_LAST),
      });

      /*
        Presence is a separate, shorter ramp.

        The world must not simply appear the instant #index scrolls into view —
        IndexArrival's wave is still closing over the screen at that moment.
        This fades it up across the last part of that crossing so the field is
        already there, faintly, when the wave clears.
      */
      const fade = ScrollTrigger.create({
        trigger: index,
        start: 'top bottom+=60%',
        end: 'top center',
        invalidateOnRefresh: true,
        refreshPriority: -2,
        onUpdate: (self) => setScenePresence(self.progress),
        onRefresh: (self) => setScenePresence(self.progress),
      });

      return () => {
        main.kill();
        fade.kill();
        resetSceneScroll();
      };
    });

    return () => {
      ctx.revert();
      resetSceneScroll();
    };
  }, []);

  /*
    Fog density rides presence, so the hero stays crisp and the post-hero world
    arrives already atmospheric. Eased rather than set directly: a fog that
    snaps to density as a trigger crosses is visible as a flash across the
    whole frame, because fog touches every fragment at once.
  */
  useFrame((_, delta) => {
    const instance = fog.current;
    if (!instance) return;
    const dt = Math.min(delta, 1 / 30);
    instance.density = MathUtils.lerp(
      instance.density,
      0.055 * sceneScroll.presence,
      smoothing(0.04, dt),
    );
  });

  return <DeepField reducedMotion={reducedMotion} />;
}
