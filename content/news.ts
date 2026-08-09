import type { NewsItem } from '@/types/news';

/*
  PLACEHOLDER CONTENT.

  Every entry below is invented — written to give the feed realistic
  proportions and to exercise all five filter categories. The four items that
  previously lived in content/site.js are carried over and expanded with the
  body copy the HUD reader needs. Replace before this goes anywhere public.
*/
export const news: NewsItem[] = [
  {
    id: 'log-08',
    date: '2026-08-09',
    category: 'DEVLOGS',
    title: 'Rebuilt the index as a depth-navigated corridor',
    excerpt:
      'The project list now recedes along a focus axis, with everything but the active row falling out of focus.',
    body: [
      'The first version was a filterable grid. It worked, but it read like a table of contents rather than part of the same space as the rest of the site.',
      'The rebuild drives one focus value from scroll and derives every row’s scale, blur and opacity from its distance to it. Hovering a row takes the focus away from scroll until the pointer leaves.',
      'Depth is expressed as scale rather than a literal translateZ. The literal version broke hit-testing outright: with rows carrying a 3D transform inside a perspective container, pointer events resolved to the list instead of any row, and not even the CSS hover state fired.',
    ],
    tags: ['css_3d', 'gsap', 'scrolltrigger'],
    tint: ['#6d4bff', '#160f3a'],
    status: 'PUBLISHED',
  },
  {
    id: 'log-07',
    date: '2026-07-22',
    category: 'EXHIBITIONS',
    title: 'Refraction Study shown at a group exhibition on synthetic materials',
    excerpt:
      'Four real-time dispersion pieces running continuously for the length of the show.',
    body: [
      'The room ran four machines side by side, each rendering a different solid under the same lighting rig. Visitors could not tell which were pre-rendered. None were.',
      'Running unattended for six weeks forced a discipline the studio versions never needed: memory had to stay flat, the context had to survive being backgrounded, and nothing could depend on a page reload.',
    ],
    tags: ['exhibition', 'realtime', 'installation'],
    tint: ['#4be1ff', '#062c38'],
    status: 'PUBLISHED',
  },
  {
    id: 'log-06',
    date: '2026-06-30',
    category: 'ARTICLES',
    title: 'Why frame-rate independent easing matters more than the easing curve',
    excerpt:
      'A lerp with a fixed factor converges twice as fast at 120Hz. Most motion code has this bug and nobody notices until they change monitors.',
    body: [
      'lerp(a, b, 0.1) called once per frame is the most common smoothing in creative code, and it is subtly wrong: the approach speed is a property of frame count, not of time.',
      'On a 60Hz display the value covers 10% of the remaining distance every 16.7ms. On a 144Hz display it covers the same 10% every 6.9ms, so the animation genuinely finishes faster. The feel of the whole piece changes with the hardware.',
      'The fix is one line: feed the lerp 1 - lambda^dt instead of a constant. The same code then settles at the same wall-clock speed everywhere.',
    ],
    tags: ['motion', 'article', 'math'],
    tint: ['#8b7bff', '#141036'],
    status: 'PUBLISHED',
  },
  {
    id: 'log-05',
    date: '2026-05-09',
    category: 'DEVLOGS',
    title: 'Open-sourced the curved-grid shader used across the 2026 work',
    excerpt:
      'Vertex-stage curvature with analytic line rendering, so the far field stays crisp instead of turning into moire.',
    body: [
      'The grid bends in the vertex stage rather than being a textured plane, which is what lets the horizon fall away without any distortion in the line weight.',
      'The lines themselves are computed in the fragment stage with fwidth, holding them at a constant on-screen width however far they recede. A texture-based grid aliases into noise at exactly the distance where the effect is supposed to be doing its work.',
    ],
    tags: ['glsl', 'open_source', 'three_js'],
    tint: ['#4be1ff', '#241350'],
    status: 'PUBLISHED',
  },
  {
    id: 'log-04',
    date: '2026-03-18',
    category: 'PRESS',
    title: 'Interview on building portfolios that render rather than play back',
    excerpt:
      'A conversation about the trade-offs of shipping real-time work to the open web.',
    body: [
      'The interview covered the obvious cost — a WebGL scene is heavier than a video of the same scene — and the less obvious payoff, which is that a rendering page can respond to the person looking at it.',
      'Most of the discussion ended up being about graceful degradation: what the page becomes with reduced motion on, on a four-year-old laptop, or with no WebGL context available at all.',
    ],
    tags: ['interview', 'press', 'web'],
    tint: ['#ff5ea8', '#380f28'],
    status: 'PUBLISHED',
  },
  {
    id: 'log-03',
    date: '2026-02-14',
    category: 'ARTICLES',
    title: 'Workshop notes: real-time transmission materials for the web',
    excerpt:
      'What refraction actually costs, and the three dials that decide whether it holds 60fps.',
    body: [
      'A transmission material renders the scene into an offscreen buffer every frame. That single fact explains almost all of its cost and all of the ways to control it.',
      'Resolution, sample count and whether backside rendering is on are the three dials that matter. Everything else is rounding error next to them.',
    ],
    tags: ['workshop', 'materials', 'performance'],
    tint: ['#c9d2ff', '#1a1c2e'],
    status: 'PUBLISHED',
  },
  {
    id: 'log-02',
    date: '2025-12-05',
    category: 'EXHIBITIONS',
    title: 'Signal Garden ran as a permanent lobby installation',
    excerpt:
      'An audio-reactive title system driven by the room’s own ambient level.',
    body: [
      'The piece takes a single microphone input and drives a generative type system from its amplitude envelope. Quiet rooms produce slow, wide forms; busy ones fracture.',
      'The hardest constraint was that it had to be boring enough to live with. An installation people walk past every day cannot demand attention the way a gallery piece can.',
    ],
    tags: ['touchdesigner', 'audio_reactive', 'installation'],
    tint: ['#4be1ff', '#08303c'],
    status: 'PUBLISHED',
  },
  {
    id: 'log-01',
    date: '2025-11-30',
    category: 'PRESS',
    title: 'Studio reopened for select commissions and art direction',
    excerpt: 'Taking a small number of projects per year, with a bias toward real-time work.',
    body: [
      'The studio is open again for commissions. The preference is for work that has to run live rather than be rendered out, and for briefs where the interaction is the point.',
      'Availability is deliberately limited. Fewer projects, longer engagements.',
    ],
    tags: ['studio', 'commissions'],
    tint: ['#6d4bff', '#1b1140'],
    status: 'PUBLISHED',
  },
];
