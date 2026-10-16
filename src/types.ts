export type NodeItem = {
  id: string;
  parentId: string | null; // null => top-level Section
  name: string;
  emoji: string;
  notes: string;
  order: number;
  createdAt: string; // ISO datetime
  learnedOn: string | null; // YYYY-MM-DD (first time learned)
  lastRevised: string | null; // YYYY-MM-DD
  nextRevision: string | null; // YYYY-MM-DD
  stage: number; // successful revision streak (used by "spaced" mode)
  revisionCount: number;
  confidence: number | null; // 1..5
  revisionPaused: boolean;
};

export type LogKind = 'learn' | 'revise' | 'practice';

export type LogEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: LogKind;
  nodeId: string | null;
  nodePath: string; // snapshot, so history survives deletes
  minutes: number;
  note: string;
  createdAt: string;
};

// A planned study time-slot. Recurring on `days` (0=Sun..6=Sat) unless `date` is set (one-off).
export type Slot = {
  id: string;
  nodeId: string | null;
  title: string; // path snapshot or free text
  start: string; // HH:MM (24h)
  minutes: number;
  days: number[];
  date: string | null;
  doneDates: string[];
  note: string;
};

export type RevisionMode = 'weekly' | 'spaced';

export type Settings = {
  revisionMode: RevisionMode;
  weeklyDays: number; // interval used in weekly mode
  spacedIntervals: number[]; // days, used in spaced mode
  dailyGoalMinutes: number;
  backupReminderDays: number;
  lastExportAt: string | null;
  autoBackupEnabled: boolean;
  autoBackupTime: string; // HH:MM
};

export type AppData = {
  nodes: NodeItem[];
  logs: LogEntry[];
  slots: Slot[];
  settings: Settings;
};

export type Rating = 'forgot' | 'okay' | 'easy';

export const DEFAULT_SETTINGS: Settings = {
  revisionMode: 'weekly',
  weeklyDays: 7,
  spacedIntervals: [7, 14, 30, 60, 90],
  dailyGoalMinutes: 180,
  backupReminderDays: 7,
  lastExportAt: null,
  autoBackupEnabled: false,
  autoBackupTime: '23:00',
};
