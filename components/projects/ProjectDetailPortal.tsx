'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useReducedMotion } from 'framer-motion';
import { projects } from '@/content/projects';
import { closeProjectDetail, projectDetail, subscribeProjectDetail } from '@/lib/projectDetail';
import ProjectModal from '@/components/index/ProjectModal';

/**
 * The detail view opened from a card in the 3D works orbit or the archive
 * corridor — both meshes inside the fixed canvas, neither with a DOM parent
 * to render a portal from. Mounted once at the page root so it is reachable
 * from anywhere the canvas dispatches a click, and reuses the same
 * ProjectModal the Deep Index already opens, so a project reads identically
 * however it was reached.
 */
export default function ProjectDetailPortal() {
  const openId = useSyncExternalStore(
    subscribeProjectDetail,
    () => projectDetail.openId,
    () => null,
  );

  const prefersReduced = useReducedMotion();
  const project = useMemo(() => projects.find((p) => p.id === openId) ?? null, [openId]);

  return (
    <ProjectModal project={project} onClose={closeProjectDetail} reducedMotion={prefersReduced === true} />
  );
}
