import {LogEntry, NodeItem} from '../types';
import {addDays, diffDays, todayKey} from '../utils/date';

export function minutesOn(logs: LogEntry[], date: string): number {
  return logs.reduce((sum, l) => (l.date === date ? sum + l.minutes : sum), 0);
}

export type StreakInfo = {current: number; best: number; activeDays: number; doneToday: boolean};

export function computeStreak(days: Set<string>): StreakInfo {
  const today = todayKey();
  let cursor = days.has(today) ? today : addDays(today, -1); // today not done yet doesn't break the streak
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const sorted = Array.from(days).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && diffDays(d, prev) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return {current, best, activeDays: days.size, doneToday: days.has(today)};
}

// Overall streak (any study on any section)
export function streak(logs: LogEntry[]): number {
  return computeStreak(new Set(logs.map(l => l.date))).current;
}

function rootIdOfLog(
  l: LogEntry,
  byId: Map<string, NodeItem>,
  rootByName: Map<string, string>,
): string | null {
  if (l.nodeId && byId.has(l.nodeId)) {
    let cur = byId.get(l.nodeId) as NodeItem;
    let guard = 0;
    while (cur.parentId && byId.has(cur.parentId) && guard++ < 40) {
      cur = byId.get(cur.parentId) as NodeItem;
    }
    return cur.id;
  }
  const first = (l.nodePath || '').split(' › ')[0];
  return rootByName.get(first) || null;
}

export type SectionStreak = {root: NodeItem; info: StreakInfo};

// One streak per top-level Section (Mathematics, Machine Learning, ...), independent of each other.
export function sectionStreaks(logs: LogEntry[], nodes: NodeItem[]): SectionStreak[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const roots = nodes.filter(n => n.parentId === null).sort((a, b) => a.order - b.order);
  const rootByName = new Map(roots.map(r => [r.name, r.id]));
  const days = new Map<string, Set<string>>();
  roots.forEach(r => days.set(r.id, new Set()));
  logs.forEach(l => {
    const rid = rootIdOfLog(l, byId, rootByName);
    if (rid && days.has(rid)) {
      (days.get(rid) as Set<string>).add(l.date);
    }
  });
  return roots.map(r => ({root: r, info: computeStreak(days.get(r.id) as Set<string>)}));
}

export function sectionNameOfLog(l: LogEntry, nodes: NodeItem[]): string {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const rootByName = new Map(nodes.filter(n => n.parentId === null).map(r => [r.name, r.id]));
  const rid = rootIdOfLog(l, byId, rootByName);
  if (rid) {
    return (byId.get(rid) as NodeItem).name;
  }
  return (l.nodePath || '').split(' › ')[0] || 'Other';
}

export type TopicDetail = {
  key: string;
  name: string;
  minutes: number;
  learn: number;
  revise: number;
  practice: number;
};

// Distinct topics worked on within a set of log entries.
export function topicsDetail(logs: LogEntry[]): TopicDetail[] {
  const map = new Map<string, TopicDetail>();
  logs.forEach(l => {
    const key = l.nodeId || 'p:' + (l.nodePath || l.note.slice(0, 30) || 'other');
    const cur =
      map.get(key) ||
      ({key, name: l.nodePath || l.note.slice(0, 40) || 'Untitled', minutes: 0, learn: 0, revise: 0, practice: 0} as TopicDetail);
    cur.minutes += l.minutes;
    cur[l.kind] += 1;
    map.set(key, cur);
  });
  return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
}

export function revisionCandidates(nodes: NodeItem[]): NodeItem[] {
  return nodes.filter(n => n.nextRevision && !n.revisionPaused);
}

export function dueOnOrBefore(nodes: NodeItem[], date: string): NodeItem[] {
  return revisionCandidates(nodes)
    .filter(n => (n.nextRevision as string) <= date)
    .sort((a, b) => (a.nextRevision as string).localeCompare(b.nextRevision as string));
}

export function dueOn(nodes: NodeItem[], date: string): NodeItem[] {
  return revisionCandidates(nodes).filter(n => n.nextRevision === date);
}

export function overdueDays(n: NodeItem): number {
  return n.nextRevision ? Math.max(0, diffDays(todayKey(), n.nextRevision)) : 0;
}

export function daysSinceExport(lastExportAt: string | null): number | null {
  if (!lastExportAt) {
    return null;
  }
  const ms = Date.now() - new Date(lastExportAt).getTime();
  return Math.floor(ms / 86400000);
}
