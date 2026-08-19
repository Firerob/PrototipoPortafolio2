/*
  Which project's detail view is open, held outside React.

  The orbit ring and the archive corridor are meshes inside the single fixed
  R3F canvas (see HeroScene.tsx); the modal that shows a project's full detail
  is a DOM overlay portalled onto document.body (ProjectModal.tsx). A mesh's
  onClick has no direct line to that DOM tree, so this store is the bridge —
  the same pattern worksScroll/archiveScroll already use to cross that same
  canvas/DOM boundary.

  ProjectsIndex keeps its OWN local useState for the Deep Index's modal: that
  one is opened from real DOM rows and has no canvas/DOM boundary to cross, so
  it does not need this store. This one exists specifically for the two
  canvas-driven entry points — the works orbit and the archive corridor.
*/

type Listener = () => void;

let openId: string | null = null;
const listeners = new Set<Listener>();

export const projectDetail = {
  get openId(): string | null {
    return openId;
  },
};

export function openProjectDetail(id: string): void {
  if (openId === id) return;
  openId = id;
  for (const listener of listeners) listener();
}

export function closeProjectDetail(): void {
  if (openId === null) return;
  openId = null;
  for (const listener of listeners) listener();
}

export function subscribeProjectDetail(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
