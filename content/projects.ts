import type { Project } from '@/types/project';

/*
  PLACEHOLDER DATA. "WEAR GO LAND" and its tags come from the brief; the rest
  is invented to give the carousel realistic proportions. Replace before this
  goes anywhere public.
*/
export const projects: Project[] = [
  {
    id: 'p-01',
    date: '2026-06-12',
    title: 'WEAR GO LAND',
    subtitle: 'Persistent fashion world built for mobile-first metaverse drops.',
    tags: ['unreal_engine', 'metaverse', 'mobile'],
    tint: ['#6d4bff', '#160f3a'],
  },
  {
    id: 'p-02',
    date: '2026-03-28',
    title: 'REFRACTION STUDY',
    subtitle: 'Real-time dispersion experiments on procedural glass solids.',
    tags: ['three_js', 'glsl', 'realtime'],
    tint: ['#4be1ff', '#062c38'],
  },
  {
    id: 'p-03',
    date: '2025-12-04',
    title: 'SIGNAL GARDEN',
    subtitle: 'Generative title sequence driven by live audio amplitude.',
    tags: ['touchdesigner', 'audio_reactive', 'installation'],
    tint: ['#ff5ea8', '#380f28'],
  },
  {
    id: 'p-04',
    date: '2025-09-17',
    title: 'NULL TERRAIN',
    subtitle: 'Height-field landscapes rendered from corrupted elevation data.',
    tags: ['houdini', 'procedural', 'print'],
    tint: ['#8b7bff', '#141036'],
  },
  {
    id: 'p-05',
    date: '2025-05-02',
    title: 'KERNEL BLOOM',
    subtitle: 'A convolution playground exploring bloom without postprocessing.',
    tags: ['glsl', 'shader', 'web'],
    tint: ['#c9d2ff', '#1a1c2e'],
  },
  {
    id: 'p-06',
    date: '2024-11-20',
    title: 'DRIFT PROTOCOL',
    subtitle: 'Looping identity system for an independent electronic label.',
    tags: ['blender', 'motion', 'identity'],
    tint: ['#4be1ff', '#241350'],
  },
];
