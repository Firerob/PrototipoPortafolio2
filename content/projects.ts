import type { Project } from '@/types/project';

/*
  Media lives in /public/work and is referenced WITHOUT the deployment base
  path — lib/asset.ts applies that at render time. Writing the prefix in here
  would double it on GitHub Pages.

  `image` wins over `video` in the DOM index preview (a still costs one decode,
  a clip holds a decoder open for a panel that only appears on hover); the 3D
  orbit cards use whichever is set.

  Stills and clips alternate on purpose. The orbit ring and the Deep Index both
  walk this array in order, so grouping the five stills together would leave a
  run of video-only cards at the end of the sweep.

  `tint` is what the card shows BEFORE its file resolves, so each pair is
  sampled from its own artwork (brightest saturated pixel → a dark one). That
  is what makes the texture swap read as the panel sharpening rather than as a
  colour change.

  The two clips are titled from the source file names, not from their frames:
  no decoder was available here to look inside them. Retitle if they are wrong.
*/
export const projects: Project[] = [
  {
    id: 'p-01',
    date: '2026-08-06',
    title: 'SKY DROP',
    subtitle: 'Freefall under a parasol, staged in permanent summer weather.',
    tags: ['illustration', 'anime', 'key_art'],
    tint: ['#5cc9ff', '#0b3a63'],
    image: '/work/sky-drop.jpg',
    alt: 'Anime figure descending under a translucent parasol through a bright sky of beach balls and a rainbow.',
  },
  {
    id: 'p-02',
    date: '2026-08-04',
    title: 'CREATOR WORKFLOW',
    subtitle: 'Loop cut for the vertical feed — save, share, rebuild later.',
    tags: ['video', 'loop', 'vertical'],
    tint: ['#4be1ff', '#062c38'],
    video: '/work/creator-workflow.mp4',
  },
  {
    id: 'p-03',
    date: '2026-08-05',
    title: 'BLUR',
    subtitle: 'Acid-green display type cut through a figure that will not resolve.',
    tags: ['poster', 'type', 'duotone'],
    tint: ['#d4ff00', '#0a071e'],
    image: '/work/blur.jpg',
    alt: 'Poster of a figure in sunglasses under the word BLUR in acid green, printed over electric blue.',
  },
  {
    id: 'p-04',
    date: '2026-08-03',
    title: 'MIRAI NO',
    subtitle: 'Three characters, eroded plate, one magenta field holding them up.',
    tags: ['poster', 'kanji', 'print'],
    tint: ['#ff0080', '#302950'],
    image: '/work/mirai.jpg',
    alt: 'Distressed dark kanji reading 未来の stacked over a hot magenta field with a pale margin.',
  },
  {
    id: 'p-05',
    date: '2026-08-06',
    title: 'MINDFULNESS',
    subtitle: 'Slow loop, long dissolves, nothing asking for a reaction.',
    tags: ['video', 'loop', 'ambient'],
    tint: ['#8b7bff', '#141036'],
    video: '/work/mindfulness.mp4',
  },
  {
    id: 'p-06',
    date: '2026-08-02',
    title: 'NEON DISTRICT',
    subtitle: 'Street sit-down lit entirely by the signage behind it.',
    tags: ['3d', 'cyberpunk', 'character'],
    tint: ['#9dff2e', '#3b0a55'],
    image: '/work/neon-district.jpg',
    alt: 'Figure in a neon-green jacket and headphones seated against a wall of purple signage.',
  },
  {
    id: 'p-07',
    date: '2026-08-01',
    title: 'KAIJU CAT',
    subtitle: 'Riso-style monster plate: two inks doing the work of five.',
    tags: ['illustration', 'riso', 'poster'],
    tint: ['#d4f634', '#12305c'],
    image: '/work/kaiju-cat.jpg',
    alt: 'Blue cat kaiju with yellow eyes and teeth rising out of smoke over a city, under yellow katakana.',
  },
];
