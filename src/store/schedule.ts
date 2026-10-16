import {NodeItem, Rating, Settings} from '../types';
import {addDays} from '../utils/date';

const CONF: Record<Rating, number> = {forgot: 1, okay: 3, easy: 5};

function spacedInterval(settings: Settings, stage: number): number {
  const list = settings.spacedIntervals.length ? settings.spacedIntervals : [7];
  return list[Math.min(Math.max(stage, 0), list.length - 1)];
}

// Interval (days) to wait before the very first revision after learning.
export function firstInterval(settings: Settings): number {
  return settings.revisionMode === 'weekly'
    ? settings.weeklyDays
    : spacedInterval(settings, 0);
}

export function scheduleAfterLearn(node: NodeItem, date: string, settings: Settings): NodeItem {
  if (node.learnedOn) {
    return node;
  }
  return {
    ...node,
    learnedOn: date,
    stage: 0,
    nextRevision: node.revisionPaused ? null : addDays(date, firstInterval(settings)),
  };
}

export function scheduleAfterRevise(
  node: NodeItem,
  rating: Rating,
  date: string,
  settings: Settings,
): NodeItem {
  let stage = node.stage;
  let interval: number;
  if (rating === 'forgot') {
    stage = 0;
    interval = Math.min(3, settings.revisionMode === 'weekly' ? settings.weeklyDays : spacedInterval(settings, 0));
  } else if (settings.revisionMode === 'weekly') {
    stage = stage + 1;
    interval = settings.weeklyDays;
  } else {
    stage = stage + (rating === 'easy' ? 2 : 1);
    interval = spacedInterval(settings, stage);
  }
  return {
    ...node,
    learnedOn: node.learnedOn || date,
    lastRevised: date,
    stage,
    revisionCount: node.revisionCount + 1,
    confidence: CONF[rating],
    nextRevision: node.revisionPaused ? null : addDays(date, interval),
  };
}

export function ratingHint(settings: Settings, rating: Rating): string {
  if (rating === 'forgot') {
    return 'Again in 3 days';
  }
  if (settings.revisionMode === 'weekly') {
    return `Again in ${settings.weeklyDays} days`;
  }
  return 'Longer gap next time';
}
