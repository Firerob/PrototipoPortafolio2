'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  MathUtils,
  MeshBasicMaterial,
  TorusGeometry,
  type Group,
  type Mesh,
} from 'three';
import {
  sceneScroll,
  smoothing,
  stageWeight,
  STAGE_ABOUT,
} from '@/lib/sceneScroll';

/*
  ── About's set piece: the core sample ───────────────────────────────────────

  AboutSection is "05 / Profile" — a person described in layers: bio, stack,
  stats, capabilities. So this is a core sample of one: a vertical column of
  stacked strata with a read head travelling up it, examining them.

  Deliberately a different language from ContactTransmitter in every axis, so
  the two set pieces never read as the same effect recoloured:

                  Contact                     About
    form          radial rings                vertical stacked strata
    motion        emitted outward, pulsing    scanned upward, twisting
    tempo         urgent, ~5s broadcast       slow, ~9s read
    palette       cyan signal                 violet/pink, warmer

  ── Why vertical, and why the strata are horizontal ─────────────────────────

  Measured against the authored About pose (lib/sceneScroll.ts POSES[2]): the
  camera sits at y -2.6 looking at y -2.2, which is only 5.9 degrees above
  horizontal. At that elevation a vertical structure presents its full
  silhouette while a horizontal one is nearly edge-on — the same geometry
  check that ruled a radar disc out of the Contact piece, pointing the
  opposite way here.

  Both facts get used. The COLUMN is vertical, so it reads at full height.
  The strata are horizontal rings, so they collapse into thin ellipses — a
  0.4-radius ring resolves to roughly 0.08 tall against 0.8 wide — which is
  exactly the flattened, stacked, cross-sectional look a core sample has. The
  near-edge-on angle is the effect here rather than a problem to design
  around.

  Note also this pose's fov of 30: telephoto, and the target only 3.9 units
  out, so the visible frame there is about 3.7 x 2.1 units. Everything below
  is authored small on purpose — the column stands about half the frame
  height. A piece sized like Contact's would not fit in shot at all.
*/

/** Strata in the stack. 15 is dense enough to read as layered material rather
 *  than as a handful of separate hoops, and is well under the 50-object
 *  threshold where DeepField's note says instancing starts to pay. */
const STRATA = 15;
const COLUMN_HEIGHT = 1.12;
const MAX_RADIUS = 0.42;
/** Total twist from bottom stratum to top. The arcs are open, so their gaps
 *  spiral — which is the only reason a stack of rotationally symmetric rings
 *  can show rotation at all. */
const TWIST = Math.PI * 1.45;
/** Central angle of each arc: ~207 degrees, leaving a ~153 degree gap. */
const ARC = Math.PI * 1.15;
/** Seconds for the read head to travel the column once. Slow on purpose —
 *  About is the contemplative beat, and it sits behind the densest body copy
 *  on the page. */
const SCAN_PERIOD = 9;

const STRATUM = new Color('#6d4bff');
const READ_HEAD = new Color('#ff5ea8');

/*
  Peak additive opacity.

  Lower than ContactTransmitter's, and for a reason specific to this section:
  About carries the longest continuous body copy on the site (about.body
  paragraphs at text-muted, plus the capabilities list), so it has the least
  contrast headroom of any section behind which this could sit. SceneScrim
  covers it at 0.86 alpha, and these ceilings keep the worst frame under the
  ~0.30 additive peak that scrim was originally measured against.
*/
const STRATUM_PEAK = 0.2;
const SCAN_PEAK = 0.3;
const SPINE_PEAK = 0.1;

export default function AboutStrata({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const group = useRef<Group>(null);
  const spine = useRef<Mesh>(null);
  const strataRefs = useRef<(Mesh | null)[]>([]);

  /*
    Per-stratum height and radius, computed once.

    The radius traces a spindle — widest at the middle, tapering to half-width
    at both ends — with a small ripple layered on so the silhouette reads as
    measured material rather than as a machined lathe shape.
  */
  const layout = useMemo(
    () =>
      Array.from({ length: STRATA }, (_, i) => {
        const u = i / (STRATA - 1); // 0 at the bottom, 1 at the top
        const spindle = 0.5 + 0.5 * Math.sin(u * Math.PI);
        const ripple = 1 + 0.14 * Math.sin(u * Math.PI * 4);
        return {
          u,
          y: (u - 0.5) * COLUMN_HEIGHT,
          radius: MAX_RADIUS * spindle * ripple,
          phase: u * TWIST,
        };
      }),
    [],
  );

  /*
    One unit-radius arc geometry shared by every stratum, scaled per mesh —
    fifteen TorusGeometries would be fifteen uploads of the same vertices.
    Materials stay per-stratum because the read head brightens them
    individually; one shared material would light the whole column at once.
  */
  const arcGeometry = useMemo(
    () => new TorusGeometry(1, 0.019, 5, 64, ARC),
    [],
  );
  const arcMaterials = useMemo(
    () =>
      Array.from(
        { length: STRATA },
        () =>
          new MeshBasicMaterial({
            color: STRATUM.clone(),
            transparent: true,
            opacity: 0,
            blending: AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [],
  );

  // The axis the sample was drawn along. Without it the strata read as
  // unrelated floating hoops; with it they read as one continuous column.
  const spineGeometry = useMemo(
    () => new CylinderGeometry(0.0035, 0.0035, COLUMN_HEIGHT * 1.18, 5),
    [],
  );
  const spineMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: STRATUM,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      arcGeometry.dispose();
      arcMaterials.forEach((m) => m.dispose());
      spineGeometry.dispose();
      spineMaterial.dispose();
    },
    [arcGeometry, arcMaterials, spineGeometry, spineMaterial],
  );

  // Allocated once — a Color per stratum per frame would be 900 short-lived
  // objects a second and the GC hitches that come with them.
  const scratch = useMemo(() => new Color(), []);

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    /*
      Scoped to the About stage and gated before any work. stageWeight is a
      triangle peaking at its own stage, so this is fully dark through Index
      and through Contact, and only the About↔neighbour crossings ever blend
      it. Returning early keeps it free everywhere else on the page.
    */
    const weight = stageWeight(sceneScroll.stage, STAGE_ABOUT) * sceneScroll.presence;
    node.visible = weight > 0.004;
    if (!node.visible) return;

    const dt = Math.min(delta, 1 / 30);
    const time = state.clock.elapsedTime;
    const t = smoothing(0.03, dt);

    // Slow turn of the whole sample. Rotationally symmetric rings would show
    // nothing under this — it is the spiralling arc gaps that make it legible.
    if (!reducedMotion) node.rotation.y += dt * 0.11;

    /*
      The read head: a soft band travelling up the column, brightening and
      slightly swelling the strata it passes. Frozen mid-column under reduced
      motion, which leaves a legible, still core sample rather than removing
      the highlight altogether.
    */
    const scan = reducedMotion ? 0.5 : (time / SCAN_PERIOD) % 1;

    for (let i = 0; i < STRATA; i++) {
      const mesh = strataRefs.current[i];
      const material = arcMaterials[i];
      const item = layout[i];
      if (!mesh) continue;

      // Gaussian falloff around the read head, wrapped so a stratum near the
      // bottom still lights as the head leaves the top — otherwise the scan
      // visibly restarts instead of looping.
      const raw = Math.abs(item.u - scan);
      const distance = Math.min(raw, 1 - raw);
      const lit = Math.exp(-(distance * distance) / 0.012);

      mesh.scale.setScalar(item.radius * (1 + lit * 0.07));
      // Verified against three's Euler XYZ order: local-Z spin is applied
      // first, then the -90 degrees about X lays the ring flat, leaving its
      // hole axis on world Y. So this is a horizontal ring, spun by phase.
      mesh.rotation.set(-Math.PI / 2, 0, item.phase);

      scratch.copy(STRATUM).lerp(READ_HEAD, lit);
      material.color.copy(scratch);
      material.opacity = MathUtils.lerp(STRATUM_PEAK, SCAN_PEAK, lit) * weight;
    }

    const spineNode = spine.current;
    if (spineNode) {
      spineMaterial.opacity = MathUtils.lerp(spineMaterial.opacity, SPINE_PEAK * weight, t);
    }
  });

  return (
    /*
      Screen-left, slightly low.

      Projected against the About pose this lands at roughly NDC (-0.60,
      -0.14) at a depth of 3.9 — comfortably inside the frame, offset off the
      centre line rather than sitting behind the middle of the body copy.
    */
    <group ref={group} position={[-0.8, -2.35, -1.9]} visible={false}>
      <mesh ref={spine} geometry={spineGeometry} material={spineMaterial} />

      {layout.map((item, i) => (
        <mesh
          key={i}
          ref={(node) => {
            strataRefs.current[i] = node;
          }}
          geometry={arcGeometry}
          material={arcMaterials[i]}
          position={[0, item.y, 0]}
        />
      ))}
    </group>
  );
}
