import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, BackHandler, StatusBar, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppStoreProvider, useStore} from './src/store/AppStore';
import {NavContext, LogPrefill} from './src/nav';
import {LogSheet} from './src/components/LogSheet';
import {TodayScreen} from './src/screens/TodayScreen';
import {LibraryScreen} from './src/screens/LibraryScreen';
import {PlanScreen} from './src/screens/PlanScreen';
import {JournalScreen} from './src/screens/JournalScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {parentOf} from './src/store/tree';
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
  const {ready, nodes} = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [libraryNode, setLibraryNode] = useState<string | null>(null);
  const [logPrefill, setLogPrefill] = useState<LogPrefill | null>(null);

  const nav = useMemo(
    () => ({
      openNode: (id: string | null) => {
        setLibraryNode(id);
        setTab('library');
      },
      openLog: (prefill?: LogPrefill) => setLogPrefill(prefill || {}),
    }),
    [],
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

        {logPrefill ? (
          <LogSheet
            initialNodeId={logPrefill.nodeId}
            initialKind={logPrefill.kind}
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
