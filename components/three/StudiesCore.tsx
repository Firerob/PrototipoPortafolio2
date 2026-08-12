'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Color,
  IcosahedronGeometry,
  MathUtils,
  MeshBasicMaterial,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Mesh,
  type Texture,
} from 'three';
import {
  sceneScroll,
  smoothing,
  smootherstep,
  stageWeight,
  STAGE_NEWS,
} from '@/lib/sceneScroll';
import { studiesFocus } from '@/lib/studiesScroll';
import { studies } from '@/content/studies';
import { asset } from '@/lib/asset';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePointerVector } from './PointerProvider';
import {
  makeStudiesCoreUniforms,
  studiesCoreFragment,
  studiesCoreVertex,
} from './studiesCoreShader';

/*
  ── Studies' set piece: the research core ────────────────────────────────────

  Every other post-hero stage got a bespoke object (AboutStrata's core sample,
  ContactTransmitter's broadcast), and Studies — stage STAGE_NEWS — never did;
  DeepField only shifted its own blueprint mood for it. This fills that gap:
  a nested object at the centre of the stage, a plain wireframe shell around a
  custom-shaded glass core, selected by hovering or focusing a row in the
  manifest beside it (see components/studies/StudyManifest.tsx, which writes
  `studiesFocus` from lib/studiesScroll.ts) and read here every frame.

  Shell and core are deliberately different materials, not two instances of
  one. The shell is structure — a plain MeshBasicMaterial, undistorted, the
  same "boring machinery" ContactTransmitter argues for anything that is not
  the subject. The core IS the subject: it is what a "selected study" actually
  looks like, so it carries the shader — vertex displacement from the study's
  `distortion`, scanline density from its `facet`, and its artwork (once any
  exists — see content/studies.ts) cross-fading across the surface.
*/

const OUTER_RADIUS = 1.0;
const INNER_RADIUS = 0.62;
/** Seconds for the texture cross-fade to settle after a new study is selected. */
const CROSSFADE_DURATION = 0.7;

/*
  ── Roam + wave, the two forces behind the core's position ──────────────────

  ROAM is a loose leash: the target position tracks a fraction of wherever
  the pointer sits on screen, in world units, so moving the mouse ANYWHERE
  visibly carries the core with it rather than nudging it in place.

  WAVE is the dodge. Each frame the core's own on-screen position from the
  previous frame is projected through the current camera and compared to the
  pointer's — the closer they are, the harder the core is shoved further
  along that same line, away from the cursor. Passing over it reads as
  pushing a floating object aside with a ripple, not as dragging it onto the
  cursor tip. Both forces land in ONE lerp target (see the note inline) so
  there is a single spring to tune and they can never fight over the frame.
*/
const ROAM_RANGE_X = 2.0;
const ROAM_RANGE_Y = 1.3;
/** Proximity radius in NDC (-1..1 screen space) — generous, since the goal
 *  is "passes near it", not a pixel-precise hit test on a moving target. */
const WAVE_RADIUS = 0.5;
/** Max additional push, in the same world-unit scale as ROAM_RANGE. */
const WAVE_PUSH = 0.9;
/** Hard ceiling on total travel from the resting position, in world units —
 *  the roam and wave forces are tuned to stay well inside this, but a clamp
 *  is what actually GUARANTEES the core never drifts off-frame. */
const MAX_RANGE_X = 3.2;
const MAX_RANGE_Y = 2.1;
/** Base resting position — see the placement note on the returned <group>. */
const BASE = new Vector3(-1.0, -1.3, -3.3);
/*
  Rest X on phones and other touch-primary devices — see useIsMobile.

  BASE.x was placed against a desktop-width frame. Working through the actual
  camera pose (POSES[1] in lib/sceneScroll.ts: px 1.6, py -1.9, pz 4.2,
  target -0.3/-0.6/-4.5, fov 46) at a ~390-412px-wide portrait aspect
  (≈0.46), BASE projects to NDC.x ≈ -0.61, and OUTER_RADIUS (1.0 world unit)
  spans roughly ±0.65 NDC at that depth — so the shell's left edge lands
  around NDC -1.25, past the -1 frustum edge, before the object even moves.
  A narrower offset keeps the whole shell on-frame at rest on a phone; see
  the isMobile branch in useFrame for why it never roams from here either.
*/
const MOBILE_REST_X = -0.4;

export default function StudiesCore({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const group = useRef<Group>(null);
  const shell = useRef<Mesh>(null);

  const pointer = usePointerVector();
  const { camera } = useThree();
  const isMobile = useIsMobile();
  const restX = isMobile ? MOBILE_REST_X : BASE.x;

  const uniforms = useMemo(() => makeStudiesCoreUniforms(), []);

  const shellGeometry = useMemo(() => new IcosahedronGeometry(OUTER_RADIUS, 1), []);
  const shellMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#aeb6c6',
        wireframe: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  // Detail 2, not 1: this mesh carries the vertex displacement and the
  // equirectangular texture wrap, both of which need enough vertices and
  // enough small triangles near the poles to read as a curved surface rather
  // than a faceted gem. 320 triangles is still trivial next to the prism.
  const coreGeometry = useMemo(() => new IcosahedronGeometry(INNER_RADIUS, 2), []);
  const coreMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms,
        vertexShader: studiesCoreVertex,
        fragmentShader: studiesCoreFragment,
        transparent: true,
        depthWrite: false,
      }),
    [uniforms],
  );

  useEffect(
    () => () => {
      shellGeometry.dispose();
      shellMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
    },
    [shellGeometry, shellMaterial, coreGeometry, coreMaterial],
  );

  /*
    Texture cache, keyed by study id, loaded LAZILY on selection rather than
    upfront the way OrbitCards loads every project's media on mount.

    OrbitCards front-loads because every card in the ring will be visible
    sooner or later as the user scrolls it. Here at most one study is ever on
    the core at a time, chosen by hovering a manifest row — front-loading
    every study's artwork the moment Studies scrolls into view would fetch
    files nobody may ever select. Once a study IS selected its texture is
    kept for the section's lifetime, so flicking back and forth across the
    manifest never re-fetches.
  */
  const textures = useRef(new Map<string, Texture>());
  const loading = useRef(new Set<string>());
  const loader = useMemo(() => new TextureLoader(), []);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
      textures.current.forEach((texture) => texture.dispose());
      textures.current.clear();
    };
  }, []);

  const lastId = useRef<string | null>(null);
  const crossfadeStart = useRef(0);
  const restId = studies[0]?.id ?? null;

  /*
    The eased distortion target, held OUTSIDE the uniform.

    uniforms.uDistortion.value is set every frame to this plus the wave's
    proximity bump — never accumulated into directly. Easing straight into
    the uniform and then adding the bump on top of THAT would feed each
    frame's bump back into the next frame's starting point for the ease,
    which never fully decays: the value ratchets upward for as long as the
    cursor stays close instead of settling at a bounded "study value + ripple".
  */
  const baseDistortion = useRef(0.3);

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    /*
      Scoped to the Studies stage, gated before any work — same contract as
      AboutStrata and ContactTransmitter. Fully dark through Index, About and
      Contact; only the crossings into and out of Studies ever blend it.
    */
    const weight = stageWeight(sceneScroll.stage, STAGE_NEWS) * sceneScroll.presence;
    node.visible = weight > 0.004;
    if (!node.visible) return;

    const dt = Math.min(delta, 1 / 30);
    const time = state.clock.elapsedTime;
    const t = smoothing(0.03, dt);

    const targetId = studiesFocus.id ?? restId;
    const targetStudy = studies.find((s) => s.id === targetId) ?? studies[0] ?? null;

    // ── Selection changed: swap the texture and restart the crossfade ─────
    if (targetId !== lastId.current) {
      lastId.current = targetId;
      crossfadeStart.current = time;

      const promote = (texture: Texture | null, hasMap: number) => {
        uniforms.uMapPrev.value = uniforms.uMap.value;
        uniforms.uHasMapPrev.value = uniforms.uHasMap.value;
        uniforms.uMap.value = texture;
        uniforms.uHasMap.value = hasMap;
      };

      const nextSrc = targetStudy?.image;
      if (!nextSrc) {
        // No artwork for this study: fall back to tint + fresnel + scan
        // rather than leaving the previous study's artwork stuck on screen.
        promote(null, 0);
      } else {
        const cached = textures.current.get(nextSrc);
        if (cached) {
          promote(cached, 1);
        } else if (!loading.current.has(nextSrc)) {
          loading.current.add(nextSrc);
          loader.load(asset(nextSrc), (texture) => {
            loading.current.delete(nextSrc);
            if (cancelled.current) {
              texture.dispose();
              return;
            }
            texture.colorSpace = SRGBColorSpace;
            textures.current.set(nextSrc, texture);
            // Only swap it in if this is still the selected study by the
            // time the file arrives — a fast hover-past must not make a
            // slow file pop in on top of whatever was selected next.
            if (lastId.current === targetId) {
              promote(texture, 1);
              crossfadeStart.current = state.clock.elapsedTime;
            }
          });
        }
      }
    }

    // ── Cross-fade progress ────────────────────────────────────────────────
    const fadeElapsed = time - crossfadeStart.current;
    uniforms.uCrossfade.value = reducedMotion ? 1 : smootherstep(fadeElapsed / CROSSFADE_DURATION);
    if (uniforms.uCrossfade.value >= 0.999 && uniforms.uHasMapPrev.value > 0.5) {
      // Done blending: drop the old sampler binding so the shader is not
      // carrying a texture nothing reads any more.
      uniforms.uHasMapPrev.value = 0;
      uniforms.uMapPrev.value = null;
    }

    // ── Params, eased toward the selection rather than cut to it ──────────
    const params = targetStudy?.params ?? { distortion: 0.3, speed: 1, facet: 6 };
    baseDistortion.current = MathUtils.lerp(baseDistortion.current, params.distortion, t);
    uniforms.uFacet.value = MathUtils.lerp(uniforms.uFacet.value, params.facet, t);
    if (!reducedMotion) uniforms.uTime.value = time;
    uniforms.uWeight.value = MathUtils.lerp(uniforms.uWeight.value, weight, t);

    const [tintA, tintB] = targetStudy?.tint ?? ['#4be1ff', '#241350'];
    uniforms.uTintA.value.lerp(scratch.a.set(tintA), t);
    uniforms.uTintB.value.lerp(scratch.b.set(tintB), t);

    // ── Motion: roam with the pointer, dodge when it gets close ───────────
    const speed = params.speed;
    let proximity = 0;

    if (!reducedMotion) {
      // Continuous autorotation — unbounded by design, this is a spin, not a
      // target to converge on. Ambient, so it plays on mobile too.
      node.rotation.y += dt * 0.14 * speed;
      // Idle wobble: a pure function of elapsed time, re-set every frame
      // rather than accumulated, so it settles into the same small arc
      // instead of drifting.
      node.rotation.z = Math.sin(time * 0.2 * speed) * 0.08;

      if (!isMobile) {
        // INTERACTIVE studies get a visibly more responsive object — the one
        // category whose entire subject is direct manipulation, the
        // cheapest way for the piece to say what it is about without text.
        const boost = targetStudy?.category === 'INTERACTIVE' ? 1.6 : 1;

        /*
          Where is the core on screen RIGHT NOW, before it moves this frame?
          Reading last frame's position (rather than this frame's target) is
          what makes the wave a genuine reaction to the cursor's approach —
          computing it from the target would have the core dodge a position
          it was never actually rendered at.
        */
        screenPos.copy(node.position).project(camera);
        const dx = screenPos.x - pointer.x;
        const dy = screenPos.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        proximity = 1 - MathUtils.clamp(dist / WAVE_RADIUS, 0, 1);
        const push = proximity * proximity * WAVE_PUSH * boost;
        // Guards the (dx, dy) / dist normalisation for the dist === 0 case,
        // which is reachable — the cursor sitting exactly over the core's
        // projected centre is the whole scenario this effect exists for.
        const safeDist = Math.max(dist, 0.0001);

        const targetX = MathUtils.clamp(
          BASE.x + pointer.x * ROAM_RANGE_X * boost + (dx / safeDist) * push * ROAM_RANGE_X,
          BASE.x - MAX_RANGE_X,
          BASE.x + MAX_RANGE_X,
        );
        const targetY = MathUtils.clamp(
          BASE.y + pointer.y * ROAM_RANGE_Y * boost + (dy / safeDist) * push * ROAM_RANGE_Y,
          BASE.y - MAX_RANGE_Y,
          BASE.y + MAX_RANGE_Y,
        );

        // A slower, heavier spring than the UI hover states elsewhere on
        // this page — the core should read as carried by the wave, not
        // snapping to the cursor like a button's hover state would.
        const roamT = smoothing(0.012, dt);
        node.position.x = MathUtils.lerp(node.position.x, targetX, roamT);
        node.position.y = MathUtils.lerp(node.position.y, targetY, roamT);

        node.rotation.x = MathUtils.lerp(node.rotation.x, pointer.y * 0.16 * boost, t);
        // A slight roll away from the cursor on the dodge itself, so the
        // kick reads as the object tipping away rather than only translating.
        node.rotation.z += (dx / safeDist) * proximity * 0.02;
      } else {
        /*
          No hover-capable pointer on mobile: PointerProvider deliberately
          never updates `pointer` from touch (a finger dragging IS the
          scroll gesture, not "look over there" — see its own note), so
          `pointer` sits frozen whatever it last was, typically (0, 0).
          Chasing that as a roam target would either sit the core dead
          centre or, worse, drift there the moment a stray mouse event fired
          on a hybrid device. Easing back to the mobile-safe rest spot is
          the honest behaviour: no pointer, no reaction to one.
        */
        node.rotation.x = MathUtils.lerp(node.rotation.x, 0, t);
        node.position.x = MathUtils.lerp(node.position.x, restX, t);
        node.position.y = MathUtils.lerp(node.position.y, BASE.y, t);
      }
    } else {
      node.rotation.x = 0;
      node.rotation.z = 0;
      node.position.x = restX;
      node.position.y = BASE.y;
    }

    /*
      The one place "the mouse is a wave" is literal rather than a metaphor
      for the position kick above: a ripple through the crystal's own
      surface at the instant the cursor is actually over it. Composed here,
      not accumulated — see the note on baseDistortion above.
    */
    uniforms.uDistortion.value = baseDistortion.current + proximity * 0.35;

    // ── Shell: structure, not subject ──────────────────────────────────────
    const shellNode = shell.current;
    if (shellNode) {
      if (!reducedMotion) {
        shellNode.rotation.y -= dt * 0.08 * speed;
        shellNode.rotation.z += dt * 0.05 * speed;
      }
      const breathe = reducedMotion
        ? 1
        : 1 + Math.sin(time * 0.6 * speed) * (0.04 + params.distortion * 0.08);
      shellNode.scale.setScalar(breathe);

      shellMaterial.color.lerp(scratch.shell.set(tintA).lerp(scratch.steel, 0.5), t);
      shellMaterial.opacity = MathUtils.lerp(shellMaterial.opacity, 0.22 * weight, t);
    }
  });

  return (
    /*
      BASE sits screen-left of the News/Studies pose's natural frame centre
      (see the camera note on POSES[1] in lib/sceneScroll.ts), so at rest the
      core sits behind the shorter manifest column rather than under the
      denser telemetry text in the right column. It roams from there — see
      the roam/wave block in useFrame above — rather than staying pinned.
    */
    <group ref={group} position={[restX, BASE.y, BASE.z]} visible={false}>
      <mesh ref={shell} geometry={shellGeometry} material={shellMaterial} />
      <mesh geometry={coreGeometry} material={coreMaterial} />
    </group>
  );
}

// Allocated once at module scope — this component only ever mounts a single
// instance, and a Color or Vector3 per frame would be a handful of
// short-lived objects sixty times a second for no visible benefit.
const scratch = {
  a: new Color(),
  b: new Color(),
  shell: new Color(),
  steel: new Color('#aeb6c6'),
};
/** Scratch for projecting the core's world position to NDC screen space —
 *  see the wave dodge in useFrame. */
const screenPos = new Vector3();
