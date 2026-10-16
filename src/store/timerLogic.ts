// Pure stopwatch helpers. Time is derived from timestamps (not from counting ticks), so the
// stopwatch stays correct when the screen locks, the app is backgrounded, or the app restarts.
export type TimerState = {
  nodeId: string | null;
  title: string; // topic path snapshot (used if the topic is deleted meanwhile)
  slotId?: string; // set when started from a planned time slot
  accumulatedMs: number; // time counted before the current run
  runningSince: number | null; // epoch ms while running, null while paused/stopped
  createdAt: number;
};

export function newTimer(nodeId: string | null, title: string, slotId?: string): TimerState {
  return {nodeId, title, slotId, accumulatedMs: 0, runningSince: null, createdAt: Date.now()};
}

export function elapsedMs(t: TimerState, now: number = Date.now()): number {
  return t.accumulatedMs + (t.runningSince ? Math.max(0, now - t.runningSince) : 0);
}

export function startTimer(t: TimerState, now: number = Date.now()): TimerState {
  return t.runningSince ? t : {...t, runningSince: now};
}

export function pauseTimer(t: TimerState, now: number = Date.now()): TimerState {
  return t.runningSince ? {...t, accumulatedMs: elapsedMs(t, now), runningSince: null} : t;
}

export function resetTimer(t: TimerState): TimerState {
  return {...t, accumulatedMs: 0, runningSince: null};
}

export function fmtClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${p(h)}:${p(m)}:${p(s)}`;
}

// Minutes to log: rounded to the nearest minute, at least 1 once there is something to save.
export function minutesToLog(ms: number): number {
  return Math.max(1, Math.round(ms / 60000));
}

export function sanitizeTimer(raw: any): TimerState | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const acc = Number(raw.accumulatedMs);
  if (!Number.isFinite(acc) || acc < 0) {
    return null;
  }
  const since = raw.runningSince === null || raw.runningSince === undefined ? null : Number(raw.runningSince);
  return {
    nodeId: typeof raw.nodeId === 'string' ? raw.nodeId : null,
    title: typeof raw.title === 'string' ? raw.title : 'Study session',
    slotId: typeof raw.slotId === 'string' ? raw.slotId : undefined,
    accumulatedMs: acc,
    runningSince: since !== null && Number.isFinite(since) ? since : null,
    createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
  };
}
