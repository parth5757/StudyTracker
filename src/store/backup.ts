import {
  AppData,
  DEFAULT_SETTINGS,
  LogEntry,
  LogKind,
  NodeItem,
  RevisionMode,
  Settings,
  Slot,
} from '../types';
import {isValidKey} from '../utils/date';
import {newId} from '../utils/id';

export const BACKUP_APP = 'StudyTracker';
export const BACKUP_VERSION = 2;

export type ImportPreview = {
  data: AppData;
  warnings: string[];
  exportedAt: string | null;
  sections: number;
  topics: number;
  logs: number;
  slots: number;
};

export function serialize(data: AppData): string {
  const payload = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: data.settings,
    nodes: data.nodes,
    logs: data.logs,
    slots: data.slots,
  };
  return JSON.stringify(payload, null, 2);
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const dateOrNull = (v: unknown): string | null => (isValidKey(v) ? v : null);

export function sanitizeSettings(raw: any): Settings {
  const s: Settings = {...DEFAULT_SETTINGS};
  if (!raw || typeof raw !== 'object') {
    return s;
  }
  const mode: RevisionMode = raw.revisionMode === 'spaced' ? 'spaced' : 'weekly';
  s.revisionMode = mode;
  s.weeklyDays = Math.min(60, Math.max(1, Math.round(num(raw.weeklyDays, 7))));
  if (Array.isArray(raw.spacedIntervals)) {
    const arr = raw.spacedIntervals
      .map((x: unknown) => Math.round(num(x, 0)))
      .filter((x: number) => x >= 1 && x <= 365);
    if (arr.length) {
      s.spacedIntervals = arr;
    }
  }
  s.dailyGoalMinutes = Math.min(1440, Math.max(0, Math.round(num(raw.dailyGoalMinutes, 180))));
  s.backupReminderDays = Math.min(90, Math.max(1, Math.round(num(raw.backupReminderDays, 7))));
  s.lastExportAt = typeof raw.lastExportAt === 'string' ? raw.lastExportAt : null;
  s.autoBackupEnabled = raw.autoBackupEnabled === true;
  s.autoBackupTime = typeof raw.autoBackupTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.autoBackupTime) ? raw.autoBackupTime : '23:00';
  return s;
}

// Accepts flat nodes, or nodes with nested "children" arrays (handy for hand-written syllabi).
function flatten(rawNodes: any[], parentId: string | null, out: any[], depth = 0) {
  if (depth > 12) {
    return;
  }
  rawNodes.forEach((r, index) => {
    if (!r || typeof r !== 'object') {
      return;
    }
    const id = typeof r.id === 'string' && r.id ? r.id : newId('n');
    out.push({...r, id, parentId: parentId !== null ? parentId : r.parentId ?? null, __order: index});
    if (Array.isArray(r.children)) {
      flatten(r.children, id, out, depth + 1);
    }
  });
}

export function parseBackup(text: string): ImportPreview {
  let json: any;
  try {
    json = JSON.parse(text.replace(/^\uFEFF/, '').trim());
  } catch (e) {
    throw new Error('This is not valid JSON. Make sure you picked a Study Tracker backup file.');
  }
  if (Array.isArray(json)) {
    json = {nodes: json};
  }
  if (!json || typeof json !== 'object' || !Array.isArray(json.nodes)) {
    throw new Error('No "nodes" list found. This does not look like a Study Tracker backup.');
  }
  if (typeof json.version === 'number' && json.version > BACKUP_VERSION) {
    throw new Error(`Backup version ${json.version} is newer than this app understands.`);
  }

  const warnings: string[] = [];
  const flat: any[] = [];
  flatten(json.nodes, null, flat);

  const now = new Date().toISOString();
  const seen = new Set<string>();
  let nodes: NodeItem[] = [];
  let dupes = 0;
  flat.forEach((r, i) => {
    if (seen.has(r.id)) {
      dupes += 1;
      return;
    }
    seen.add(r.id);
    nodes.push({
      id: r.id,
      parentId: typeof r.parentId === 'string' && r.parentId ? r.parentId : null,
      name: str(r.name).trim() || 'Untitled',
      emoji: str(r.emoji).slice(0, 8),
      notes: str(r.notes),
      order: num(r.order, num(r.__order, i)),
      createdAt: typeof r.createdAt === 'string' && r.createdAt ? r.createdAt : now,
      learnedOn: dateOrNull(r.learnedOn),
      lastRevised: dateOrNull(r.lastRevised),
      nextRevision: dateOrNull(r.nextRevision),
      stage: Math.max(0, Math.round(num(r.stage, 0))),
      revisionCount: Math.max(0, Math.round(num(r.revisionCount, 0))),
      confidence:
        r.confidence === null || r.confidence === undefined
          ? null
          : Math.min(5, Math.max(1, Math.round(num(r.confidence, 3)))),
      revisionPaused: r.revisionPaused === true,
    });
  });
  if (dupes) {
    warnings.push(`${dupes} duplicate item id(s) were skipped.`);
  }

  // Fix missing parents + cycles -> move to top level
  const ids = new Set(nodes.map(n => n.id));
  let orphaned = 0;
  nodes = nodes.map(n => {
    if (n.parentId && (!ids.has(n.parentId) || n.parentId === n.id)) {
      orphaned += 1;
      return {...n, parentId: null};
    }
    return n;
  });
  const byId = new Map(nodes.map(n => [n.id, n]));
  let cycles = 0;
  nodes = nodes.map(n => {
    let cur: NodeItem | undefined = n;
    let steps = 0;
    while (cur && cur.parentId && steps < 60) {
      cur = byId.get(cur.parentId);
      steps += 1;
      if (cur && cur.id === n.id) {
        cycles += 1;
        return {...n, parentId: null};
      }
    }
    return n;
  });
  if (orphaned) {
    warnings.push(`${orphaned} item(s) had a missing parent and were moved to the top level.`);
  }
  if (cycles) {
    warnings.push(`${cycles} item(s) formed a loop and were moved to the top level.`);
  }

  const finalById = new Map(nodes.map(n => [n.id, n]));
  const pathFor = (id: string | null): string => {
    const parts: string[] = [];
    let cur = id ? finalById.get(id) : undefined;
    let guard = 0;
    while (cur && guard++ < 40) {
      parts.unshift(cur.name);
      cur = cur.parentId ? finalById.get(cur.parentId) : undefined;
    }
    return parts.join(' › ');
  };

  const kinds: LogKind[] = ['learn', 'revise', 'practice'];
  const logs: LogEntry[] = [];
  const logIds = new Set<string>();
  const rawLogs: any[] = Array.isArray(json.logs) ? json.logs : [];
  let badLogs = 0;
  rawLogs.forEach(r => {
    if (!r || typeof r !== 'object' || !isValidKey(r.date)) {
      badLogs += 1;
      return;
    }
    let id = typeof r.id === 'string' && r.id ? r.id : newId('l');
    if (logIds.has(id)) {
      id = newId('l');
    }
    logIds.add(id);
    const nodeId = typeof r.nodeId === 'string' && finalById.has(r.nodeId) ? r.nodeId : null;
    logs.push({
      id,
      date: r.date,
      kind: kinds.includes(r.kind) ? r.kind : 'learn',
      nodeId,
      nodePath: nodeId ? pathFor(nodeId) : str(r.nodePath),
      minutes: Math.max(0, Math.round(num(r.minutes, 0))),
      note: str(r.note),
      createdAt: typeof r.createdAt === 'string' && r.createdAt ? r.createdAt : now,
    });
  });
  if (badLogs) {
    warnings.push(`${badLogs} log entr${badLogs === 1 ? 'y was' : 'ies were'} skipped (invalid date).`);
  }

  const slots: Slot[] = [];
  const slotIds = new Set<string>();
  (Array.isArray(json.slots) ? json.slots : []).forEach((r: any) => {
    if (!r || typeof r !== 'object') {
      return;
    }
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(str(r.start).trim());
    if (!m) {
      return;
    }
    let id = typeof r.id === 'string' && r.id ? r.id : newId('s');
    if (slotIds.has(id)) {
      id = newId('s');
    }
    slotIds.add(id);
    const nodeId = typeof r.nodeId === 'string' && finalById.has(r.nodeId) ? r.nodeId : null;
    const days: number[] = Array.isArray(r.days)
      ? Array.from(new Set<number>(r.days.map((d: unknown) => Math.round(num(d, -1))).filter((d: number) => d >= 0 && d <= 6)))
      : [];
    const date = dateOrNull(r.date);
    slots.push({
      id,
      nodeId,
      title: nodeId ? pathFor(nodeId) : str(r.title).trim() || 'Study slot',
      start: `${m[1].padStart(2, '0')}:${m[2]}`,
      minutes: Math.min(720, Math.max(5, Math.round(num(r.minutes, 60)))),
      days: date ? [] : days.length ? days : [0, 1, 2, 3, 4, 5, 6],
      date,
      doneDates: Array.isArray(r.doneDates) ? r.doneDates.filter((d: unknown) => isValidKey(d)) : [],
      note: str(r.note),
    });
  });

  return {
    data: {nodes, logs, slots, settings: sanitizeSettings(json.settings)},
    warnings,
    exportedAt: typeof json.exportedAt === 'string' ? json.exportedAt : null,
    sections: nodes.filter(n => n.parentId === null).length,
    topics: nodes.length,
    logs: logs.length,
    slots: slots.length,
  };
}

// Merge: imported items replace local items with the same id; everything else is kept.
export function mergeData(current: AppData, incoming: AppData): AppData {
  const nodeMap = new Map(current.nodes.map(n => [n.id, n]));
  incoming.nodes.forEach(n => nodeMap.set(n.id, n));
  const logMap = new Map(current.logs.map(l => [l.id, l]));
  incoming.logs.forEach(l => logMap.set(l.id, l));
  const slotMap = new Map(current.slots.map(s => [s.id, s]));
  incoming.slots.forEach(s => slotMap.set(s.id, s));
  return {
    nodes: Array.from(nodeMap.values()),
    logs: Array.from(logMap.values()),
    slots: Array.from(slotMap.values()),
    settings: current.settings,
  };
}
