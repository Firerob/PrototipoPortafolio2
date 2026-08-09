"""
Turn tkabalin/WebGL-Fluid-Background's standalone script into an ES module
with an explicit lifecycle, so React can mount and unmount it safely.

The original is written for a plain HTML page: it grabs the first <canvas> in
the document at import time, fetches config.json over the network, alert()s on
failure, registers listeners it never removes, and loops forever. Every one of
those is wrong inside a single-page app.
"""

import pathlib
import re

SRC = pathlib.Path("fluid/webgl-fluid.js")
OUT = pathlib.Path("webglFluid.generated.js")

lines = SRC.read_text(encoding="utf-8").splitlines()

def grab(start, end):
    """1-indexed inclusive line range."""
    return "\n".join(lines[start - 1:end])

license_header = grab(1, 24)
helpers = grab(29, 44)          # resizeCanvas + scaleByPixelRatio
body = grab(61, 1831)           # inside of runSimulation(config)

assert lines[59].strip().startswith("function runSimulation"), lines[59]
assert lines[1831].strip() == "}", lines[1831]

# --- transformations on the simulation body ------------------------------

# 1. Route every listener through a tracker so destroy() can unbind them.
body = body.replace("canvas.addEventListener(", "_on(canvas, ")
body = body.replace("window.addEventListener(", "_on(window, ")

# 2. Drop the global keydown handler. It binds Space to "spawn splats", which
#    steals the browser's page-scroll key, and P to pause. Both are hostile on
#    a portfolio: the background must never intercept keys the page needs.
keydown = re.search(
    r'\n\s*_on\(window, "keydown", \(e\) => \{.*?\n\s*\}\);\n',
    body,
    re.DOTALL,
)
assert keydown, "keydown handler not found — the upstream file changed"
body = body.replace(keydown.group(0), "\n")

# 2b. Move mouse tracking from the canvas to the window.
#     As a background layer the canvas sits behind every section and has
#     pointer-events disabled, so it would never see a single mouse event and
#     the fluid would sit frozen. offsetX/offsetY are element-relative and
#     become meaningless on window, but the canvas is a fixed full-viewport
#     layer, so clientX/clientY are numerically identical to what offset* gave.
mousemove = re.search(
    r'_on\(canvas, "mousemove", \(e\) => \{.*?\n  \}\);',
    body,
    re.DOTALL,
)
assert mousemove, "mousemove handler not found — the upstream file changed"
patched_move = (
    mousemove.group(0)
    .replace('_on(canvas, "mousemove"', '_on(window, "mousemove"')
    .replace("e.offsetX", "e.clientX")
    .replace("e.offsetY", "e.clientY")
)
body = body.replace(mousemove.group(0), patched_move)

# 3. Keep the rAF handle so the loop can actually be cancelled.
assert body.count("requestAnimationFrame(update);") == 1
body = body.replace(
    "requestAnimationFrame(update);", "_raf = requestAnimationFrame(update);"
)

# 4. Bail out of an in-flight frame after teardown.
assert body.count("function update() {") == 1
body = body.replace(
    "function update() {",
    "function update() {\n    if (_destroyed) return;",
)

# 5. The dithering texture path must resolve from the site root, not the
#    directory the script happens to sit in.
assert body.count('createTextureAsync("LDR_LLL1_0.png")') == 1
body = body.replace(
    'createTextureAsync("LDR_LLL1_0.png")',
    "createTextureAsync(config.DITHERING_TEXTURE_URL)",
)

module = f'''{license_header}

/*
  ADAPTED FOR THIS PROJECT — see scratchpad/adapt_fluid.py for the transform.

  Upstream is a standalone page script. Changes made, all mechanical:
    - exported as createFluidSimulation(canvas, config) instead of grabbing
      document.getElementsByTagName("canvas")[0] at import time
    - config passed in rather than fetch()ed from config.json (and no alert()
      on failure — a blocking dialog in a background effect is unacceptable)
    - every addEventListener tracked and removed by destroy()
    - the requestAnimationFrame loop is cancellable
    - the global keydown handler removed: it bound Space to spawning splats,
      which would break page scrolling
    - dithering texture path supplied via config.DITHERING_TEXTURE_URL

  The simulation maths, shaders and rendering are unmodified.
*/

/**
 * @param {{HTMLCanvasElement}} canvas
 * @param {{Record<string, unknown>}} config
 * @returns {{{{ destroy: () => void, setPaused: (paused: boolean) => void }}}}
 */
export function createFluidSimulation(canvas, config) {{
  let _destroyed = false;
  let _raf = 0;
  const _listeners = [];

  function _on(target, type, handler, options) {{
    target.addEventListener(type, handler, options);
    _listeners.push([target, type, handler, options]);
  }}

{helpers}

  resizeCanvas();

{body}

  return {{
    destroy() {{
      if (_destroyed) return;
      _destroyed = true;
      cancelAnimationFrame(_raf);
      for (const [target, type, handler, options] of _listeners) {{
        target.removeEventListener(type, handler, options);
      }}
      _listeners.length = 0;
      // Release the GPU context explicitly. Browsers cap the number of live
      // WebGL contexts per page, and this one shares the page with two R3F
      // canvases — leaking it across remounts would eventually blank them.
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    }},
    setPaused(paused) {{
      config.PAUSED = paused;
    }},
  }};
}}
'''

OUT.write_text(module, encoding="utf-8")
print(f"wrote {OUT} ({len(module.splitlines())} lines)")
