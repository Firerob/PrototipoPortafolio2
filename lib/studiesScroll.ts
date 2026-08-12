/*
  Which study is driving the 3D research core, held outside React.

  Unlike worksScroll/archiveScroll, there is no listener set here: the only
  writer (a pointer/focus handler in StudyManifest) and the only React reader
  that needs a re-render (StudiesSection's own telemetry panel) are the same
  component, so React state already covers that path. This plain object
  exists for the SECOND reader — StudiesCore's useFrame, which polls it every
  frame and must never trigger a re-render by reading it.
*/

interface StudiesFocusState {
  /** id of the study currently focused in the manifest, or null when nothing
   *  is hovered/focused and the core should show its resting default. */
  id: string | null;
}

export const studiesFocus: StudiesFocusState = { id: null };

export function setStudiesFocus(id: string | null): void {
  studiesFocus.id = id;
}
