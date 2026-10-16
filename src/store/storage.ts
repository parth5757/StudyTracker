import ReactNativeBlobUtil from 'react-native-blob-util';
import {pick, keepLocalCopy, saveDocuments, types, errorCodes, isErrorWithCode} from '@react-native-documents/picker';
import {AppData, DEFAULT_SETTINGS} from '../types';
import {parseBackup, serialize} from './backup';
import {todayKey} from '../utils/date';

const fs = ReactNativeBlobUtil.fs;
const DATA_PATH = `${fs.dirs.DocumentDir}/study-tracker-data.json`;
const TMP_PATH = `${DATA_PATH}.tmp`;
const SNAPSHOT_PATH = `${fs.dirs.DocumentDir}/study-tracker-before-import.json`;

export const EMPTY_DATA: AppData = {nodes: [], logs: [], slots: [], settings: DEFAULT_SETTINGS};

async function readIfExists(path: string): Promise<string | null> {
  try {
    if (await fs.exists(path)) {
      return await fs.readFile(path, 'utf8');
    }
  } catch (e) {}
  return null;
}

// Returns null if nothing has ever been saved (first launch).
export async function loadData(): Promise<AppData | null> {
  for (const path of [DATA_PATH, TMP_PATH]) {
    const text = await readIfExists(path);
    if (text) {
      try {
        return parseBackup(text).data;
      } catch (e) {}
    }
  }
  return null;
}

// Write to a temp file first, then swap, so a crash can never leave a half-written data file.
export async function saveData(data: AppData): Promise<void> {
  await fs.writeFile(TMP_PATH, serialize(data), 'utf8');
  if (await fs.exists(DATA_PATH)) {
    await fs.unlink(DATA_PATH);
  }
  await fs.mv(TMP_PATH, DATA_PATH);
}

export async function saveSnapshot(data: AppData): Promise<void> {
  await fs.writeFile(SNAPSHOT_PATH, serialize(data), 'utf8');
}

export async function loadSnapshot(): Promise<AppData | null> {
  const text = await readIfExists(SNAPSHOT_PATH);
  if (!text) {
    return null;
  }
  try {
    return parseBackup(text).data;
  } catch (e) {
    return null;
  }
}

export async function hasSnapshot(): Promise<boolean> {
  try {
    return await fs.exists(SNAPSHOT_PATH);
  } catch (e) {
    return false;
  }
}

function backupName(): string {
  return `study-tracker-backup-${todayKey()}.json`;
}

// "Save as…" dialog – user chooses Downloads / Drive / any folder. Returns false if cancelled.
export async function exportViaSaveDialog(data: AppData): Promise<boolean> {
  const name = backupName();
  const tmp = `${fs.dirs.CacheDir}/${name}`;
  await fs.writeFile(tmp, serialize(data), 'utf8');
  try {
    await saveDocuments({
      sourceUris: [encodeURI(`file://${tmp}`)],
      mimeType: 'application/json',
      fileName: name,
    });
    return true;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return false;
    }
    throw e;
  }
}

// One tap: drops the file into Downloads/StudyTracker/ (Android 10+).
export async function exportToDownloads(data: AppData): Promise<string> {
  const name = backupName();
  const tmp = `${fs.dirs.CacheDir}/${name}`;
  await fs.writeFile(tmp, serialize(data), 'utf8');
  await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
    {name, parentFolder: 'StudyTracker', mimeType: 'application/json'},
    'Download',
    tmp,
  );
  return `Downloads/StudyTracker/${name}`;
}

// Opens the system file picker and returns the file text, or null if cancelled.
export async function pickBackupText(): Promise<string | null> {
  try {
    const [file] = await pick({type: [types.allFiles]});
    const copies = await keepLocalCopy({
      files: [{uri: file.uri, fileName: file.name || 'import.json'}],
      destination: 'cachesDirectory',
    });
    const first = copies[0];
    if (first.status !== 'success') {
      throw new Error(first.copyError || 'Could not read the selected file.');
    }
    const path = decodeURI(first.localUri.replace(/^file:\/\//, ''));
    return await fs.readFile(path, 'utf8');
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw e;
  }
}
