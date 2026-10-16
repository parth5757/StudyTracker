import React, {useEffect, useState} from 'react';
import {Alert, BackHandler, ScrollView, StatusBar, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useStore} from '../store/AppStore';
import {TimerState, elapsedMs, fmtClock, minutesToLog, pauseTimer, resetTimer, startTimer} from '../store/timerLogic';
import {pathString} from '../store/tree';
import {ratingHint} from '../store/schedule';
import {LogKind, Rating} from '../types';
import {todayKey} from '../utils/date';

const BG = '#0E1020';
const PANEL = '#1B1F3B';
const ACCENT = '#6C63FF';

function useTick(active: boolean, ms = 200) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) {
      return;
    }
    const id = setInterval(() => setN(n => n + 1), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}

export function TimerScreen({
  timer,
  setTimer,
  onMinimize,
}: {
  timer: TimerState;
  setTimer: (t: TimerState | null) => void;
  onMinimize: () => void;
}) {
  const insets = useSafeAreaInsets();
  const {nodes, settings, addLog, setSlotDone} = useStore();
  const node = timer.nodeId ? nodes.find(n => n.id === timer.nodeId) || null : null;
  const isContainer = node ? nodes.some(n => n.parentId === node.id) : false;
  const [mode, setMode] = useState<'timer' | 'summary'>('timer');
  const [kind, setKind] = useState<LogKind>(node && !isContainer ? 'learn' : 'practice');
  const [rating, setRating] = useState<Rating>('okay');
  const [note, setNote] = useState('');

  const running = timer.runningSince !== null;
  useTick(running);
  const ms = elapsedMs(timer);
  const title = node ? pathString(nodes, node.id) : timer.title;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mode === 'summary') {
        setMode('timer');
      } else {
        onMinimize(); // the timer keeps running in the background
      }
      return true;
    });
    return () => sub.remove();
  }, [mode, onMinimize]);

  const reset = () => {
    if (ms < 1000) {
      return;
    }
    Alert.alert('Reset timer?', 'The elapsed time will be cleared back to 00:00:00.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Reset', style: 'destructive', onPress: () => setTimer(resetTimer(timer))},
    ]);
  };

  const complete = () => {
    if (ms < 10000) {
      Alert.alert('Nothing to save yet', 'Study for a little longer first, or use Reset / Discard.');
      return;
    }
    setTimer(pauseTimer(timer));
    setMode('summary');
  };

  const discard = () =>
    Alert.alert('Discard this session?', 'The time will NOT be saved.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setTimer(null);
          onMinimize();
        },
      },
    ]);

  const save = () => {
    const minutes = minutesToLog(elapsedMs(timer));
    const wasLearned = !!node?.learnedOn;
    addLog({
      kind: node ? kind : 'practice',
      nodeId: node ? node.id : null,
      freeTitle: node ? undefined : timer.title,
      minutes,
      date: todayKey(),
      note,
      rating,
    });
    if (timer.slotId) {
      setSlotDone(timer.slotId, todayKey(), true);
    }
    setTimer(null);
    onMinimize();
    ToastAndroid.show(
      node && kind === 'learn' && !wasLearned
        ? `Saved ${minutes} min · topic marked as learned ✅`
        : `Saved ${minutes} min study session ✅`,
      ToastAndroid.LONG,
    );
  };

  const status = ms === 0 && !running ? 'READY' : running ? 'RUNNING' : 'PAUSED';

  return (
    <View style={[StyleSheet.absoluteFill, {backgroundColor: BG, paddingTop: insets.top, paddingBottom: insets.bottom}]}>
      <StatusBar barStyle="light-content" />
      <View style={s.top}>
        <TouchableOpacity onPress={mode === 'summary' ? () => setMode('timer') : onMinimize} hitSlop={{top: 14, bottom: 14, left: 14, right: 14}}>
          <Text style={{color: '#fff', fontSize: 15, fontWeight: '700'}}>{mode === 'summary' ? '‹ Back' : '⌄ Minimize'}</Text>
        </TouchableOpacity>
        <Text style={s.status}>{status}</Text>
        <TouchableOpacity onPress={discard} hitSlop={{top: 14, bottom: 14, left: 14, right: 14}}>
          <Text style={{color: '#FF7A7A', fontSize: 14, fontWeight: '700'}}>Discard</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.topic} numberOfLines={3}>{title}</Text>

      {mode === 'timer' ? (
        <View style={{flex: 1, justifyContent: 'space-between'}}>
          <View style={{flex: 1, justifyContent: 'center'}}>
            <Text style={[s.clock, running && {color: '#fff'}, !running && ms > 0 && {color: '#FFD479'}]} numberOfLines={1} adjustsFontSizeToFit>
              {fmtClock(ms)}
            </Text>
            <Text style={s.hint}>
              {running ? 'Keep going — you can lock the screen, time keeps counting.' : ms > 0 ? 'Paused. Resume when you are ready.' : 'Tap Start when you begin studying.'}
            </Text>
          </View>

          <View style={{paddingHorizontal: 20, paddingBottom: 24}}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 22}}>
              <TouchableOpacity
                onPress={reset}
                disabled={ms < 1000}
                activeOpacity={0.8}
                style={[s.roundSm, {opacity: ms < 1000 ? 0.3 : 1}]}>
                <Text style={s.roundSmText}>↺{'\n'}Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setTimer(running ? pauseTimer(timer) : startTimer(timer))}
                style={[s.roundBig, {backgroundColor: running ? '#F59E0B' : ACCENT}]}>
                <Text style={s.roundBigText}>{running ? '❚❚' : '▶'}</Text>
                <Text style={s.roundBigLabel}>{running ? 'Pause' : ms > 0 ? 'Resume' : 'Start'}</Text>
              </TouchableOpacity>

              <View style={[s.roundSm, {backgroundColor: 'transparent'}]} />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={complete}
              style={[s.complete, ms < 10000 && {opacity: 0.45}]}>
              <Text style={s.completeText}>✓ Complete</Text>
              <Text style={{color: '#D1FADF', fontSize: 12, marginTop: 2}}>
                {node && !isContainer && !node.learnedOn ? 'Saves the time and marks this topic as learned' : 'Saves the time as a study session'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={{flex: 1}} contentContainerStyle={{padding: 20}} keyboardShouldPersistTaps="handled">
          <View style={s.panel}>
            <Text style={{color: '#9AA0C8', fontSize: 12, fontWeight: '700'}}>TIME STUDIED</Text>
            <Text style={{color: '#fff', fontSize: 40, fontWeight: '900', fontVariant: ['tabular-nums']}}>{fmtClock(ms)}</Text>
            <Text style={{color: '#9AA0C8', marginTop: 2}}>Will be saved as {minutesToLog(ms)} min</Text>
          </View>

          {node ? (
            <>
              <Text style={s.label}>SAVE AS</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                <Pill label="📖 Learned" active={kind === 'learn'} onPress={() => setKind('learn')} />
                <Pill label="🔁 Revised" active={kind === 'revise'} onPress={() => setKind('revise')} />
                <Pill label="🛠 Practice" active={kind === 'practice'} onPress={() => setKind('practice')} />
              </View>
              {kind === 'learn' && !node.learnedOn ? (
                <Text style={{color: '#8FE3B0', marginBottom: 10}}>This topic will be marked as learned and its first revision scheduled.</Text>
              ) : null}
              {kind === 'revise' ? (
                <>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                    <Pill label="😕 Forgot" active={rating === 'forgot'} onPress={() => setRating('forgot')} />
                    <Pill label="🙂 Okay" active={rating === 'okay'} onPress={() => setRating('okay')} />
                    <Pill label="😎 Easy" active={rating === 'easy'} onPress={() => setRating('easy')} />
                  </View>
                  <Text style={{color: '#9AA0C8', marginBottom: 10}}>{ratingHint(settings, rating)}</Text>
                </>
              ) : null}
            </>
          ) : null}

          <Text style={s.label}>NOTES (OPTIONAL)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="What did you learn? Doubts, key takeaways…"
            placeholderTextColor="#6B7098"
            style={s.input}
          />

          <TouchableOpacity activeOpacity={0.85} onPress={save} style={[s.complete, {marginTop: 8}]}>
            <Text style={s.completeText}>Save session</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('timer')} style={{alignItems: 'center', padding: 16}}>
            <Text style={{color: '#9AA0C8', fontWeight: '700'}}>Back to stopwatch</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function Pill({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: active ? ACCENT : PANEL,
      }}>
      <Text style={{color: '#fff', fontWeight: '700', fontSize: 13}}>{label}</Text>
    </TouchableOpacity>
  );
}

// Small bar shown above the tab bar while a timer exists but the full screen is minimised.
export function TimerBanner({timer, onPress}: {timer: TimerState; onPress: () => void}) {
  useTick(true, 1000);
  const running = timer.runningSince !== null;
  const {nodes} = useStore();
  const node = timer.nodeId ? nodes.find(n => n.id === timer.nodeId) : null;
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[b.bar, {backgroundColor: running ? ACCENT : '#4B4F7A'}]}>
      <Text style={b.time}>⏱ {fmtClock(elapsedMs(timer))}</Text>
      <Text style={b.name} numberOfLines={1}>
        {running ? 'Running' : 'Paused'} · {node ? node.name : timer.title}
      </Text>
      <Text style={b.open}>Open ›</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  top: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14},
  status: {color: '#9AA0C8', fontWeight: '800', letterSpacing: 2, fontSize: 12},
  topic: {color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', paddingHorizontal: 24, marginTop: 18},
  clock: {color: '#6B7098', fontSize: 84, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'], paddingHorizontal: 16},
  hint: {color: '#8A90B8', textAlign: 'center', marginTop: 10, paddingHorizontal: 32},
  roundBig: {width: 132, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center', marginHorizontal: 24, elevation: 6},
  roundBigText: {color: '#fff', fontSize: 38, fontWeight: '900'},
  roundBigLabel: {color: '#fff', fontWeight: '800', marginTop: 2},
  roundSm: {width: 72, height: 72, borderRadius: 36, backgroundColor: PANEL, alignItems: 'center', justifyContent: 'center'},
  roundSmText: {color: '#fff', textAlign: 'center', fontWeight: '700', fontSize: 12},
  complete: {backgroundColor: '#16A34A', borderRadius: 16, paddingVertical: 16, alignItems: 'center'},
  completeText: {color: '#fff', fontSize: 18, fontWeight: '900'},
  panel: {backgroundColor: PANEL, borderRadius: 16, padding: 16, marginBottom: 18, alignItems: 'center'},
  label: {color: '#9AA0C8', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 6},
  input: {backgroundColor: PANEL, borderRadius: 12, color: '#fff', padding: 12, minHeight: 110, textAlignVertical: 'top', fontSize: 15, marginBottom: 14},
});

const b = StyleSheet.create({
  bar: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14},
  time: {color: '#fff', fontWeight: '900', fontSize: 15, fontVariant: ['tabular-nums'], marginRight: 10},
  name: {color: '#E6E8FF', flex: 1, fontSize: 13},
  open: {color: '#fff', fontWeight: '800'},
});
