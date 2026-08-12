import type { Project } from '@/types/project';

/*
  ─────────────────────────────────────────────────────────────────────────
  WHERE TO EDIT — the four fields the detail modal reads
  ─────────────────────────────────────────────────────────────────────────
  `full`    → URL of the high-resolution file for the zoom / fullscreen layer.
              Leave it out and the zoom reuses `image`, which is what every
              project does today. Put big files in /public/work/full/ and
              write '/work/full/name.jpg' — no base-path prefix, ever.
  `body`    → the long description. One string per paragraph. The paragraphs
              below are a DRAFT written from what each file actually shows;
              replace them with the real account of the work.
  `credits` → the spec sheet. Every '—' is a blank waiting for you. Do not
              write a client's name unless the work was really for them: this
              renders as a public, checkable claim.
  `href`    → external destination for the CTA. Absent, no button renders.
  ─────────────────────────────────────────────────────────────────────────

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
  colour change. The modal reuses the same pair for its per-project accent.

  The two clips are titled from the source file names, not from their frames:
  no decoder was available here to look inside them. Retitle if they are wrong.
*/

/** Blank spec-sheet row. Spelled once so the placeholders are greppable. */
const TBD = '—';

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
    body: [
      'A descent staged as a holiday. The figure hangs from a translucent parasol that behaves like a canopy, one arm locked overhead, everything else — hair, ribbons, the tilt of the legs — reading the airflow on the way down.',
      'The palette is built almost entirely out of light: a cyan field, white cloud banks, and a rainbow laid diagonally behind the subject so the beach balls have something to separate against. Saturation is pushed hardest on the props and pulled back on the sky, which keeps a very bright image from flattening.',
      'A thin drawn frame sits inside the crop. It does two things at once — it stops the sky bleeding to the edge of the panel, and it makes the piece read as a plate rather than as a still.',
    ],
    credits: [
      { label: 'Client', value: TBD },
      { label: 'Year', value: '2026' },
      { label: 'Tools', value: TBD },
      { label: 'Role', value: TBD },
    ],
  },
  {
    id: 'p-02',
    date: '2026-08-04',
    title: 'CREATOR WORKFLOW',
    subtitle: 'Loop cut for the vertical feed — save, share, rebuild later.',
    tags: ['video', 'loop', 'vertical'],
    tint: ['#4be1ff', '#062c38'],
    video: '/work/creator-workflow.mp4',
    body: [
      'Cut for the vertical feed: a loop short enough to come back around before attention leaves, framed so the subject survives being watched at thumbnail size.',
      'DRAFT — this paragraph was written from the file name, not from the footage. Replace it with what the clip actually shows.',
    ],
    credits: [
      { label: 'Client', value: TBD },
      { label: 'Year', value: '2026' },
      { label: 'Tools', value: TBD },
      { label: 'Role', value: TBD },
    ],
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
    body: [
      'Four acid-green letters run the full height of the sheet and the portrait is dropped straight through them, so the word is never fully readable and neither is the face. The overlap is the piece: type and subject occupy the same plane instead of sitting in layers.',
      'Two inks do all the work — acid green against electric blue-violet, with the shadow shapes carrying the drawing. Restricting the palette this hard is what lets the halftone body copy at the bottom stay legible without a third colour.',
      'That body text is set to be read as texture first and language second: it fills the lower third, wraps behind the coat, and gives the composition a base heavy enough to hold the display type up.',
    ],
    credits: [
      { label: 'Client', value: TBD },
      { label: 'Year', value: '2026' },
      { label: 'Tools', value: TBD },
      { label: 'Role', value: TBD },
    ],
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
    body: [
      '未来の — "of the future" — stacked vertically and printed as if the plate were failing. The erosion is not decoration: the characters are read through their damage, which is the whole tension of using a phrase about what is coming and making it look recovered from something old.',
      'A hot magenta field takes almost the entire sheet, interrupted by a pale margin down the right edge. The margin is what keeps the magenta from reading as a background — it turns the colour into an object with a boundary.',
      'The marks scattered through the empty space (triangles, a progress bar, hatching, a cross) are registration furniture rather than content. They sit at the edges to imply a system the poster is only one page of.',
    ],
    credits: [
      { label: 'Client', value: TBD },
      { label: 'Year', value: '2026' },
      { label: 'Tools', value: TBD },
      { label: 'Role', value: TBD },
    ],
  },
  {
    id: 'p-05',
    date: '2026-08-06',
    title: 'MINDFULNESS',
    subtitle: 'Slow loop, long dissolves, nothing asking for a reaction.',
    tags: ['video', 'loop', 'ambient'],
    tint: ['#8b7bff', '#141036'],
    video: '/work/mindfulness.mp4',
    body: [
      'The counter-programme to the feed it plays in: a loop with no cut on the beat and nothing competing for the first second.',
      'DRAFT — this paragraph was written from the file name, not from the footage. Replace it with what the clip actually shows.',
    ],
    credits: [
      { label: 'Client', value: TBD },
      { label: 'Year', value: '2026' },
      { label: 'Tools', value: TBD },
      { label: 'Role', value: TBD },
    ],
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
    body: [
      'A character shot with no key light of its own. Everything on the figure — the green of the jacket, the rim on the headphones, the glow inside the shoe plates — is returned from the wall of signage behind them, which is why the whole frame sits in two colours.',
      'The pose is deliberately low and symmetrical: knees up, hands together, camera slightly beneath eye line. It reads as a pause in the street rather than as a hero pose, and the symmetry lets the signage do the composing.',
      'The green katakana overhead is set large enough to crop, so the sign extends past the frame and the viewer infers the rest of the street. Cropping type is the cheapest way to make a background feel bigger than the shot.',
    ],
    credits: [
      { label: 'Client', value: TBD },
      { label: 'Year', value: '2026' },
      { label: 'Tools', value: TBD },
      { label: 'Role', value: TBD },
    ],
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
    body: [
      'A monster plate built the way a two-colour risograph print is built: blue carries every line and every shadow, yellow carries every highlight, and the magenta smoke is what happens where the two are asked to overlap.',
      'The scale trick is the corner. The creature is drawn flat and cartoonish, and the only realistic thing in the frame is the ruled architecture at the lower right — which is what tells you the cat is the size of a building.',
      'Hand-drawn katakana across the top is treated as part of the same plate, printed with the same erosion and misregistration as the artwork rather than set cleanly on top of it.',
    ],
    credits: [
      { label: 'Client', value: TBD },
      { label: 'Year', value: '2026' },
      { label: 'Tools', value: TBD },
      { label: 'Role', value: TBD },
    ],
  },
];
