import type { Study } from '@/types/study';

/*
  ─────────────────────────────────────────────────────────────────────────
  DRAFT CONTENT — read before publishing.

  The technical substance below is real: every entry describes a decision
  that is actually implemented in this repository, and the file it lives in
  is named at the end of each body so you can check it. What is INVENTED is
  the framing — the dates, the ordering and the `status` values. Those are
  placeholders sized to exercise all four filter categories.

  This replaced a "Transmission Feed" of news items. The two that could not
  survive the change were the ones making checkable claims about the outside
  world (an exhibition, an interview); a study describes a method, which is
  yours to state.

  WHERE TO ADD MEDIA
  There is no card grid any more — the section is now a 3D research core
  (components/three/StudiesCore.tsx) with a text manifest and telemetry
  readout beside it (components/studies/). `image` feeds the core directly:
  set it to a still, e.g. '/studies/dispersion.jpg', file in /public/studies/,
  path WITHOUT the deployment base path — lib/asset.ts applies it at render
  time. The core samples it on an equirectangular wrap across its surface and
  cross-fades to it from whatever the previous selection showed. `alt` is
  required whenever `image` is set. `video` exists on the type for parity with
  the works media but the core does not read it — there is nowhere on a
  rotating solid to play a clip. None of the nine entries below carry `image`
  yet, so the core runs on its shader alone (tint, distortion, facets) until
  real captures exist; that is a designed resting state, not a missing asset.

  `params` (distortion / speed / facet) is what the core actually performs —
  see the field docs on StudyParams in types/study.ts. Tuned by ear per entry
  below to match what each study is about, not derived from anything
  measurable; adjust freely.
  ─────────────────────────────────────────────────────────────────────────
*/
export const studies: Study[] = [
  {
    id: 'study-09',
    date: '2026-08-09',
    category: 'SHADERS',
    title: 'Analytic grid lines that survive the horizon',
    excerpt:
      'A textured grid aliases into noise at exactly the distance where the effect is meant to be working. Computing the lines in the fragment stage holds them at constant on-screen width instead.',
    body: [
      'The grid bends in the vertex stage rather than being a plane with a texture on it. That is what lets the horizon fall away without the line weight distorting along with the surface — the geometry moves, the line definition does not.',
      'The lines themselves are computed per-fragment with fwidth, which gives the derivative of the grid coordinate across one pixel. Dividing by it yields a line that is the same width on screen no matter how far the surface has receded.',
      'The alternative is a repeating texture, and it fails in the worst possible place: as the surface tilts toward the horizon, more and more texels fall into each pixel and the grid turns into moire. Precisely the region the effect exists to draw.',
      'Implemented in components/hero/CurvedGrid.jsx.',
    ],
    tags: ['glsl', 'fwidth', 'antialiasing'],
    tint: ['#4be1ff', '#241350'],
    status: 'PUBLISHED',
    params: { distortion: 0.35, speed: 0.9, facet: 10 },
  },
  {
    id: 'study-08',
    date: '2026-08-06',
    category: 'REAL-TIME',
    title: 'The three dials that decide whether transmission holds 60fps',
    excerpt:
      'A transmission material renders the scene into an offscreen buffer every frame. That single fact explains almost all of its cost and every way to control it.',
    body: [
      'Refraction on the web is not free and it is not mysterious. The material needs to know what is behind the object, so it renders the scene again into a buffer, once per frame, before it can shade a single pixel of the surface.',
      'Three settings dominate what that costs: the resolution of that buffer, the number of samples taken through it, and whether backside rendering is on — which doubles the work outright by requiring a second pass for the inside of the solid.',
      'Everything else is rounding error next to those three. Tuning them against a frame budget rather than against how the material looks in isolation is the whole discipline.',
      'The prism in components/hero/Prism.jsx is where this budget is spent.',
    ],
    tags: ['three_js', 'transmission', 'performance'],
    tint: ['#c9d2ff', '#1a1c2e'],
    status: 'COMPLETE',
    params: { distortion: 0.5, speed: 1.4, facet: 6 },
  },
  {
    id: 'study-07',
    date: '2026-08-04',
    category: 'INTERACTIVE',
    title: 'Depth as scale, because translateZ broke hit-testing',
    excerpt:
      'A list navigated along Z, rebuilt after the literal 3D version stopped receiving pointer events entirely — including its own CSS hover state.',
    body: [
      'The index recedes along a focus axis: scroll drives one value, and every row derives its scale, blur and opacity from its distance to it. Hovering a row takes the focus away from scroll until the pointer leaves again.',
      'The first implementation used a real translateZ inside a perspective container and broke interaction outright. With the rows also carrying filter and opacity, hit-testing resolved to the list element instead of to any row — not one pointer event ever reached a row, and not even :hover fired.',
      'Scale is the on-screen projection of Z anyway: an object twice as far away is drawn half as large. Paired with blur and opacity it reads as the same corridor, while hit-testing exactly where the row is drawn.',
      'Implemented in components/index/ProjectsIndex.tsx.',
    ],
    tags: ['css_3d', 'hit_testing', 'scrolltrigger'],
    tint: ['#6d4bff', '#160f3a'],
    status: 'PUBLISHED',
    params: { distortion: 0.4, speed: 1.0, facet: 5 },
  },
  {
    id: 'study-06',
    date: '2026-07-28',
    category: 'REAL-TIME',
    title: 'Frame-rate independent easing matters more than the curve',
    excerpt:
      'A lerp with a fixed factor converges twice as fast at 120Hz. Most motion code carries this bug and nobody notices until they change monitors.',
    body: [
      'lerp(a, b, 0.1) called once per frame is the most common smoothing in creative code, and it is subtly wrong: the approach speed is a property of frame count, not of time.',
      'At 60Hz the value covers 10% of the remaining distance every 16.7ms. At 144Hz it covers the same 10% every 6.9ms, so the animation genuinely finishes sooner. The feel of the whole piece changes with the hardware it happens to run on.',
      'The fix is one expression: feed the lerp 1 - lambda^dt instead of a constant. The same code then settles at the same wall-clock speed everywhere, and the tuning you did on one machine survives the move to another.',
      'Used by every damped follow in the scene — the orbit ring, the index tilt, the prism.',
    ],
    tags: ['motion', 'math', 'framerate'],
    tint: ['#8b7bff', '#141036'],
    status: 'PUBLISHED',
    params: { distortion: 0.25, speed: 1.6, facet: 4 },
  },
  {
    id: 'study-05',
    date: '2026-07-14',
    category: 'SHADERS',
    title: 'One material, two sources: swapping media in without a blank frame',
    excerpt:
      'Cards render on a generated gradient panel immediately and switch to their artwork the moment each file lands, driven by a single uniform.',
    body: [
      'Loading media through a suspending hook puts every card behind the slowest single file. With multi-megabyte clips in the set, that means an empty ring until the worst one arrives.',
      'Instead the loads are imperative and the shader carries a uHasMap uniform. Until a texture exists the fragment stage draws the card from its two tint stops; the frame after the file resolves, the same material samples the texture. No card is ever blank and none is ever stretched.',
      'The tint pair for each card is sampled from its own artwork, so the swap reads as the panel sharpening rather than as a colour change — which is the difference between a loading state and a transition.',
      'Implemented in components/three/orbitCardShader.ts and OrbitCards.tsx.',
    ],
    tags: ['glsl', 'texture_loading', 'three_js'],
    tint: ['#4be1ff', '#062c38'],
    status: 'COMPLETE',
    params: { distortion: 0.3, speed: 0.8, facet: 8 },
  },
  {
    id: 'study-04',
    date: '2026-06-30',
    category: 'CGI & RENDER',
    title: 'Dispersion without a spectrum: three samples and a chromatic offset',
    excerpt:
      'Splitting the refraction ray per channel costs three lookups. A full spectral integration costs dozens and, at this size on screen, looks the same.',
    body: [
      'Physically, dispersion is a continuous function of wavelength. Sampled honestly that means many rays per fragment, and the cost scales with a quality nobody can see once the solid is smaller than a third of the frame.',
      'Offsetting the index of refraction slightly per RGB channel and taking three samples reproduces the visible artefact — colour separation that widens toward the edges of the solid, where the surface is most oblique — for a fixed, predictable cost.',
      'The tell that gives away the cheap version is uniform separation across the whole surface. Scaling the offset by the angle between the view vector and the normal is what keeps it reading as an optical property rather than as a filter.',
      'DRAFT — this entry describes a general method, not a specific file in this repo.',
    ],
    tags: ['refraction', 'dispersion', 'glsl'],
    tint: ['#ff5ea8', '#380f28'],
    status: 'ONGOING',
    params: { distortion: 0.6, speed: 0.6, facet: 3 },
  },
  {
    id: 'study-03',
    date: '2026-06-02',
    category: 'INTERACTIVE',
    title: 'One delegated listener beats six that never fire',
    excerpt:
      'Per-row pointerenter handlers measured twelve effect runs and zero enters. The element receiving the events was the list, not any row.',
    body: [
      'Rows carrying 3D transforms inside a perspective container do not necessarily receive their own pointer events — hit-testing can resolve to an ancestor. Six per-row listeners were attached, ran their effects, and then simply never fired.',
      'Delegating a single pointermove to the element that does get hit fixes it and replaces six listeners with one. The handler walks up from the event target to the nearest row and writes the tilt straight onto that row, bypassing React entirely.',
      'Keeping it out of state matters as much as keeping it to one listener: a spring per row in React state would re-render the whole subtree on every mouse move, for a value that only ever ends up in a transform.',
      'Implemented in components/index/ProjectsIndex.tsx and ProjectRow.tsx.',
    ],
    tags: ['pointer_events', 'delegation', 'react'],
    tint: ['#9dff2e', '#3b0a55'],
    status: 'PUBLISHED',
    params: { distortion: 0.2, speed: 1.1, facet: 5 },
  },
  {
    id: 'study-02',
    date: '2026-05-19',
    category: 'CGI & RENDER',
    title: 'A frame budget the phone can actually meet',
    excerpt:
      'The same scene, scaled by what the device reports: pixel ratio capped, the heaviest passes dropped, the choreography kept.',
    body: [
      'A scene tuned on a desktop GPU does not degrade gracefully on a phone; it degrades into a slideshow. The expensive parts have to be identified up front and made optional rather than scaled down uniformly.',
      'Device pixel ratio is the first and largest dial — rendering at 3x on a phone is nine times the fragment work of 1x for a difference that a 6-inch screen mostly cannot show. Capping it buys more than any shader optimisation that follows.',
      'What must not change is the timing. Dropping a pass is invisible; dropping the choreography that the scroll is built around is not, because the whole page is keyed to it.',
      'Implemented across components/three/ — see the adaptivity in HeroScene.tsx.',
    ],
    tags: ['adaptivity', 'dpr', 'mobile'],
    tint: ['#5cc9ff', '#0b3a63'],
    status: 'COMPLETE',
    params: { distortion: 0.45, speed: 0.5, facet: 3 },
  },
  {
    id: 'study-01',
    date: '2026-04-11',
    category: 'SHADERS',
    title: 'One palette, driven by light instead of by material colour',
    excerpt:
      'Every surface reads from the same accent token, so a single value re-colours the entire scene without touching a material.',
    body: [
      'Colour was originally set per material, which meant a change of palette was a change to every object and a guarantee that some of them would be missed.',
      'Centralising it means the scene is lit rather than painted: the lights carry the accent, the materials stay neutral, and the whole space shifts as one when the token moves. Sections can then hand the scene their own accent as the page scrolls.',
      'The indirection is the entire mechanism — a CSS custom property feeds both the DOM utilities and the uniforms, so the 2D and 3D halves of the page can never disagree about what colour the site currently is.',
      'Implemented in lib/palette.ts and components/ColorMorph.tsx.',
    ],
    tags: ['palette', 'lighting', 'design_tokens'],
    tint: ['#d4f634', '#12305c'],
    status: 'PUBLISHED',
    params: { distortion: 0.15, speed: 0.7, facet: 7 },
  },
];
