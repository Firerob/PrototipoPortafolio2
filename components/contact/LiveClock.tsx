'use client';

import { useEffect, useState } from 'react';

interface LiveClockProps {
  /** IANA zone, e.g. 'America/Bogota'. */
  timezone: string;
}

/** Current UTC offset for a zone, as `GMT-5`. Derived rather than hardcoded so
 *  it stays correct across daylight-saving changes. */
function offsetLabel(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/**
 * Live local clock for the artist's timezone.
 *
 * Renders a static placeholder until mounted. The server has no idea what
 * second it is on the client, so rendering a real time during SSR guarantees
 * a hydration mismatch — the one bug this component would otherwise always
 * have.
 */
export default function LiveClock({ timezone }: LiveClockProps) {
  const [now, setNow] = useState<string | null>(null);
  const [offset, setOffset] = useState('');

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const tick = () => setNow(formatter.format(new Date()));

    tick();
    setOffset(offsetLabel(timezone));

    /*
      Aligned to the wall clock rather than a plain 1000ms interval. A bare
      interval drifts and eventually skips a visible second; syncing the first
      tick to the next second boundary keeps the display honest.
    */
    let interval: number | undefined;
    const align = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 1000);
    }, 1000 - (Date.now() % 1000));

    return () => {
      window.clearTimeout(align);
      if (interval) window.clearInterval(interval);
    };
  }, [timezone]);

  return (
    <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-text-muted">
      local time:{' '}
      {/* tabular-nums stops the row jittering as digits change width. */}
      <span className="tabular-nums text-text">{now ?? '--:--:-- --'}</span>
      {offset && <span className="text-text-muted/60"> · {offset}</span>}
    </span>
  );
}
