/*
  Drive the dev server in a real Chromium and report what actually renders.

  Two things make this worth more than eyeballing localhost:
   - reducedMotion is forced to 'no-preference', so the full animation runs
     even though this machine has reduce-motion enabled system-wide.
   - console + pageerror are captured, which is where GLSL compile failures
     surface. A shader error never fails the build; it only shows up here.
*/
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? 'shots';
const URL = 'http://localhost:3000';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    // Headless Chromium has no GPU; SwiftShader gives it a software WebGL2
    // implementation. Slow, but it compiles and runs real shaders, which is
    // exactly what needs checking.
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});

const logs = [];
const page = await context.newPage();
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(URL, { waitUntil: 'load', timeout: 120000 });

// SwiftShader needs real time to compile the shader set and draw first frames.
await page.waitForTimeout(12000);

const renderer = await page.evaluate(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return 'NO WEBGL';
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
});

const canvases = await page.evaluate(
  () => document.querySelectorAll('canvas').length,
);

await page.screenshot({ path: `${OUT}/00-hero.png` });

/*
  Scroll with real wheel events rather than window.scrollTo: Lenis owns the
  scroll position, and programmatic scrollTo bypasses it entirely — the page
  would jump while Lenis still believed it was at the top, and ScrollTrigger
  would report the wrong progress. Wheel events go through the same path a
  user's trackpad does.
*/
const steps = [
  ['01-scroll-early', 900],
  ['02-scroll-assembly', 1400],
  ['03-scroll-orbit', 1800],
  ['04-scroll-orbit-late', 1800],
  ['05-scroll-archive', 2600],
];

const progress = [];
for (const [name, delta] of steps) {
  await page.mouse.wheel(0, delta);
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  progress.push(
    await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      // Sample the live orbit driver straight out of the module singleton if
      // the bundler exposed it; otherwise just report scroll position.
      cards: document.querySelectorAll('canvas').length,
    })),
  );
}

console.log('=== RENDERER ===');
console.log(renderer);
console.log('=== CANVASES ON PAGE ===', canvases);
console.log('=== SCROLL SAMPLES ===');
console.log(JSON.stringify(progress));

const interesting = logs.filter((l) =>
  /error|Error|fail|Fail|Shader|GLSL|hydrat|warn|THREE|WebGL/.test(l),
);
console.log('=== CONSOLE (filtered) ===');
console.log(interesting.slice(0, 40).join('\n') || '(nothing matched)');
console.log('=== TOTAL CONSOLE LINES ===', logs.length);

await browser.close();
