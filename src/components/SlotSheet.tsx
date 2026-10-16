import React, {useState} from 'react';
import {Alert, Text, View} from 'react-native';
import {Btn, Chip, Field, Sheet} from './ui';
import {TopicPicker} from './TopicPicker';
import {useStore} from '../store/AppStore';
import {pathString} from '../store/tree';
import {WEEKDAYS, fromMin, normTime, toMin} from '../store/slots';
import {isValidKey, todayKey} from '../utils/date';
import {C} from '../theme';

const TIMES = ['06:00', '07:00', '09:00', '14:00', '18:00', '20:00', '21:30'];
const DURATIONS = [30, 45, 60, 90, 120, 180];

type Repeat = 'daily' | 'days' | 'once';

export function SlotSheet({slotId, onClose}: {slotId?: string; onClose: () => void}) {
  const {nodes, slots, addSlot, updateSlot} = useStore();
  const existing = slotId ? slots.find(s => s.id === slotId) : undefined;
  const [nodeId, setNodeId] = useState<string | null>(existing?.nodeId || null);
  const [title, setTitle] = useState(existing && !existing.nodeId ? existing.title : '');
  const [start, setStart] = useState(existing?.start || '20:00');
  const [minutes, setMinutes] = useState(String(existing?.minutes || 60));
  const [repeat, setRepeat] = useState<Repeat>(existing ? (existing.date ? 'once' : existing.days.length === 7 ? 'daily' : 'days') : 'daily');
  const [days, setDays] = useState<number[]>(existing && !existing.date && existing.days.length ? existing.days : [1, 2, 3, 4, 5]);
  const [date, setDate] = useState(existing?.date || todayKey());
  const [note, setNote] = useState(existing?.note || '');
  const [picking, setPicking] = useState(false);

  if (picking) {
    return (
      <TopicPicker
        title="Topic for this slot"
        mode="node"
        onClose={() => setPicking(false)}
        onSelect={id => {
          setNodeId(id);
          setPicking(false);
        }}
      />
    );
  }

  const shift = (delta: number) => {
    const t = normTime(start);
    setStart(fromMin((t ? toMin(t) : 0) + delta));
  };

  const save = () => {
    const t = normTime(start);
    if (!t) {
      Alert.alert('Check the time', 'Use 24-hour format like 07:30 or 21:00.');
      return;
    }
    if (!nodeId && !title.trim()) {
      Alert.alert('Choose a topic', 'Pick a topic, or type what you plan to do.');
      return;
    }
    if (repeat === 'once' && !isValidKey(date)) {
      Alert.alert('Check the date', 'Use YYYY-MM-DD.');
      return;
    }
    if (repeat === 'days' && days.length === 0) {
      Alert.alert('Pick days', 'Select at least one weekday.');
      return;
    }
    const payload = {
      nodeId,
      title: nodeId ? pathString(nodes, nodeId) : title.trim(),
      start: t,
      minutes: Math.min(720, Math.max(5, parseInt(minutes, 10) || 60)),
      days: repeat === 'once' ? [] : repeat === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : days,
      date: repeat === 'once' ? date : null,
      note,
    };
    if (existing) {
      updateSlot(existing.id, payload);
    } else {
      addSlot(payload);
    }
    onClose();
  };

  const toggleDay = (d: number) => setDays(days.includes(d) ? days.filter(x => x !== d) : [...days, d]);

  return (
    <Sheet title={existing ? 'Edit time slot' : 'New time slot'} onClose={onClose} footer={<Btn title="Save slot" onPress={save} />}>
      <Text style={lbl}>TOPIC</Text>
      <Btn
        title={nodeId ? pathString(nodes, nodeId) : 'Choose topic…'}
        kind="ghost"
        onPress={() => setPicking(true)}
        style={{alignItems: 'flex-start', marginBottom: 12}}
      />
      {!nodeId ? <Field label="Or describe the plan" value={title} onChangeText={setTitle} placeholder="e.g. Thesis paper reading" /> : null}

      <Text style={lbl}>START TIME (24h)</Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
        {TIMES.map(t => (
          <Chip key={t} label={t} active={start === t} onPress={() => setStart(t)} />
        ))}
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
        <Btn title="−30m" small kind="soft" onPress={() => shift(-30)} />
        <View style={{flex: 1, marginHorizontal: 8}}>
          <Field value={start} onChangeText={setStart} placeholder="HH:MM" keyboardType="numbers-and-punctuation" style={{textAlign: 'center', fontSize: 20, fontWeight: '800'}} />
        </View>
        <Btn title="+30m" small kind="soft" onPress={() => shift(30)} />
      </View>

      <Text style={lbl}>DURATION (MINUTES)</Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
        {DURATIONS.map(m => (
          <Chip key={m} label={String(m)} active={minutes === String(m)} onPress={() => setMinutes(String(m))} />
        ))}
      </View>
      <Field value={minutes} onChangeText={t => setMinutes(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />

      <Text style={lbl}>REPEAT</Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
        <Chip label="Every day" active={repeat === 'daily'} onPress={() => setRepeat('daily')} />
        <Chip label="Selected days" active={repeat === 'days'} onPress={() => setRepeat('days')} />
        <Chip label="Only once" active={repeat === 'once'} onPress={() => setRepeat('once')} />
      </View>
      {repeat === 'days' ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8}}>
          {[1, 2, 3, 4, 5, 6, 0].map(d => (
            <Chip key={d} label={WEEKDAYS[d]} active={days.includes(d)} onPress={() => toggleDay(d)} />
          ))}
        </View>
      ) : null}
      {repeat === 'once' ? <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" /> : null}

      <Field label="Note (optional)" value={note} onChangeText={setNote} multiline style={{minHeight: 60}} placeholder="e.g. Solve 10 problems from chapter 3" />
    </Sheet>
  );
}

const lbl = {fontSize: 12, fontWeight: '700' as const, color: C.sub, marginBottom: 6, marginTop: 4};
