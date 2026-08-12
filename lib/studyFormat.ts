const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

/** `2026-08-09` → `2026.08.09`, the log-stamp format shared by the manifest,
 *  the telemetry panel and the full-record modal. */
export function stamp(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00Z`)).replace(/-/g, '.');
}

/** `study-09` → `SYS_STUDY_09`. */
export function register(id: string): string {
  return `SYS_${id.replace(/-/g, '_').toUpperCase()}`;
}
