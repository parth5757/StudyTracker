import {Slot} from '../types';
import {parseKey} from '../utils/date';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "7:30" -> "07:30", invalid -> null
export function normTime(s: string): string | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}

export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function fromMin(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`;
}

export function clock12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m < 10 ? '0' + m : m} ${suffix}`;
}

export function slotRange(s: Slot): string {
  return `${clock12(s.start)} – ${clock12(fromMin(toMin(s.start) + s.minutes))}`;
}

export function slotsOn(slots: Slot[], date: string): Slot[] {
  const dow = parseKey(date).getDay();
  return slots
    .filter(s => (s.date ? s.date === date : s.days.includes(dow)))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function repeatLabel(s: Slot): string {
  if (s.date) {
    return `Once · ${s.date}`;
  }
  if (s.days.length === 7) {
    return 'Every day';
  }
  return s.days
    .slice()
    .sort((a, b) => a - b)
    .map(d => WEEKDAYS[d])
    .join(' ');
}

export function minutesOfDay(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}
