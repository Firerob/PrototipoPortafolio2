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
  { label: 'Studies', href: '#studies' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
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

  /*
    ⚠️ INVENTED NUMBERS — READ BEFORE PUBLISHING.

    These are not placeholders in the harmless sense that a lorem-ipsum
    paragraph is. They are specific, checkable claims attached to a named
    person: how long they have worked, how many awards they hold. Shipping
    them unedited would put false credentials on a real portfolio.

    Replace every value with the real one, or delete the entries you cannot
    substantiate. `stats: []` renders nothing and the layout still works.
  */
  stats: [
    { label: 'Years in real-time', value: 8 },
    { label: 'Projects shipped', value: 46, suffix: '+' },
    { label: 'Recognitions', value: 5 },
  ],

  /*
    The trailing word is a specialism, not a skill rating. A self-assigned
    "95%" is unfalsifiable and reads as filler; naming what the tool is used
    for actually says something.
  */
  stack: [
    { name: 'THREE.JS', level: 'core' },
    { name: 'R3F', level: 'daily' },
    { name: 'GLSL', level: 'shaders' },
    { name: 'REACT', level: 'daily' },
    { name: 'NEXT.JS', level: 'delivery' },
    { name: 'GSAP', level: 'motion' },
    { name: 'BLENDER', level: 'assets' },
    { name: 'HOUDINI', level: 'procedural' },
    { name: 'TOUCHDESIGNER', level: 'installs' },
  ],

  /** Free-text HUD coordinates. Purely decorative. */
  coords: { lat: '4.7110° N', long: '74.0721° W' },
};

export const contact = {
  lead: 'Available for commissions, collaborations and art direction.',

  // PLACEHOLDER — this address does not exist. Replace before publishing.
  email: 'hola@estebanperez.studio',

  /** IANA zone for the live clock. GMT-5, matching the About HUD coordinates. */
  timezone: 'America/Bogota',
  /** Decorative transmission label for the status bar. */
  frequency: '433.92 MHz',

  /*
    ⚠️ Every href below is '#'. They are inert placeholders, not real
    profiles. A social row that looks clickable and goes nowhere is worse
    than no social row — fill these in or delete the entries.
  */
  socials: [
    { label: 'GitHub', handle: '@estebanperez', href: '#' },
    { label: 'LinkedIn', handle: '/in/estebanperez', href: '#' },
    { label: 'X', handle: '@estebanperez', href: '#' },
    { label: 'Discord', handle: 'estebanperez', href: '#' },
  ],

  /** Selectable badges in the form. */
  projectTypes: ['3D WebGL', 'Full-Stack', 'Motion', 'Other'],

  /*
    Where the form POSTs.

    This site is built with `output: 'export'` — it is static files on GitHub
    Pages, so there is no server and no API route can exist here. Without a
    third-party endpoint (Formspree, Web3Forms, Basin…) a submit button
    CANNOT deliver a message.

    Leave this null and the form composes a pre-filled email in the visitor's
    mail client instead, and says so. Set it to an endpoint URL and the form
    POSTs the payload as JSON and reports real success or failure. What it
    never does is animate a fake "received" state over a message that went
    nowhere.
  */
  formEndpoint: null,
};
