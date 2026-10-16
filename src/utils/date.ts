// All "date" values in the app are local calendar days in YYYY-MM-DD form.
const pad = (n: number) => (n < 10 ? '0' + n : String(n));

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return toKey(new Date());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isValidKey(key: unknown): key is string {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return false;
  }
  return toKey(parseKey(key)) === key;
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

// a - b in whole days
export function diffDays(a: string, b: string): number {
  const ms = parseKey(a).getTime() - parseKey(b).getTime();
  return Math.round(ms / 86400000);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function dayName(key: string): string {
  return DAYS[parseKey(key).getDay()];
}

export function prettyDate(key: string | null): string {
  if (!key) {
    return '—';
  }
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function shortDate(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function relativeDay(key: string | null): string {
  if (!key) {
    return '—';
  }
  const diff = diffDays(key, todayKey());
  if (diff === 0) {
    return 'Today';
  }
  if (diff === 1) {
    return 'Tomorrow';
  }
  if (diff === -1) {
    return '1d overdue';
  }
  if (diff < 0) {
    return `${-diff}d overdue`;
  }
  return `in ${diff}d`;
}

export function dayLabel(key: string): string {
  const diff = diffDays(key, todayKey());
  if (diff === 0) {
    return 'Today';
  }
  if (diff === -1) {
    return 'Yesterday';
  }
  if (diff === 1) {
    return 'Tomorrow';
  }
  return `${dayName(key)}, ${shortDate(key)}`;
}

// Monday-based start of the week containing `key`
export function startOfWeek(key: string): string {
  const d = parseKey(key);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toKey(d);
}

export function fmtMinutes(m: number): string {
  if (m < 60) {
    return `${m}m`;
  }
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
