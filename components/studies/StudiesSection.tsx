'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { studies } from '@/content/studies';
import { STUDY_CATEGORIES, type StudyCategory } from '@/types/study';
import { setStudiesFocus } from '@/lib/studiesScroll';
import StudyManifest from './StudyManifest';
import StudyTelemetry from './StudyTelemetry';
import StudyFilters from './StudyFilters';
import StudyModal from './StudyModal';
import SceneScrim from '@/components/ui/SceneScrim';
import ScrollFade from '@/components/ui/ScrollFade';

/**
 * "Studies" — the research and digital-experiments section.
 *
 * No card grid. The section is a manifest (StudyManifest, plain text rows)
 * beside a telemetry readout (StudyTelemetry) for whichever study the
 * manifest currently has in focus, floating over a 3D research core that
 * lives in the page's single shared WebGL canvas — see
 * components/three/StudiesCore.tsx, mounted from GlobalSceneController and
 * gated to this section's stage.
 *
 * `focusId` is the one new piece of state this holds beyond the filter and
 * the open record: which study is currently previewed. It is mirrored into
 * `studiesFocus` (lib/studiesScroll.ts), a plain object outside React that
 * the core's useFrame polls every frame — so hovering the manifest drives the
 * canvas without a single React re-render on the 3D side.
 */
export default function StudiesSection() {
  const prefersReduced = useReducedMotion();
  const reducedMotion = prefersReduced === true;

  const [category, setCategory] = useState<StudyCategory>('ALL');
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const base = Object.fromEntries(
      STUDY_CATEGORIES.map((c) => [c, 0]),
    ) as Record<StudyCategory, number>;
    base.ALL = studies.length;
    for (const item of studies) base[item.category] += 1;
    return base;
  }, []);

  const visible = useMemo(
    () => (category === 'ALL' ? studies : studies.filter((s) => s.category === category)),
    [category],
  );

  /*
    The study actually on display: whatever is hovered/focused, or the first
    of the current filter when nothing is. Falls through to the filter's
    first entry rather than staying pinned to a stale id — changing category
    while a study from the OLD filter is focused must not leave the telemetry
    panel and the research core showing a study the manifest no longer lists.
  */
  const effectiveId =
    focusId && visible.some((s) => s.id === focusId) ? focusId : (visible[0]?.id ?? null);

  const activeItem = useMemo(
    () => studies.find((s) => s.id === effectiveId) ?? null,
    [effectiveId],
  );

  const openItem = useMemo(
    () => studies.find((s) => s.id === openId) ?? null,
    [openId],
  );

  // Mirrors the derived focus into the module-level store the 3D core reads.
  // A plain assignment would also work, but the effect keeps the write in
  // React's own commit phase rather than scattering it across every event
  // handler that can change `effectiveId` (hover, filter change, mount).
  useEffect(() => {
    setStudiesFocus(effectiveId);
  }, [effectiveId]);

  const onFocusRow = useCallback((id: string | null) => setFocusId(id), []);
  const onOpen = useCallback((id: string) => setOpenId(id), []);
  const onClose = useCallback(() => setOpenId(null), []);

  return (
    <section
      id="studies"
      aria-labelledby="studies-heading"
      className="relative scroll-mt-24 px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-14"
    >
      <SceneScrim />
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-10 flex flex-col gap-8 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
          <ScrollFade>
            <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-text-muted">
              <span aria-hidden="true" className="text-accent-soft">04</span>
              <span className="h-px w-8 bg-hairline" aria-hidden="true" />
              <span>Research &amp; Digital Experiments</span>
            </div>
            <h2
              id="studies-heading"
              className="mt-3 font-sans text-[clamp(1.75rem,4.5vw,3rem)] font-bold leading-none tracking-[-0.03em] text-text"
            >
              Studies
            </h2>
          </ScrollFade>

          <StudyFilters
            active={category}
            counts={counts}
            onChange={(next) => {
              setCategory(next);
              // The row that was focused may not exist in the new filter;
              // clearing lets `effectiveId` fall through to the new list's
              // first entry instead of briefly pointing at a hidden study.
              setFocusId(null);
            }}
            reducedMotion={reducedMotion}
          />
        </div>

        {/*
          `min-w-0` on both children below, not decorative.

          `grid` has no breakpoint prefix, so this container is a grid at
          every width, and its two direct children are grid items subject to
          CSS Grid's default `min-width: auto` even below `lg`, where there
          is only one implicit column. A grid item's automatic minimum size
          is its content's min-content width unless overridden — and
          StudyManifest's row titles are `truncate` (white-space: nowrap),
          so their min-content is the FULL untruncated string. The longest
          title in content/studies.ts alone was enough to grow the implicit
          track to 684px and blow the whole page past a 390px viewport,
          confirmed by measuring it live. `min-w-0` is what actually caps it;
          `truncate` cannot do its job without it.
        */}
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-5">
            <StudyManifest
              items={visible}
              activeId={effectiveId}
              onFocusRow={onFocusRow}
              onOpen={onOpen}
              reducedMotion={reducedMotion}
            />

            <p
              aria-live="polite"
              className="mt-6 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-text-muted"
            >
              {visible.length} {visible.length === 1 ? 'study' : 'studies'}
              {category !== 'ALL' ? ` in ${category.toLowerCase()}` : ''}
            </p>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <StudyTelemetry item={activeItem} onOpenFull={() => activeItem && onOpen(activeItem.id)} reducedMotion={reducedMotion} />
          </div>
        </div>
      </div>

      <StudyModal item={openItem} onClose={onClose} reducedMotion={reducedMotion} />
    </section>
  );
}
