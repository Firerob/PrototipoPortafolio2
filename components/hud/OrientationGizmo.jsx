'use client';

import { useEffect, useRef } from 'react';
import { orientation } from '@/lib/frameState';

const CENTRE = 50;
const RADIUS = 30;

const AXES = [
  { key: 'x', label: 'X', color: '#ff5ea8' },
  { key: 'y', label: 'Y', color: '#4be1ff' },
  { key: 'z', label: 'Z', color: '#8b7bff' },
];

/*
  Rotated basis vectors straight from the quaternion.

  These are the three columns of the rotation matrix. Doing the algebra inline
  avoids importing three into a DOM-only component — the gizmo lives outside
  the Canvas and has no other reason to pull in the 3D library.
*/
function basisFromQuaternion(q, out) {
  const { x, y, z, w } = q;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;

  out.x[0] = 1 - (yy + zz);
  out.x[1] = xy + wz;
  out.x[2] = xz - wy;

  out.y[0] = xy - wz;
  out.y[1] = 1 - (xx + zz);
  out.y[2] = yz + wx;

  out.z[0] = xz + wy;
  out.z[1] = yz - wx;
  out.z[2] = 1 - (xx + yy);

  return out;
}

/**
 * Top-right HUD widget: a live 3-axis gizmo plus the raw quaternion readout,
 * mirroring the prism's orientation.
 *
 * Every value here changes 60 times a second. None of it is React state — the
 * rAF loop writes attributes and textContent straight onto cached DOM nodes,
 * so the component renders exactly once. Routing this through useState would
 * re-render the overlay on every frame and eat the frame budget the canvas
 * needs.
 */
export default function OrientationGizmo({ className = '', source = orientation, label = 'Gizmo' }) {
  const nodes = useRef({ line: {}, dot: {}, label: {}, readout: {} });

  // The live quaternion is read inside a rAF loop, so it must not be captured
  // in the effect's closure — a ref keeps the loop reading the current source
  // even if the prop changes, without re-arming the loop.
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    let raf = 0;
    let lastReadout = 0;
    const basis = { x: [0, 0, 0], y: [0, 0, 0], z: [0, 0, 0] };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const quaternion = sourceRef.current;
      basisFromQuaternion(quaternion, basis);

      for (const axis of AXES) {
        const v = basis[axis.key];
        const px = CENTRE + v[0] * RADIUS;
        // SVG y grows downward; negate so +Y points up on screen.
        const py = CENTRE - v[1] * RADIUS;

        // v[2] is how far the axis points toward the viewer. Mapping it to
        // opacity and dot size is what sells the widget as 3D on a flat SVG.
        const depth = (v[2] + 1) * 0.5;
        const opacity = (0.35 + depth * 0.65).toFixed(3);

        const line = nodes.current.line[axis.key];
        if (line) {
          line.setAttribute('x2', px.toFixed(2));
          line.setAttribute('y2', py.toFixed(2));
          line.setAttribute('opacity', opacity);
        }

        const dot = nodes.current.dot[axis.key];
        if (dot) {
          dot.setAttribute('cx', px.toFixed(2));
          dot.setAttribute('cy', py.toFixed(2));
          dot.setAttribute('r', (2.6 + depth * 2.4).toFixed(2));
          dot.setAttribute('opacity', opacity);
        }

        const label = nodes.current.label[axis.key];
        if (label) {
          label.setAttribute('x', (CENTRE + v[0] * (RADIUS + 11)).toFixed(2));
          label.setAttribute('y', (CENTRE - v[1] * (RADIUS + 11) + 3).toFixed(2));
          label.setAttribute('opacity', opacity);
        }
      }

      // Numbers refresh at ~12Hz. At 60Hz the digits are an unreadable blur and
      // it is 4 extra layout-invalidating text writes per frame for nothing.
      if (now - lastReadout > 80) {
        lastReadout = now;
        for (const key of ['x', 'y', 'z', 'w']) {
          const el = nodes.current.readout[key];
          if (el) el.textContent = quaternion[key].toFixed(3).padStart(6, ' ');
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`pointer-events-none select-none rounded-xl border border-hairline bg-ink/55 p-3 backdrop-blur-md ${className}`}
      // Decorative telemetry mirroring the canvas; the canvas already carries
      // the accessible description of the scene.
      aria-hidden="true"
    >
      <div className="mb-1.5 flex items-center justify-between gap-6 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-text-muted">
        <span>{label}</span>
        <span>Quat</span>
      </div>

      <svg viewBox="0 0 100 100" className="size-[88px]" focusable="false">
        <circle cx={CENTRE} cy={CENTRE} r={RADIUS + 6} fill="none" stroke="rgba(232,234,242,0.10)" strokeWidth="0.6" />
        <circle cx={CENTRE} cy={CENTRE} r="1.6" fill="rgba(232,234,242,0.5)" />

        {AXES.map((axis) => (
          <g key={axis.key}>
            <line
              ref={(el) => {
                nodes.current.line[axis.key] = el;
              }}
              x1={CENTRE}
              y1={CENTRE}
              x2={CENTRE}
              y2={CENTRE}
              stroke={axis.color}
              strokeWidth="1.1"
              strokeLinecap="round"
            />
            <circle
              ref={(el) => {
                nodes.current.dot[axis.key] = el;
              }}
              cx={CENTRE}
              cy={CENTRE}
              r="3"
              fill={axis.color}
            />
            <text
              ref={(el) => {
                nodes.current.label[axis.key] = el;
              }}
              x={CENTRE}
              y={CENTRE}
              fill={axis.color}
              fontSize="7"
              fontFamily="var(--font-plex-mono), monospace"
              textAnchor="middle"
            >
              {axis.label}
            </text>
          </g>
        ))}
      </svg>

      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[0.55rem] tabular-nums text-text-muted">
        {['x', 'y', 'z', 'w'].map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <dt className="uppercase text-text-muted/60">{key}</dt>
            <dd
              ref={(el) => {
                nodes.current.readout[key] = el;
              }}
              className="whitespace-pre text-text"
            >
              {' 0.000'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
