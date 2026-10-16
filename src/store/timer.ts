import ReactNativeBlobUtil from 'react-native-blob-util';
import {TimerState, sanitizeTimer} from './timerLogic';

export * from './timerLogic';

const fs = ReactNativeBlobUtil.fs;
const TIMER_PATH = `${fs.dirs.DocumentDir}/study-tracker-timer.json`;

export async function loadTimer(): Promise<TimerState | null> {
  try {
    if (await fs.exists(TIMER_PATH)) {
      return sanitizeTimer(JSON.parse(await fs.readFile(TIMER_PATH, 'utf8')));
    }
  } catch (e) {}
  return null;
}

// null clears the saved timer
export async function saveTimer(t: TimerState | null): Promise<void> {
  try {
    if (t === null) {
      if (await fs.exists(TIMER_PATH)) {
        await fs.unlink(TIMER_PATH);
      }
    } else {
      await fs.writeFile(TIMER_PATH, JSON.stringify(t), 'utf8');
    }
  } catch (e) {}
}
