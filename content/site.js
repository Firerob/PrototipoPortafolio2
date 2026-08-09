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
