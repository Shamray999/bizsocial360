const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Compact number formatting, e.g. 18420 -> "18.4K". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Formats a 0..1 ratio as a percentage string, e.g. 0.135 -> "13.5%". */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** Formats a (dayOfWeek, hourOfDay) pair into a human label, e.g. "Wed 6:00 PM". */
export function formatWindow(dayOfWeek: number, hourOfDay: number): string {
  const day = DAYS[dayOfWeek] ?? '—';
  const hour12 = hourOfDay % 12 === 0 ? 12 : hourOfDay % 12;
  const meridiem = hourOfDay < 12 ? 'AM' : 'PM';
  return `${day} ${hour12}:00 ${meridiem}`;
}

/** Formats elapsed minutes as "Xh Ym". */
export function formatWaiting(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}
