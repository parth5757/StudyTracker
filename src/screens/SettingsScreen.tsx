import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, Share, Text, ToastAndroid, View} from 'react-native';
import {Btn, Card, Chip, Field, SectionTitle, Sheet} from '../components/ui';
import {useStore} from '../store/AppStore';
import {ImportPreview, parseBackup, serialize} from '../store/backup';
import {exportToDownloads, exportViaSaveDialog, hasSnapshot, pickBackupText} from '../store/storage';
import {AUTO_FOLDER_LABEL, AutoState, EMPTY_AUTO, loadAutoState, runAutoBackup} from '../store/autoBackup';
import {normTime} from '../store/slots';
import {prettyDate} from '../utils/date';
import {C} from '../theme';

const toast = (m: string) => ToastAndroid.show(m, ToastAndroid.LONG);

export function SettingsScreen() {
  const store = useStore();
  const {settings, setSettings, nodes, logs} = store;
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [hasSnap, setHasSnap] = useState(false);
  const [weekly, setWeekly] = useState(String(settings.weeklyDays));
  const [spaced, setSpaced] = useState(settings.spacedIntervals.join(', '));
  const [goal, setGoal] = useState(String(settings.dailyGoalMinutes));
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState<AutoState>(EMPTY_AUTO);
  const [autoTime, setAutoTime] = useState(settings.autoBackupTime);

  const refreshAuto = () => loadAutoState().then(setAuto);
  useEffect(() => {
    refreshAuto();
  }, []);

  const saveAutoTime = () => {
    const tm = normTime(autoTime);
    if (!tm) {
      Alert.alert('Check the time', 'Use 24-hour format, e.g. 23:00.');
      return;
    }
    setAutoTime(tm);
    setSettings({autoBackupTime: tm});
    toast(`Auto backup time set to ${tm}`);
  };

  const doAutoNow = () =>
    run(async () => {
      const st = await runAutoBackup(store.getData());
      setAuto(st);
      if (st.lastError) {
        Alert.alert('Auto backup failed', st.lastError);
      } else {
        Alert.alert('Backup saved ✅', `${AUTO_FOLDER_LABEL}/${st.lastName}`);
      }
    });

  useEffect(() => {
    hasSnapshot().then(setHasSnap);
  }, [preview]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      Alert.alert('Something went wrong', e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const tryParse = (text: string) => {
    try {
      setPreview(parseBackup(text));
      return true;
    } catch (e: any) {
      Alert.alert('Cannot import', e.message);
      return false;
    }
  };

  const doDownloads = () =>
    run(async () => {
      const where = await exportToDownloads(store.getData());
      store.markExported();
      Alert.alert('Backup saved ✅', `Saved to ${where}`);
    });

  const doSaveAs = () =>
    run(async () => {
      const ok = await exportViaSaveDialog(store.getData());
      if (ok) {
        store.markExported();
        toast('Backup saved');
      }
    });

  const doShare = () =>
    run(async () => {
      await Share.share({title: 'Study Tracker backup', message: serialize(store.getData())});
      store.markExported();
    });

  const doPick = () =>
    run(async () => {
      const text = await pickBackupText();
      if (text !== null) {
        tryParse(text);
      }
    });

  const saveRevisionSettings = () => {
    const w = Math.min(60, Math.max(1, parseInt(weekly, 10) || 7));
    const arr = spaced
      .split(/[ ,]+/)
      .map(x => parseInt(x, 10))
      .filter(x => x >= 1 && x <= 365);
    setSettings({
      weeklyDays: w,
      spacedIntervals: arr.length ? arr : [7, 14, 30, 60, 90],
      dailyGoalMinutes: Math.max(0, parseInt(goal, 10) || 0),
    });
    toast('Settings saved. New schedule applies from the next revision.');
  };

  const confirmImport = (mode: 'replace' | 'merge') => {
    if (!preview) {
      return;
    }
    const go = async () => {
      await store.importData(preview.data, mode);
      setPreview(null);
      setPasting(false);
      setPasteText('');
      toast(`Imported ${preview.topics} items & ${preview.logs} log entries`);
    };
    if (mode === 'replace') {
      Alert.alert(
        'Replace everything?',
        'All current data on this phone will be replaced by the file. A safety copy is kept, so you can undo from this screen.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Replace', style: 'destructive', onPress: () => run(go)},
        ],
      );
    } else {
      run(go);
    }
  };

  const [mode, setMode] = useState<'replace' | 'merge'>('replace');

  return (
    <View style={{flex: 1}}>
      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 60}} keyboardShouldPersistTaps="handled">
        <Text style={{fontSize: 30, fontWeight: '900', color: C.text, marginBottom: 4}}>Backup & Settings</Text>
        <Text style={{color: C.sub, marginBottom: 12}}>
          {nodes.length} items · {logs.length} log entries · last backup {settings.lastExportAt ? prettyDate(settings.lastExportAt.slice(0, 10)) : 'never'}
        </Text>

        <Card>
          <Text style={s.h}>⬆️ Export (backup)</Text>
          <Text style={s.p}>Saves everything — sections, topics, schedule, notes and history — as one JSON file.</Text>
          <Btn title="Save to Downloads/StudyTracker" onPress={doDownloads} disabled={busy} style={{marginBottom: 8}} />
          <Btn title="Save as… (choose location / Drive)" kind="soft" onPress={doSaveAs} disabled={busy} style={{marginBottom: 8}} />
          <Btn title="Share as text (WhatsApp, Gmail, Keep…)" kind="ghost" onPress={doShare} disabled={busy} />
        </Card>

        <Card>
          <Text style={s.h}>🌙 Automatic daily backup</Text>
          <Text style={s.p}>
            Saves one backup file per day to {AUTO_FOLDER_LABEL} (it stays even if you uninstall the app) and deletes the earlier
            days' files. Runs when the app is open or goes to the background after the set time — Android does not let apps run
            silently at midnight — and catches up the next time you open the app.
          </Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            <Chip label="Off" active={!settings.autoBackupEnabled} onPress={() => setSettings({autoBackupEnabled: false})} />
            <Chip label="On" active={settings.autoBackupEnabled} onPress={() => setSettings({autoBackupEnabled: true})} />
          </View>
          <Field label="Backup time (24h, end of your day)" value={autoTime} onChangeText={setAutoTime} placeholder="23:00" keyboardType="numbers-and-punctuation" />
          <Btn title="Save time" kind="soft" onPress={saveAutoTime} style={{marginBottom: 8}} />
          <Btn title="Back up now (test)" kind="ghost" onPress={doAutoNow} disabled={busy} />
          <Text style={[s.p, {marginTop: 10, marginBottom: 0}]}>
            {auto.lastName ? `Last auto backup: ${auto.lastName}` : 'No automatic backup made yet.'}
            {auto.lastCleanup ? `\n${auto.lastCleanup}` : ''}
            {auto.lastError ? `\n⚠ Last attempt failed: ${auto.lastError}` : ''}
          </Text>
        </Card>

        <Card>
          <Text style={s.h}>⬇️ Import (restore)</Text>
          <Text style={s.p}>Pick a backup JSON file. You will see a preview before anything changes.</Text>
          <Btn title="Import from JSON file" onPress={doPick} disabled={busy} style={{marginBottom: 8}} />
          <Btn title="Paste JSON text" kind="soft" onPress={() => setPasting(true)} disabled={busy} style={{marginBottom: hasSnap ? 8 : 0}} />
          {hasSnap ? (
            <Btn
              title="↩ Undo last import / erase"
              kind="ghost"
              disabled={busy}
              onPress={() =>
                Alert.alert('Restore the data from before the last import/erase?', 'Your current data will be replaced.', [
                  {text: 'Cancel', style: 'cancel'},
                  {
                    text: 'Restore',
                    onPress: () =>
                      run(async () => {
                        const ok = await store.restoreSnapshot();
                        toast(ok ? 'Previous data restored' : 'No safety copy found');
                      }),
                  },
                ])
              }
            />
          ) : null}
        </Card>

        <SectionTitle>Revision & goals</SectionTitle>
        <Card>
          <Text style={s.h}>Revision mode</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            <Chip label="Weekly (fixed)" active={settings.revisionMode === 'weekly'} onPress={() => setSettings({revisionMode: 'weekly'})} />
            <Chip label="Spaced (growing gaps)" active={settings.revisionMode === 'spaced'} onPress={() => setSettings({revisionMode: 'spaced'})} />
          </View>
          <Text style={s.p}>
            {settings.revisionMode === 'weekly'
              ? 'Every topic comes back every N days (default 7) until you pause it. “Forgot” brings it back in 3 days.'
              : 'Gaps grow after each successful revision, e.g. 7 → 14 → 30 → 60 → 90 days. “Forgot” resets it.'}
          </Text>
          <Field label="Weekly mode: days between revisions" value={weekly} onChangeText={setWeekly} keyboardType="number-pad" />
          <Field label="Spaced mode: gaps in days (comma separated)" value={spaced} onChangeText={setSpaced} />
          <Field label="Daily study goal (minutes, 0 = off)" value={goal} onChangeText={setGoal} keyboardType="number-pad" />
          <Btn title="Save settings" onPress={saveRevisionSettings} />
        </Card>

        <SectionTitle>Data</SectionTitle>
        <Card>
          <Btn
            title="Add starter template again"
            kind="soft"
            style={{marginBottom: 8}}
            onPress={() =>
              Alert.alert('Add starter template?', 'Adds the default sections (Math, ML, DL, NLP, CV, DSA, Thesis, AI for Health) next to your existing data.', [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Add', onPress: () => store.loadStarter()},
              ])
            }
          />
          <Btn
            title="Erase all data"
            kind="danger"
            onPress={() =>
              Alert.alert('Erase ALL data?', 'Export a backup first. A safety copy is kept so you can undo from this screen.', [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Erase', style: 'destructive', onPress: () => store.eraseAll()},
              ])
            }
          />
        </Card>
        <Text style={{color: C.faint, fontSize: 12, textAlign: 'center', marginTop: 8}}>
          Data lives only on this phone. Uninstalling the app removes it — keep exported backups.
        </Text>
      </ScrollView>

      {pasting && !preview ? (
        <Sheet
          title="Paste JSON"
          onClose={() => setPasting(false)}
          footer={<Btn title="Preview import" disabled={!pasteText.trim()} onPress={() => tryParse(pasteText)} />}>
          <Field value={pasteText} onChangeText={setPasteText} multiline style={{minHeight: 300}} placeholder='{"app":"StudyTracker","nodes":[…]}' autoCapitalize="none" autoCorrect={false} />
        </Sheet>
      ) : null}

      {preview ? (
        <Sheet
          title="Import preview"
          onClose={() => setPreview(null)}
          footer={<Btn title={mode === 'replace' ? 'Import & replace everything' : 'Import & merge'} onPress={() => confirmImport(mode)} disabled={busy} />}>
          <Card>
            <Text style={s.h}>This file contains</Text>
            <Text style={s.big}>{preview.sections} sections · {preview.topics} items total</Text>
            <Text style={s.big}>{preview.logs} log entries · {preview.slots} time slots</Text>
            {preview.exportedAt ? <Text style={s.p}>Exported {prettyDate(preview.exportedAt.slice(0, 10))}</Text> : null}
          </Card>
          {preview.warnings.length ? (
            <Card style={{backgroundColor: C.amberSoft}}>
              {preview.warnings.map(w => (
                <Text key={w} style={{color: C.text, marginBottom: 4}}>⚠ {w}</Text>
              ))}
            </Card>
          ) : null}
          <Text style={s.h}>How should it be imported?</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            <Chip label="Replace everything" active={mode === 'replace'} onPress={() => setMode('replace')} />
            <Chip label="Merge with current" active={mode === 'merge'} onPress={() => setMode('merge')} />
          </View>
          <Text style={s.p}>
            {mode === 'replace'
              ? 'Your phone will show exactly what is in the file (best for restoring a backup or moving to a new phone).'
              : 'Items from the file are added; items with the same id are updated from the file; your other current items stay.'}
          </Text>
        </Sheet>
      ) : null}
    </View>
  );
}

const s = {
  h: {fontSize: 15, fontWeight: '800' as const, color: C.text, marginBottom: 4},
  p: {fontSize: 13, color: C.sub, marginBottom: 12, marginTop: 4},
  big: {fontSize: 16, fontWeight: '700' as const, color: C.primary, marginTop: 4},
};
