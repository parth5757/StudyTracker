import {Settings} from '../types';
import {addDays, todayKey} from '../utils/date';
import {minutesOfDay, toMin} from './slots';

export type AutoState = {
  lastDate: string | null; // day of the last successful auto backup
  lastName: string | null;
  lastAt: string | null;
  lastError: string | null;
  lastFailAt: number | null; // epoch ms, used to avoid retrying every minute
  lastCleanup: string | null;
  files: string[];
};

export const EMPTY_AUTO: AutoState = {
  lastDate: null,
  lastName: null,
  lastAt: null,
  lastError: null,
  lastFailAt: null,
  lastCleanup: null,
  files: [],
};

// Due when: enabled, and
//  - never backed up before, or
//  - at least one whole day was missed (app not opened), or
//  - today's backup time has passed and today's backup isn't done yet.
export function isAutoBackupDue(settings: Settings, state: AutoState, now: Date = new Date()): boolean {
  if (!settings.autoBackupEnabled) {
    return false;
  }
  if (state.lastFailAt && Date.now() - state.lastFailAt < 30 * 60 * 1000) {
    return false;
  }
  const today = todayKey();
  if (state.lastDate === today) {
    return false;
  }
  if (state.lastDate === null) {
    return true;
  }
  if (state.lastDate < addDays(today, -1)) {
    return true;
  }
  return minutesOfDay(now) >= toMin(settings.autoBackupTime);
}

