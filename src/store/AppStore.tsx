import React, {createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef} from 'react';
import {AppData, DEFAULT_SETTINGS, LogEntry, LogKind, NodeItem, Rating, Settings, Slot} from '../types';
import {EMPTY_DATA, loadData, saveData, saveSnapshot, loadSnapshot} from './storage';
import {buildStarterNodes} from './seed';
import {mergeData} from './backup';
import {descendantIds, pathString} from './tree';
import {scheduleAfterLearn, scheduleAfterRevise} from './schedule';
import {newId} from '../utils/id';
import {todayKey, isValidKey} from '../utils/date';

type State = {ready: boolean; data: AppData};

export type LogInput = {
  kind: LogKind;
  nodeId: string | null;
  date?: string;
  minutes?: number;
  note?: string;
  rating?: Rating;
  freeTitle?: string; // used when no node selected
};

type Action =
  | {type: 'LOADED'; data: AppData}
  | {type: 'REPLACE'; data: AppData}
  | {type: 'ADD_NODE'; node: NodeItem}
  | {type: 'UPDATE_NODE'; id: string; patch: Partial<NodeItem>}
  | {type: 'DELETE_NODE'; id: string}
  | {type: 'MOVE_NODE'; id: string; parentId: string | null}
  | {type: 'ADD_LOG'; input: LogInput; id: string}
  | {type: 'DELETE_LOG'; id: string}
  | {type: 'ADD_SLOT'; slot: Slot}
  | {type: 'UPDATE_SLOT'; id: string; patch: Partial<Slot>}
  | {type: 'DELETE_SLOT'; id: string}
  | {type: 'SLOT_DONE'; id: string; date: string; done: boolean}
  | {type: 'SETTINGS'; patch: Partial<Settings>};

function reducer(state: State, action: Action): State {
  const {data} = state;
  switch (action.type) {
    case 'LOADED':
      return {ready: true, data: action.data};
    case 'REPLACE':
      return {ready: true, data: action.data};
    case 'ADD_NODE':
      return {...state, data: {...data, nodes: [...data.nodes, action.node]}};
    case 'UPDATE_NODE':
      return {
        ...state,
        data: {...data, nodes: data.nodes.map(n => (n.id === action.id ? {...n, ...action.patch} : n))},
      };
    case 'DELETE_NODE': {
      const remove = new Set([action.id, ...descendantIds(data.nodes, action.id)]);
      return {
        ...state,
        data: {
          ...data,
          nodes: data.nodes.filter(n => !remove.has(n.id)),
          // keep history; it still shows the saved path text
          logs: data.logs.map(l => (l.nodeId && remove.has(l.nodeId) ? {...l, nodeId: null} : l)),
          slots: data.slots.map(s => (s.nodeId && remove.has(s.nodeId) ? {...s, nodeId: null} : s)),
        },
      };
    }
    case 'MOVE_NODE': {
      const siblings = data.nodes.filter(n => n.parentId === action.parentId);
      const order = siblings.length ? Math.max(...siblings.map(s => s.order)) + 1 : 0;
      return {
        ...state,
        data: {
          ...data,
          nodes: data.nodes.map(n => (n.id === action.id ? {...n, parentId: action.parentId, order} : n)),
        },
      };
    }
    case 'ADD_LOG': {
      const i = action.input;
      const date = i.date && isValidKey(i.date) ? i.date : todayKey();
      let nodes = data.nodes;
      let nodePath = i.freeTitle || '';
      if (i.nodeId) {
        const target = data.nodes.find(n => n.id === i.nodeId);
        if (target) {
          nodePath = pathString(data.nodes, i.nodeId);
          let updated = target;
          if (i.kind === 'learn') {
            updated = scheduleAfterLearn(target, date, data.settings);
          } else if (i.kind === 'revise') {
            updated = scheduleAfterRevise(target, i.rating || 'okay', date, data.settings);
          }
          if (updated !== target) {
            nodes = data.nodes.map(n => (n.id === target.id ? updated : n));
          }
        }
      }
      const log: LogEntry = {
        id: action.id,
        date,
        kind: i.kind,
        nodeId: i.nodeId,
        nodePath,
        minutes: Math.max(0, Math.round(i.minutes || 0)),
        note: (i.note || '').trim(),
        createdAt: new Date().toISOString(),
      };
      return {...state, data: {...data, nodes, logs: [...data.logs, log]}};
    }
    case 'DELETE_LOG':
      return {...state, data: {...data, logs: data.logs.filter(l => l.id !== action.id)}};
    case 'ADD_SLOT':
      return {...state, data: {...data, slots: [...data.slots, action.slot]}};
    case 'UPDATE_SLOT':
      return {...state, data: {...data, slots: data.slots.map(s => (s.id === action.id ? {...s, ...action.patch} : s))}};
    case 'DELETE_SLOT':
      return {...state, data: {...data, slots: data.slots.filter(s => s.id !== action.id)}};
    case 'SLOT_DONE':
      return {
        ...state,
        data: {
          ...data,
          slots: data.slots.map(s => {
            if (s.id !== action.id) {
              return s;
            }
            const rest = s.doneDates.filter(d => d !== action.date);
            return {...s, doneDates: action.done ? [...rest, action.date] : rest};
          }),
        },
      };
    case 'SETTINGS':
      return {...state, data: {...data, settings: {...data.settings, ...action.patch}}};
    default:
      return state;
  }
}

type Store = {
  ready: boolean;
  nodes: NodeItem[];
  logs: LogEntry[];
  slots: Slot[];
  settings: Settings;
  addSlot: (slot: Omit<Slot, 'id' | 'doneDates'>) => void;
  updateSlot: (id: string, patch: Partial<Slot>) => void;
  deleteSlot: (id: string) => void;
  setSlotDone: (id: string, date: string, done: boolean) => void;
  addNode: (parentId: string | null, name: string, emoji?: string) => string;
  updateNode: (id: string, patch: Partial<NodeItem>) => void;
  deleteNode: (id: string) => void;
  moveNode: (id: string, parentId: string | null) => void;
  addLog: (input: LogInput) => void;
  deleteLog: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setNextRevision: (id: string, date: string | null) => void;
  markExported: () => void;
  importData: (incoming: AppData, mode: 'replace' | 'merge') => Promise<void>;
  restoreSnapshot: () => Promise<boolean>;
  loadStarter: () => void;
  eraseAll: () => void;
  getData: () => AppData;
};

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({children}: {children: React.ReactNode}) {
  const [state, dispatch] = useReducer(reducer, {ready: false, data: EMPTY_DATA});
  const dataRef = useRef(state.data);
  dataRef.current = state.data;

  // initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      let loaded: AppData | null = null;
      try {
        loaded = await loadData();
      } catch (e) {}
      if (!alive) {
        return;
      }
      if (!loaded) {
        loaded = {nodes: buildStarterNodes(), logs: [], slots: [], settings: DEFAULT_SETTINGS};
      }
      dispatch({type: 'LOADED', data: loaded});
    })();
    return () => {
      alive = false;
    };
  }, []);

  // debounced auto-save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.ready) {
      return;
    }
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      saveData(dataRef.current).catch(() => {});
    }, 400);
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [state.data, state.ready]);

  const addNode = useCallback((parentId: string | null, name: string, emoji = '') => {
    const siblings = dataRef.current.nodes.filter(n => n.parentId === parentId);
    const node: NodeItem = {
      id: newId('n'),
      parentId,
      name: name.trim() || 'Untitled',
      emoji,
      notes: '',
      order: siblings.length ? Math.max(...siblings.map(s => s.order)) + 1 : 0,
      createdAt: new Date().toISOString(),
      learnedOn: null,
      lastRevised: null,
      nextRevision: null,
      stage: 0,
      revisionCount: 0,
      confidence: null,
      revisionPaused: false,
    };
    dispatch({type: 'ADD_NODE', node});
    return node.id;
  }, []);

  const store: Store = useMemo(
    () => ({
      ready: state.ready,
      nodes: state.data.nodes,
      logs: state.data.logs,
      slots: state.data.slots,
      settings: state.data.settings,
      addSlot: slot => dispatch({type: 'ADD_SLOT', slot: {...slot, id: newId('s'), doneDates: []}}),
      updateSlot: (id, patch) => dispatch({type: 'UPDATE_SLOT', id, patch}),
      deleteSlot: id => dispatch({type: 'DELETE_SLOT', id}),
      setSlotDone: (id, date, done) => dispatch({type: 'SLOT_DONE', id, date, done}),
      addNode,
      updateNode: (id, patch) => dispatch({type: 'UPDATE_NODE', id, patch}),
      deleteNode: id => dispatch({type: 'DELETE_NODE', id}),
      moveNode: (id, parentId) => dispatch({type: 'MOVE_NODE', id, parentId}),
      addLog: input => dispatch({type: 'ADD_LOG', input, id: newId('l')}),
      deleteLog: id => dispatch({type: 'DELETE_LOG', id}),
      setSettings: patch => dispatch({type: 'SETTINGS', patch}),
      setNextRevision: (id, date) =>
        dispatch({type: 'UPDATE_NODE', id, patch: {nextRevision: date}}),
      markExported: () =>
        dispatch({type: 'SETTINGS', patch: {lastExportAt: new Date().toISOString()}}),
      importData: async (incoming, mode) => {
        // safety copy of whatever is on the phone right now
        await saveSnapshot(dataRef.current).catch(() => {});
        const current = dataRef.current;
        const next =
          mode === 'merge'
            ? mergeData(current, incoming)
            : {...incoming, settings: {...incoming.settings, lastExportAt: current.settings.lastExportAt}};
        dispatch({type: 'REPLACE', data: next});
      },
      restoreSnapshot: async () => {
        const snap = await loadSnapshot();
        if (!snap) {
          return false;
        }
        dispatch({type: 'REPLACE', data: snap});
        return true;
      },
      loadStarter: () => {
        const current = dataRef.current;
        dispatch({type: 'REPLACE', data: {...current, nodes: [...current.nodes, ...buildStarterNodes()]}});
      },
      eraseAll: () => {
        saveSnapshot(dataRef.current).catch(() => {});
        dispatch({type: 'REPLACE', data: {nodes: [], logs: [], slots: [], settings: dataRef.current.settings}});
      },
      getData: () => dataRef.current,
    }),
    [state.ready, state.data, addNode],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) {
    throw new Error('useStore must be used inside AppStoreProvider');
  }
  return s;
}
