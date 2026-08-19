'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  LinearFilter,
  MathUtils,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  VideoTexture,
  type Group,
  type ShaderMaterial,
  type Texture,
} from 'three';
import type { Project } from '@/types/project';
import {
  assemblyFraction,
  orbitPhase,
  setWorksCount,
  syncWorksActiveIndex,
  worksScroll,
} from '@/lib/worksScroll';
import { archiveScroll } from '@/lib/archiveScroll';
import { asset } from '@/lib/asset';
import { openProjectDetail } from '@/lib/projectDetail';
import { DESIGN_VIEWPORT_WIDTH, softFitFactor } from '@/lib/responsive3d';
import {
  CARD_H,
  CARD_W,
  makeOrbitCardUniforms,
  orbitCardFragment,
  orbitCardVertex,
} from './orbitCardShader';

/*
  Ring and card sizing, set against the camera rather than by eye.

  Camera sits at z = 5.2 with a 42° vertical fov, so the front of the ring is
  (5.2 - ORBIT_RADIUS) away and the viewport is 2·d·tan(21°) tall there. The
  first pass used radius 3.05 with a 1.82-tall card: front distance 2.15,
  visible height 1.74 — the active card covered 105% of the frame, swallowing
  the prism and bleeding off both edges.

  These numbers put the front card at ~62% of frame height: unmistakably the
  focus, while the prism and its neighbours stay visible around it.
*/
const ORBIT_RADIUS = 2.78;
/** Where each card starts: off-screen left, so the sweep reads left-to-right. */
const ENTRY = new Vector3(-13, -1.2, 2.2);

/** Smoothed follow of the raw scroll value — see the useFrame comment. */
const SCRUB_LAMBDA = 0.0016;

/*
  Floor under the responsive shrink applied below.

  softFitFactor alone — the same curve Prism.jsx uses on the model at the
  centre of this same ring — took the front card down to ~36% of its
  authored size on an iPhone-width viewport. That was the correct fix for
  the card bleeding off both screen edges, but once it could actually be
  compared on a real phone (rather than just measured against "does it fit")
  it read as the camera having pulled back too far: distant and small rather
  than the section's hero content. This floor keeps softFitFactor's curve
  doing its job on wider, tablet-ish viewports while guaranteeing the card
  never drops below a size that still reads as the main subject on the
  narrowest phones — a deliberate middle ground between the original
  edge-bleeding 100% and the too-small 36%.
*/
const MIN_CARD_FIT = 0.62;

/*
  ── Mobile-only trajectory tuning ────────────────────────────────────────

  Everything below reads `mobileness` — 0 at and above the 16:9 design
  width, ramping toward 1 as the viewport narrows toward NARROW_FLOOR. A
  real phone (iPhone 14 portrait measures 1.91, see lib/responsive3d.ts)
  lands close to but short of 1 rather than pinned at it, and every desktop
  and tablet-ish width above the design width is exactly 0 — no breakpoint,
  no listener, corrects itself on resize/rotation like every other
  responsive read in this file.

  NARROW_FLOOR sits below any real phone on purpose: pinning `mobileness` at
  1 for the *narrowest plausible* device, rather than for the widest one,
  is what keeps a mid-size phone from already being maxed out.
*/
const NARROW_FLOOR = 1.1;

/** Vertical wave amplitude at the two ends of `mobileness`. The full 0.34 is
 *  what keeps the ring reading as 3D rather than a flat disc (see the slot
 *  comment below); on a phone that same swing was carrying the side cards
 *  up into the header on every rotation, so it is nearly flattened there —
 *  "very suave" rather than zero, so the ring does not go fully 2D. */
const WAVE_AMPLITUDE_DESKTOP = 0.34;
const WAVE_AMPLITUDE_MOBILE = 0.05;

/** How far the whole ring pulls back in Z (toward the prism, away from the
 *  camera) at full mobileness. Desktop's framing was tuned by eye against
 *  the prism already sharing the frame; a phone's tighter crop reads better
 *  with the ring sitting deeper into the same space instead of hanging out
 *  in front of it. */
const Z_PULLBACK_MOBILE = 0.42;

/** Ceiling on the extra scale multiplied on top of `fit` at full
 *  mobileness — a small compensation for Z_PULLBACK_MOBILE moving the ring
 *  further away (which would otherwise shrink it further), not a second
 *  independent size increase. Capped under 1.08 deliberately: enough to
 *  keep the card feeling present, not enough to fight MIN_CARD_FIT's own
 *  "should not look gigantic" reasoning. */
const MOBILE_SCALE_BOOST = 1.07;

/** Ceiling on the upward lift at full mobileness — see the slot comment for
 *  why this exists. Lower than an earlier pass (0.7): with the wave above
 *  now nearly flat, less lift is needed to clear the caption, and the old
 *  value was overshooting into the header on the narrowest phones. */
const LIFT_MOBILE = 0.42;

// Allocated once. Building Vector3s inside useFrame would mean hundreds of
// short-lived objects per second and periodic GC hitches.
const slot = new Vector3();

interface OrbitCardsProps {
  projects: Project[];
  reducedMotion?: boolean;
}

/**
 * Project cards as 3D panels that fly in and orbit the prism.
 *
 * Scroll does two things at once: it spins the prism (see Prism.jsx) and it
 * drags these cards in from off-screen left, one after another, onto a ring
 * that keeps turning around the model.
 *
 * All of it runs in ONE useFrame that walks the card array. Per-card useFrame
 * callbacks would mean N closures and N reads of the same scroll value every
 * frame; the single loop keeps cost proportional to card count with no
 * per-card overhead.
 */
export default function OrbitCards({ projects, reducedMotion = false }: OrbitCardsProps) {
  const groups = useRef<(Group | null)[]>([]);
  const materials = useRef<(ShaderMaterial | null)[]>([]);
  const scrubbed = useRef(0);
  const { camera, gl } = useThree();
  /** Index currently under the pointer, so the cursor swap only fires on a
   *  genuine enter/leave rather than every frame. */
  const hovered = useRef<number | null>(null);

  const setHover = (i: number | null) => {
    if (hovered.current === i) return;
    hovered.current = i;
    gl.domElement.style.cursor = i === null ? 'auto' : 'pointer';
  };

  const uniformSets = useMemo(
    () => projects.map((project) => makeOrbitCardUniforms(project.tint)),
    [projects],
  );

  /*
    ── Media loading ─────────────────────────────────────────────────────────

    Imperative rather than through drei's suspending useTexture/useVideoTexture
    hooks, for the same reason ArchivePlane splits its video path out: a
    suspending hook here would put every card behind the slowest single file,
    and these are multi-megabyte clips off a phone. Loading into the uniform
    instead lets the whole ring render immediately on its generated panels and
    swap each card over the moment its own file arrives — `uHasMap` is what
    makes that switch, so a card is never blank and never stretched.

    Videos are only decoded while the works section is anywhere near the
    viewport; see the play/pause in useFrame below. An <video> left playing is
    a decoder running for the whole page.
  */
  const videos = useRef<HTMLVideoElement[]>([]);
  /*
    Loaded media parks HERE, not straight into the uniform objects.

    `uniformSets` is what gets handed to <shaderMaterial uniforms={...}>, but
    the object the material ends up holding is not guaranteed to be that same
    reference, and the rest of this file already reads through
    `material.uniforms` from the ref rather than through uniformSets — so
    writing a texture into uniformSets could land on an object nothing renders
    from. Staging it here and letting the frame loop copy it across uses the
    one handle that is definitely the live material, and also sidesteps the
    ordering problem that the material ref may not exist yet when an async
    load resolves.
  */
  const media = useRef<({ texture: Texture; aspect: number } | null)[]>([]);

  useEffect(() => {
    const disposables: Texture[] = [];
    let cancelled = false;
    const loader = new TextureLoader();
    videos.current = [];
    media.current = [];

    projects.forEach((project, i) => {
      const apply = (texture: Texture, aspect: number) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        // Linear rather than mipmapped: these are viewed at roughly one
        // texel per pixel on the front card and only shrink toward the back
        // of the ring, so mipmaps cost memory and generation time for a
        // sharpness gain nobody sees.
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = false;
        media.current[i] = { texture, aspect };
        disposables.push(texture);
      };

      if (project.image) {
        loader.load(asset(project.image), (texture) => {
          const { width, height } = texture.image as { width: number; height: number };
          apply(texture, width / Math.max(height, 1));
        });
        return;
      }

      if (project.video) {
        const el = document.createElement('video');
        Object.assign(el, {
          src: asset(project.video),
          muted: true,
          loop: true,
          playsInline: true,
          crossOrigin: 'anonymous',
          preload: 'metadata',
        });
        el.addEventListener(
          'loadedmetadata',
          () => apply(new VideoTexture(el), el.videoWidth / Math.max(el.videoHeight, 1)),
          { once: true },
        );
        videos.current[i] = el;
      }
    });

    return () => {
      cancelled = true;
      media.current = [];
      disposables.forEach((texture) => texture.dispose());
      videos.current.forEach((el) => {
        el?.pause();
        el?.removeAttribute('src');
        el?.load();
      });
      videos.current = [];
    };
  }, [projects, uniformSets]);

  useLayoutEffect(() => {
    setWorksCount(projects.length);
  }, [projects.length]);

  // Reset the cursor on unmount so a hover left mid-page doesn't strand it as
  // 'pointer' once the ring is gone.
  useEffect(() => () => setHover(null), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const count = projects.length;

    /*
      ── Responsive fit ────────────────────────────────────────────────────

      CARD_W/CARD_H and ORBIT_RADIUS are authored against the 16:9 desktop
      frame (see the block comment above). Nothing here previously read
      state.viewport, so on a portrait phone — where the visible WIDTH at
      this depth is a fraction of desktop's while the visible HEIGHT stays
      fixed (fov and camera distance are both device-independent, per
      lib/responsive3d.ts) — the front card kept its full authored size and
      ended up wider than the screen: it bled off both edges and read as an
      aggressive, deformed zoom instead of a card.

      softFitFactor is the same fix Prism.jsx already applies to the model at
      the centre of this same ring, for the identical reason (there: 124% of
      an iPhone's width down to ~44%). Reusing it here — rather than moving
      the camera — keeps CameraRig the single writer of camera.position, which
      the archive dive and the works/prism spin both depend on staying exact.
      It returns 1 at and above the 16:9 design width, so desktop is
      untouched, and it re-evaluates every frame off `state.viewport`, so an
      orientation change corrects it with no listener and no breakpoint.
      MIN_CARD_FIT then floors the result — see that constant's own comment
      for why the bare curve alone ended up reading as "too far away".
    */
    const rawFit = MathUtils.clamp(softFitFactor(state.viewport.width), MIN_CARD_FIT, 1);

    /*
      `mobileness` — the one signal every mobile-only adjustment below reads.
      See its own comment by NARROW_FLOOR for the curve; this is the single
      read of state.viewport for all of them, rather than each effect
      deriving its own slightly different ramp.
    */
    const mobileness = MathUtils.clamp(
      1 - (state.viewport.width - NARROW_FLOOR) / (DESIGN_VIEWPORT_WIDTH - NARROW_FLOOR),
      0,
      1,
    );

    // See MOBILE_SCALE_BOOST — compensates Z_PULLBACK_MOBILE below, not a
    // second independent size change.
    const fit = rawFit * MathUtils.lerp(1, MOBILE_SCALE_BOOST, mobileness);

    /*
      Vertical lift on a narrow (portrait/mobile) viewport.

      HERO_FOV is fixed and the vertical framing it produces is therefore
      identical on every device — only the on-screen caption competes for
      space differently. ProjectsOrbit's caption panel sits pinned to the
      bottom of a short mobile viewport and was overlapping the front card;
      lifting the ring keeps the active card clear of it. Tuned together with
      the flattened wave below — see LIFT_MOBILE's own comment — rather than
      independently, since the two used to compound into cards clipping the
      header on the narrowest phones.
    */
    const mobileLift = mobileness * LIFT_MOBILE;

    // Whole ring pulled back toward the prism at full mobileness; the front
    // card ends up a little further from the camera, which MOBILE_SCALE_BOOST
    // above compensates on size.
    const zPullback = mobileness * Z_PULLBACK_MOBILE;

    // See WAVE_AMPLITUDE_MOBILE — the vertical bob below is what was
    // carrying side cards into the header on a phone.
    const waveAmplitude = MathUtils.lerp(WAVE_AMPLITUDE_DESKTOP, WAVE_AMPLITUDE_MOBILE, mobileness);

    /*
      Damped follow of the raw scroll value.

      This is the `scrub: 1` feel, applied where it can actually work. GSAP's
      `scrub` only smooths a tween's playhead, and this ScrollTrigger drives a
      value via onUpdate rather than tweening anything — setting `scrub` on it
      is a no-op. Easing the consumed value here gives the same weighted lag,
      and 1 - lambda^dt makes it frame-rate independent so 144Hz and 60Hz
      settle at the same speed.
    */
    scrubbed.current = reducedMotion
      ? worksScroll.progress
      : scrubbed.current +
        (worksScroll.progress - scrubbed.current) * (1 - Math.pow(SCRUB_LAMBDA, dt));

    const progress = scrubbed.current;

    /*
      Keep the DOM caption locked to the same value that is about to place
      the ring below — not to the raw scroll progress a fast flick can be
      several cards ahead of. See syncWorksActiveIndex's own comment; this is
      the one call site that matters, since it runs every frame the ring
      itself moves.
    */
    syncWorksActiveIndex(progress);

    /*
      Ring rotation.

      Two fixes over the previous version, both of which the measured capture
      exposed:

      1. Direction is NEGATIVE. Adding the rotation brought cards to the front
         in reverse index order (5,4,3,2,1) while the caption counted upward,
         so the panel never described the card you were looking at.
      2. The sweep is exactly (count-1)/count turns across the orbit phase,
         not a hand-picked 0.85. Card i now faces the camera at precisely
         orbitPhase == i/(count-1): card 0 as the ring starts turning, the
         last card exactly at the end of the pin, evenly spaced in between.
         worksScroll.setWorksProgress inverts this same expression for the
         caption, so the two cannot drift apart again.
    */
    const phase = orbitPhase(progress, count);
    const rotation = count > 1 ? (phase * (count - 1) * Math.PI * 2) / count : 0;
    const assembly = assemblyFraction(count);

    /*
      Clear the ring out as the archive dive starts.

      The camera flies from z=6 to z=0.55, straight through where this ring
      sits — without this the orbit cards stayed on screen and collided with
      the archive corridor, which read as leftover debris rather than a
      transition. Fully gone by the time the dive is a third done.
    */
    const exit = Math.min(1, archiveScroll.progress / 0.12);

    for (let i = 0; i < count; i += 1) {
      const group = groups.current[i];
      const material = materials.current[i];
      if (!group) continue;

      /*
        Staggered arrival.

        Each card gets its own slice of the assembly phase, overlapping its
        neighbours, so they stream in as a sequence instead of appearing as one
        block. The slices deliberately overlap (the /count window is wider than
        the i/count spacing) — a strict queue looks mechanical.
      */
      const start = (i / count) * assembly;
      // Window sized so the LAST card still finishes flying in by the time the
      // assembly phase ends. Deriving it from `assembly` (rather than adding a
      // fixed 0.18) keeps that true at any card count.
      const window = assembly / count + assembly * 0.55;
      const arrival = MathUtils.clamp((progress - start) / window, 0, 1);
      // smootherstep: zero velocity AND zero acceleration at both ends, so the
      // card neither jerks off the entry point nor punches into its slot.
      const eased = arrival * arrival * arrival * (arrival * (arrival * 6 - 15) + 10);

      // Orbital slot. Negative rotation so cards front in index order.
      const angle = (i / count) * Math.PI * 2 - rotation;

      slot.set(
        Math.sin(angle) * ORBIT_RADIUS,
        // Gentle vertical wave: a perfectly flat ring reads as a 2D circle.
        // waveAmplitude is what keeps this from swinging cards into the
        // header on a phone — see its own comment.
        Math.sin(angle * 2 + i) * waveAmplitude + mobileLift,
        Math.cos(angle) * ORBIT_RADIUS - zPullback,
      );

      if (reducedMotion) {
        // No flight, no spin — cards sit in their slots, fully present.
        group.position.copy(slot);
        group.scale.setScalar(fit);
      } else {
        group.position.lerpVectors(ENTRY, slot, eased);
        // `fit` multiplies the arrival scale rather than replacing it: the
        // 0.55→1 settle-in pop still happens, just scaled to the card's
        // authored-vs-device size the same way the eventual resting size is.
        group.scale.setScalar(MathUtils.lerp(0.55, 1, eased) * fit);
      }

      /*
        Billboard to the camera.

        Facing outward from the ring centre would be more "physical", but the
        cards on the far side would then present their backs and the project
        artwork would be unreadable for half the orbit. Copying the camera's
        quaternion keeps every card legible; depth still does the work of
        showing which ones are behind the prism.
      */
      group.quaternion.copy(camera.quaternion);

      if (material) {
        const u = material.uniforms;

        /*
          Hand the staged media over the first time this card is drawn after
          its file resolved. Guarded on uHasMap so it is one assignment per
          card for the life of the page, not an assignment every frame.
        */
        const loaded = media.current[i];
        if (loaded && u.uHasMap.value === 0) {
          u.uMap.value = loaded.texture;
          u.uMapAspect.value = loaded.aspect;
          u.uHasMap.value = 1;
        }

        // uArrival doubles as the fade-out channel on the way out.
        u.uArrival.value = (reducedMotion ? 1 : eased) * (1 - exit);
        // cos(angle) is +1 at the front of the ring and -1 at the back, which
        // is exactly the "how much is this card facing me" term the shader
        // wants for dimming and grid softness.
        u.uFacing.value = MathUtils.clamp((Math.cos(angle) + 1) * 0.5 + 0.18, 0, 1);
        if (!reducedMotion) u.uTime.value += dt;
      }

      // Cards that have not started arriving cost nothing: no draw call, no
      // shader invocation. Same for cards the archive dive has dismissed.
      group.visible = (reducedMotion || arrival > 0.001) && exit < 0.999;

      /*
        Decode only while the card is actually on the ring.

        A <video> that is playing runs a decoder and uploads a frame to the
        GPU on every tick whether or not anything samples it, so leaving all
        of them running would cost the whole page — the same trap the prism's
        transmission buffer was falling into. Tying playback to the
        visibility just computed means at most the cards in play are decoding,
        and scrolling past the section stops them.
      */
      const video = videos.current[i];
      if (video) {
        if (group.visible && !reducedMotion) {
          // play() rejects if the element is not ready yet; there is nothing
          // to do about that and an unhandled rejection would spam the console.
          if (video.paused) void video.play().catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      }
    }
  });

  return (
    <group>
      {projects.map((project, i) => (
        <group
          key={project.id}
          ref={(node) => {
            groups.current[i] = node;
          }}
          visible={false}
        >
          <mesh
            /*
              Opens this project's detail view.

              three's own raycaster does not consult `.visible` (verified in
              its Object3D traversal — only the renderer and the shadow map
              skip invisible objects), so a card that has not yet flown in, or
              one the archive dive has already dismissed, would otherwise
              still catch clicks at its parked position. Reading the parent
              group's `visible` — the same flag the useFrame loop above sets
              every frame — is what keeps interaction in sync with what is
              actually on screen.
            */
            onClick={(event: ThreeEvent<MouseEvent>) => {
              if (groups.current[i]?.visible === false) return;
              event.stopPropagation();
              openProjectDetail(project.id);
            }}
            onPointerOver={(event: ThreeEvent<PointerEvent>) => {
              if (groups.current[i]?.visible === false) return;
              event.stopPropagation();
              setHover(i);
            }}
            onPointerOut={() => {
              if (hovered.current === i) setHover(null);
            }}
          >
            {/* Segmented: the arrival bow is a vertex displacement, so a 1x1
                quad would have no interior vertices to bend. */}
            <planeGeometry args={[CARD_W, CARD_H, 16, 20]} />
            <shaderMaterial
              ref={(node) => {
                materials.current[i] = node;
              }}
              uniforms={uniformSets[i]}
              vertexShader={orbitCardVertex}
              fragmentShader={orbitCardFragment}
              transparent
              // Depth writing off so the ring's own cards blend cleanly through
              // each other; three sorts transparent objects back-to-front, and
              // the cards are far enough apart for that to be correct.
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
