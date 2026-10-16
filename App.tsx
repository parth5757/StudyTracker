import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, AppState, BackHandler, StatusBar, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppStoreProvider, useStore} from './src/store/AppStore';
import {NavContext, LogPrefill} from './src/nav';
import {LogSheet} from './src/components/LogSheet';
import {TimerBanner, TimerScreen} from './src/components/TimerScreen';
import {TopicPicker} from './src/components/TopicPicker';
import {TimerState, loadTimer, newTimer, saveTimer} from './src/store/timer';
import {pathString} from './src/store/tree';
import {TodayScreen} from './src/screens/TodayScreen';
import {LibraryScreen} from './src/screens/LibraryScreen';
import {PlanScreen} from './src/screens/PlanScreen';
import {JournalScreen} from './src/screens/JournalScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {parentOf} from './src/store/tree';
import {isAutoBackupDue, loadAutoState, runAutoBackup} from './src/store/autoBackup';
import {C} from './src/theme';

type Tab = 'today' | 'library' | 'plan' | 'journal' | 'backup';

const TABS: {key: Tab; icon: string; label: string}[] = [
  {key: 'today', icon: '🏠', label: 'Today'},
  {key: 'library', icon: '📚', label: 'Library'},
  {key: 'plan', icon: '📅', label: 'Plan'},
  {key: 'journal', icon: '📝', label: 'Journal'},
  {key: 'backup', icon: '💾', label: 'Backup'},
];

function Shell() {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const {ready, nodes} = store;
  const storeRef = useRef(store);
  storeRef.current = store;
  const autoBusy = useRef(false);
  const [tab, setTab] = useState<Tab>('today');
  const [libraryNode, setLibraryNode] = useState<string | null>(null);
  const [logPrefill, setLogPrefill] = useState<LogPrefill | null>(null);
  const [timer, setTimerState] = useState<TimerState | null>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [pickingTimer, setPickingTimer] = useState(false);
  const timerRef = useRef<TimerState | null>(null);
  timerRef.current = timer;

  const setTimer = useCallback((t: TimerState | null) => {
    timerRef.current = t;
    setTimerState(t);
    saveTimer(t);
  }, []);

  // restore a timer that was left running / paused when the app was closed
  useEffect(() => {
    loadTimer().then(t => {
      if (t) {
        setTimerState(t);
        timerRef.current = t;
      }
    });
  }, []);

  const startTimerFor = useCallback(
    (nodeId: string, slotId?: string) => {
      const n = storeRef.current.nodes;
      setTimer(newTimer(nodeId, pathString(n, nodeId), slotId));
      setTimerOpen(true);
    },
    [setTimer],
  );

  const nav = useMemo(
    () => ({
      openNode: (id: string | null) => {
        setLibraryNode(id);
        setTab('library');
      },
      openLog: (prefill?: LogPrefill) => setLogPrefill(prefill || {}),
      openTimer: (nodeId: string | null, slotId?: string) => {
        const cur = timerRef.current;
        if (cur) {
          setTimerOpen(true);
          if (nodeId && nodeId !== cur.nodeId) {
            Alert.alert('A timer is already in progress', 'Finish it (Complete) or discard it before starting a timer for another topic.');
          }
          return;
        }
        if (!nodeId) {
          setPickingTimer(true);
          return;
        }
        startTimerFor(nodeId, slotId);
      },
    }),
    [startTimerFor],
  );

  // Android back button: go up one level / back to Today, otherwise let the OS exit
  const onBack = useCallback(() => {
    if (tab === 'library' && libraryNode) {
      setLibraryNode(parentOf(nodes, libraryNode));
      return true;
    }
    if (tab !== 'today') {
      setTab('today');
      return true;
    }
    return false;
  }, [tab, libraryNode, nodes]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [onBack]);

  // Automatic daily backup (see Backup tab). Checked on start, every minute while open, and on app state changes.
  const checkAutoBackup = useCallback(async () => {
    const st = storeRef.current;
    if (!st.ready || autoBusy.current || !st.settings.autoBackupEnabled) {
      return;
    }
    autoBusy.current = true;
    try {
      const state = await loadAutoState();
      if (isAutoBackupDue(st.settings, state)) {
        await runAutoBackup(st.getData());
      }
    } catch (e) {
    } finally {
      autoBusy.current = false;
    }
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    checkAutoBackup();
    const timer = setInterval(checkAutoBackup, 60000);
    const sub = AppState.addEventListener('change', () => {
      // give the 400ms auto-save a moment to flush before snapshotting
      setTimeout(checkAutoBackup, 800);
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [ready, checkAutoBackup, store.settings.autoBackupEnabled, store.settings.autoBackupTime]);

  if (!ready) {
    return (
      <View style={[s.center, {backgroundColor: C.bg}]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <NavContext.Provider value={nav}>
      <View style={{flex: 1, backgroundColor: C.bg, paddingTop: insets.top}}>
        <View style={{flex: 1}}>
          {tab === 'today' && <TodayScreen goBackup={() => setTab('backup')} />}
          {tab === 'library' && <LibraryScreen nodeId={libraryNode} setNodeId={setLibraryNode} />}
          {tab === 'plan' && <PlanScreen />}
          {tab === 'journal' && <JournalScreen />}
          {tab === 'backup' && <SettingsScreen />}
        </View>

        {tab !== 'backup' ? (
          <TouchableOpacity
            style={[s.fab, {bottom: 74 + insets.bottom}]}
            activeOpacity={0.85}
            onPress={() => setLogPrefill(tab === 'library' && libraryNode ? {nodeId: libraryNode} : {})}>
            <Text style={s.fabText}>＋ Log</Text>
          </TouchableOpacity>
        ) : null}

        {timer && !timerOpen ? <TimerBanner timer={timer} onPress={() => setTimerOpen(true)} /> : null}

        <View style={[s.tabBar, {paddingBottom: 6 + insets.bottom}]}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={s.tab}
              onPress={() => {
                if (t.key === 'library' && tab === 'library') {
                  setLibraryNode(null);
                }
                setTab(t.key);
              }}>
              <Text style={{fontSize: 20, opacity: tab === t.key ? 1 : 0.5}}>{t.icon}</Text>
              <Text style={[s.tabLabel, tab === t.key && {color: C.primary}]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {pickingTimer ? (
          <TopicPicker
            title="Stopwatch: choose topic"
            mode="node"
            onClose={() => setPickingTimer(false)}
            onSelect={id => {
              setPickingTimer(false);
              if (id) {
                startTimerFor(id);
              }
            }}
          />
        ) : null}

        {timer && timerOpen ? <TimerScreen timer={timer} setTimer={setTimer} onMinimize={() => setTimerOpen(false)} /> : null}

        {logPrefill ? (
          <LogSheet
            initialNodeId={logPrefill.nodeId}
            initialKind={logPrefill.kind}
            initialMinutes={logPrefill.minutes}
            initialTitle={logPrefill.title}
            slotId={logPrefill.slotId}
            onClose={() => setLogPrefill(null)}
          />
        ) : null}
      </View>
    </NavContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AppStoreProvider>
        <Shell />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 6,
  },
  tab: {flex: 1, alignItems: 'center'},
  tabLabel: {fontSize: 11, fontWeight: '700', color: C.faint, marginTop: 1},
  fab: {
    position: 'absolute',
    right: 16,
    backgroundColor: C.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
  },
  fabText: {color: '#fff', fontWeight: '800', fontSize: 15},
});
