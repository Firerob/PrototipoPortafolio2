'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  MathUtils,
  Matrix4,
  Object3D,
  Quaternion,
  Vector3,
  type Group,
  type InstancedMesh,
  type LineSegments,
  type LineBasicMaterial,
  type MeshBasicMaterial,
} from 'three';
import {
  sceneScroll,
  smoothing,
  stageWeight,
  STAGE_ABOUT,
  STAGE_CONTACT,
  STAGE_NEWS,
} from '@/lib/sceneScroll';

/*
  600 motes, one draw call.

  The threejs stack guidance is explicit: InstancedMesh for 50+ identical
  objects, because N meshes is N draw calls per frame. 600 separate <mesh>
  elements would be 600 draw calls on top of everything the hero already
  renders — the single most expensive way to build this.
*/
const MOTE_COUNT = 600;
/** Half-extent of the volume the motes occupy, in world units. */
const FIELD = 9;

/** Wireframe lattice: rungs down the corridor, drawn as one LineSegments. */
const RUNGS = 16;
const RUNG_SPACING = 1.5;
const RUNG_W = 5.2;
const RUNG_H = 3.0;

const BLUEPRINT = new Color('#4be1ff');
const DEEP = new Color('#6d4bff');

interface Mote {
  base: Vector3;
  /** Radians per second, and a phase, so no two motes breathe together. */
  speed: number;
  phase: number;
  drift: number;
  scale: number;
}

/**
 * The post-hero environment.
 *
 * Deliberately QUIET. The prism and the archive corridor are subjects — they
 * are what the hero is about. This is atmosphere: a fogged field of drifting
 * motes and a faint lattice, sitting behind body copy that has to stay
 * readable at 4.5:1. A second hero competing with the text underneath it is
 * how an immersive background turns into an unusable page.
 *
 * Everything animates through refs inside useFrame. Nothing here calls
 * setState, so scrolling the whole post-hero run costs zero React renders.
 */
export default function DeepField({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const group = useRef<Group>(null);
  const motes = useRef<InstancedMesh>(null);
  const lattice = useRef<LineSegments>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const scratch = useMemo(
    () => ({ matrix: new Matrix4(), pos: new Vector3(), quat: new Quaternion(), scl: new Vector3(), color: new Color() }),
    [],
  );

  /*
    Positions are generated once from a seeded PRNG, not Math.random().

    Two reasons. A remount would otherwise reshuffle the entire field, which
    reads as a glitch rather than as the same room; and a fixed seed means the
    composition can actually be art-directed — this particular arrangement was
    chosen, not accepted.
  */
  const field = useMemo<Mote[]>(() => {
    let seed = 0x9e3779b9;
    const rand = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return ((seed >>> 0) % 100000) / 100000;
    };

    return Array.from({ length: MOTE_COUNT }, () => {
      // Biased toward the edges of the frame: the middle of the screen is
      // where the text goes, and a mote directly behind a paragraph is noise.
      const edge = rand() < 0.72 ? 1 : 0.35;
      return {
        base: new Vector3(
          (rand() * 2 - 1) * FIELD * edge,
          (rand() * 2 - 1) * FIELD * 0.55,
          -rand() * FIELD * 2.2,
        ),
        speed: 0.15 + rand() * 0.5,
        phase: rand() * Math.PI * 2,
        drift: 0.2 + rand() * 0.75,
        scale: 0.012 + rand() * 0.03,
      };
    });
  }, []);

  const latticeGeometry = useMemo(() => {
    const points: number[] = [];
    for (let i = 0; i < RUNGS; i++) {
      const z = -i * RUNG_SPACING;
      const w = RUNG_W * (1 + i * 0.06);
      const h = RUNG_H * (1 + i * 0.06);
      // One rectangle per rung, as four segments.
      const corners: [number, number][] = [
        [-w, -h],
        [w, -h],
        [w, h],
        [-w, h],
      ];
      for (let c = 0; c < 4; c++) {
        const [x1, y1] = corners[c];
        const [x2, y2] = corners[(c + 1) % 4];
        points.push(x1, y1, z, x2, y2, z);
      }
      // Stringers joining this rung to the next, so it reads as a corridor
      // rather than as a stack of unrelated frames.
      if (i < RUNGS - 1) {
        const nw = RUNG_W * (1 + (i + 1) * 0.06);
        const nh = RUNG_H * (1 + (i + 1) * 0.06);
        const nz = z - RUNG_SPACING;
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ] as const) {
          points.push(sx * w, sy * h, z, sx * nw, sy * nh, nz);
        }
      }
    }
    return new Float32Array(points);
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const time = state.clock.elapsedTime;
    const { stage, presence } = sceneScroll;

    const node = group.current;
    if (!node) return;

    /*
      Presence gates VISIBILITY, not just opacity.

      An invisible-but-rendered field still costs its draw call and its
      per-instance matrix writes on every frame of the hero, which is the
      whole first screen of the page and the one that gets measured.
    */
    node.visible = presence > 0.004;
    if (!node.visible) return;

    // ── Motes ─────────────────────────────────────────────────────────────
    const mesh = motes.current;
    if (mesh) {
      /*
        Organic float, driven by elapsed time rather than by scroll.

        This is the part that stops the background feeling frozen when the
        viewer stops scrolling. A scene wired only to scroll position is dead
        the moment the wheel stops, and dead is exactly what reads as "this
        was generated".
      */
      for (let i = 0; i < MOTE_COUNT; i++) {
        const m = field[i];
        const t = reducedMotion ? 0 : time * m.speed + m.phase;
        dummy.position.set(
          m.base.x + Math.sin(t) * m.drift,
          m.base.y + Math.cos(t * 0.77) * m.drift * 0.8,
          m.base.z + Math.sin(t * 0.43) * m.drift * 0.5,
        );
        // Breathing scale, out of phase with the drift so they do not pulse
        // in unison like a loading indicator.
        const breathe = 1 + (reducedMotion ? 0 : Math.sin(t * 1.6) * 0.35);
        dummy.scale.setScalar(m.scale * breathe);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      const material = mesh.material as MeshBasicMaterial;
      // Contact opens the field out and lifts emission — the "transmitting"
      // read the brief asks for, done with brightness rather than more motes.
      const contact = stageWeight(stage, STAGE_CONTACT);
      const news = stageWeight(stage, STAGE_NEWS);
      scratch.color.copy(DEEP).lerp(BLUEPRINT, Math.min(1, news + contact * 0.6));
      material.color.copy(scratch.color);
      /*
        0.15 base, not 0.22, and the number came from a measurement rather than
        from taste.

        With the text hidden so only the background renders, the brightest
        pixel behind the index copy was a stack of overlapping additive motes
        at luminance 0.049 — 3.56:1 against --color-text-muted, under the 4.5
        floor. Everything else passed (median 6.6:1, p99 4.7:1), so the fix is
        to take the peak down rather than to thicken the scrim over the whole
        section and lose the field entirely.
      */
      material.opacity = MathUtils.lerp(
        material.opacity,
        (0.15 + contact * 0.34) * presence,
        smoothing(0.02, dt),
      );
    }

    // ── Lattice ───────────────────────────────────────────────────────────
    const lines = lattice.current;
    if (lines) {
      const news = stageWeight(stage, STAGE_NEWS);
      const about = stageWeight(stage, STAGE_ABOUT);
      const material = lines.material as LineBasicMaterial;

      /*
        The blueprint beat. Peaks at News and is nearly gone by About, where
        the camera is close and a wireframe grid across the profile card would
        be clutter rather than atmosphere.
      */
      const target = (news * 0.34 + about * 0.06) * presence;
      material.opacity = MathUtils.lerp(material.opacity, target, smoothing(0.03, dt));
      lines.visible = material.opacity > 0.004;

      if (lines.visible && !reducedMotion) {
        // Slow forward crawl, wrapped so the corridor never runs out. Modulo
        // on one spacing keeps it seamless: rung N lands exactly where N-1 was.
        lines.position.z = (time * 0.35) % RUNG_SPACING;
        // A pulse travelling the length of it, which is the "light pulse" beat.
        material.opacity *= 0.75 + 0.25 * Math.sin(time * 1.1);
      }
    }
  });

  return (
    <group ref={group} visible={false}>
      <instancedMesh
        ref={motes}
        args={[undefined, undefined, MOTE_COUNT]}
        frustumCulled={false}
      >
        {/* Two triangles per mote. At this size on screen a sphere would be
            the same handful of pixels for eighty times the vertex count. */}
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={DEEP}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      <lineSegments ref={lattice} position={[0, -1.2, -2]} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[latticeGeometry, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={BLUEPRINT}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}
