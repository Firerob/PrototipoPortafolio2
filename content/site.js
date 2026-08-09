/*
  ─────────────────────────────────────────────────────────────────────────
  ALL COPY LIVES HERE. Edit this file, not the components.

  Everything below except the owner's name is PLACEHOLDER content written to
  give the layout realistic proportions. Project titles, dates, the email and
  the social handles are invented — replace them before this goes anywhere
  public.
  ─────────────────────────────────────────────────────────────────────────
*/

export const owner = {
  name: 'Esteban Pérez',
  // Shown as the logo mark in the navbar.
  mark: 'ESTEBAN PÉREZ',
  role: 'Digital Artist',
  // The giant word floating inside the 3D scene.
  heroWord: 'WORKS',
  status: 'Open for work',
};

export const navLinks = [
  { label: 'Works', href: '#works' },
  { label: 'News', href: '#news' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

/*
  Each project's `tint` is the pair of stops used for its placeholder panel.
  When real artwork exists, drop a `src` on the project and render next/image
  inside <WorkCard> — the card already reserves the aspect ratio, so swapping
  images in causes no layout shift.
*/
export const works = [
  {
    id: 'w-01',
    title: 'Refraction Study',
    category: '3D',
    year: '2026',
    blurb: 'Real-time dispersion experiments on procedural glass solids.',
    tint: ['#6d4bff', '#1b1140'],
    featured: true,
  },
  {
    id: 'w-02',
    title: 'Signal Garden',
    category: 'Motion',
    year: '2026',
    blurb: 'Generative title sequence driven by live audio amplitude.',
    tint: ['#4be1ff', '#08303c'],
  },
  {
    id: 'w-03',
    title: 'Null Terrain',
    category: '3D',
    year: '2025',
    blurb: 'Height-field landscapes rendered from corrupted elevation data.',
    tint: ['#ff5ea8', '#3a0f2a'],
  },
  {
    id: 'w-04',
    title: 'Kernel Bloom',
    category: 'Shader',
    year: '2025',
    blurb: 'A convolution playground exploring bloom without postprocessing.',
    tint: ['#8b7bff', '#150f38'],
    featured: true,
  },
  {
    id: 'w-05',
    title: 'Quiet Machines',
    category: 'Illustration',
    year: '2025',
    blurb: 'Series of eight plates on obsolete industrial hardware.',
    tint: ['#c9d2ff', '#1a1c2e'],
  },
  {
    id: 'w-06',
    title: 'Drift Protocol',
    category: 'Motion',
    year: '2024',
    blurb: 'Looping identity system for an independent electronic label.',
    tint: ['#4be1ff', '#2a1350'],
  },
];

export const news = [
  {
    date: '2026-07-22',
    tag: 'Exhibition',
    title: 'Refraction Study shown at a group exhibition on synthetic materials.',
  },
  {
    date: '2026-05-09',
    tag: 'Release',
    title: 'Open-sourced the curved-grid shader used across the 2026 work.',
  },
  {
    date: '2026-02-14',
    tag: 'Talk',
    title: 'Workshop on real-time transmission materials for the web.',
  },
  {
    date: '2025-11-30',
    tag: 'Studio',
    title: 'Studio reopened for select commissions and art direction.',
  },
];

export const about = {
  lead: 'I make things that only exist while they are running.',
  body: [
    'Digital artist working in real-time graphics — shaders, procedural geometry and motion systems that render live in the browser rather than out to video.',
    'The work sits between generative art and interface design: pieces that respond to input, degrade gracefully, and stay legible on a laptop from four years ago.',
  ],
  capabilities: [
    'Real-time 3D & WebGL',
    'Shader writing (GLSL)',
    'Generative systems',
    'Motion & title design',
    'Creative direction',
  ],
  tools: ['Three.js', 'React Three Fiber', 'Blender', 'Houdini', 'TouchDesigner', 'GLSL'],
};

export const contact = {
  lead: 'Available for commissions, collaborations and art direction.',
  // PLACEHOLDER — replace with a real address before publishing.
  email: 'hola@estebanperez.studio',
  socials: [
    { label: 'Instagram', href: '#' },
    { label: 'Are.na', href: '#' },
    { label: 'GitHub', href: '#' },
  ],
};
