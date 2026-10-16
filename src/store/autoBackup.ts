import ReactNativeBlobUtil from 'react-native-blob-util';
import {AppData} from '../types';
import {serialize} from './backup';
import {todayKey} from '../utils/date';
import {AutoState, EMPTY_AUTO} from './autoBackupLogic';

export {isAutoBackupDue} from './autoBackupLogic';
export type {AutoState} from './autoBackupLogic';
export {EMPTY_AUTO} from './autoBackupLogic';

const fs = ReactNativeBlobUtil.fs;
const STATE_PATH = `${fs.dirs.DocumentDir}/study-tracker-autobackup.json`;
// Lands in: Downloads/StudyTracker/AutoBackup/  (survives uninstall)
export const AUTO_FOLDER = 'StudyTracker/AutoBackup';
export const AUTO_FOLDER_LABEL = 'Downloads/StudyTracker/AutoBackup';
const FILE_RE = /^StudyTracker-auto-(\d{4}-\d{2}-\d{2})(?: \(\d+\))?\.json$/;

export async function loadAutoState(): Promise<AutoState> {
  try {
    if (await fs.exists(STATE_PATH)) {
      const raw = JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
      return {...EMPTY_AUTO, ...raw};
    }
  } catch (e) {}
  return {...EMPTY_AUTO};
}

async function saveAutoState(s: AutoState): Promise<void> {
  try {
    await fs.writeFile(STATE_PATH, JSON.stringify(s), 'utf8');
  } catch (e) {}
}

export async function runAutoBackup(data: AppData): Promise<AutoState> {
  const state = await loadAutoState();
  const today = todayKey();
  const name = `StudyTracker-auto-${today}.json`;
  const dir = `${fs.dirs.DownloadDir}/${AUTO_FOLDER}`;
  const tmp = `${fs.dirs.CacheDir}/${name}`;
  try {
    await fs.writeFile(tmp, serialize(data), 'utf8');

    // if a file for today already exists (manual "back up now"), replace it instead of making "(1)"
    try {
      if (await fs.exists(`${dir}/${name}`)) {
        await fs.unlink(`${dir}/${name}`);
      }
    } catch (e) {}

    await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
      {name, parentFolder: AUTO_FOLDER, mimeType: 'application/json'},
      'Download',
      tmp,
    );

    // delete every auto-backup file from earlier days (yesterday and older)
    let candidates = [...state.files];
    try {
      candidates = candidates.concat(await fs.ls(dir));
    } catch (e) {}
    candidates = Array.from(new Set(candidates));
    const keep: string[] = [name];
    let failed = 0;
    let deleted = 0;
    for (const f of candidates) {
      const m = FILE_RE.exec(f);
      if (!m || m[1] >= today) {
        continue;
      }
      try {
        if (await fs.exists(`${dir}/${f}`)) {
          await fs.unlink(`${dir}/${f}`);
        }
        deleted += 1;
      } catch (e) {
        failed += 1;
        keep.push(f);
      }
    }
    const next: AutoState = {
      lastDate: today,
      lastName: name,
      lastAt: new Date().toISOString(),
      lastError: null,
      lastFailAt: null,
      lastCleanup: failed
        ? `${failed} old file(s) could not be deleted automatically — you can delete them manually.`
        : deleted
        ? `Deleted ${deleted} older backup file(s).`
        : null,
      files: keep,
    };
    await saveAutoState(next);
    return next;
  } catch (e: any) {
    const next: AutoState = {
      ...state,
      lastError: e?.message || String(e),
      lastFailAt: Date.now(),
    };
    await saveAutoState(next);
    return next;
  }
}
