import type { Project } from '@/types/project';

/*
  Media lives in /public/work and is referenced WITHOUT the deployment base
  path — lib/asset.ts applies that at render time. Writing the prefix in here
  would double it on GitHub Pages.

  `image` wins over `video` in the DOM index preview (a still costs one decode,
  a clip holds a decoder open for a panel that only appears on hover); the 3D
  orbit cards use whichever is set.

  The three stills below are described from their actual contents. The two
  clips are not: they came off a phone and could not be inspected here, so
  their titles and tags are placeholders — rename them to whatever they
  actually show.
*/
export const projects: Project[] = [
  {
    id: 'p-01',
    date: '2026-08-06',
    title: 'GRINDSET',
    subtitle: 'Collage on the AI-money-and-fast-cars aesthetic, played straight.',
    tags: ['collage', 'meme', 'edit'],
    tint: ['#6d4bff', '#160f3a'],
    image: '/work/grindset.png',
    alt: 'Collage of repeated portraits over banknotes, sports cars and motorcycles.',
  },
  {
    id: 'p-02',
    date: '2026-08-04',
    title: 'CLIP 01',
    subtitle: 'Placeholder — retitle once you have named the footage.',
    tags: ['video', 'untitled'],
    tint: ['#4be1ff', '#062c38'],
    video: '/work/clip-01.mp4',
  },
  {
    id: 'p-03',
    date: '2026-08-05',
    title: 'TABLE STAKES',
    subtitle: 'Stack of five-thousand chips left standing on an empty felt.',
    tags: ['photo', 'night', 'still_life'],
    tint: ['#ff5ea8', '#380f28'],
    image: '/work/table-stakes.png',
    alt: 'A stack of green and orange casino chips on a card table.',
  },
  {
    id: 'p-04',
    date: '2026-08-06',
    title: 'CLIP 02',
    subtitle: 'Placeholder — retitle once you have named the footage.',
    tags: ['video', 'untitled'],
    tint: ['#8b7bff', '#141036'],
    video: '/work/clip-02.mp4',
  },
  {
    id: 'p-05',
    date: '2026-08-03',
    title: 'DOWNTIME',
    subtitle: 'Available light, low angle, nobody performing for the camera.',
    tags: ['photo', 'portrait', 'candid'],
    tint: ['#c9d2ff', '#1a1c2e'],
    image: '/work/downtime.png',
    alt: 'A person sitting back on a sofa, lit only by the phone they are holding.',
  },
  {
    /*
      No media by design — the sixth card keeps the generated panel so the
      fallback path stays exercised. Give it an `image` or `video` and it
      behaves like the rest.
    */
    id: 'p-06',
    date: '2024-11-20',
    title: 'DRIFT PROTOCOL',
    subtitle: 'Looping identity system for an independent electronic label.',
    tags: ['blender', 'motion', 'identity'],
    tint: ['#4be1ff', '#241350'],
  },
];
