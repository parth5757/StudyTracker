import React, {useMemo, useState} from 'react';
import {Alert, Text, View} from 'react-native';
import {Btn, Chip, Field, Sheet} from './ui';
import {useNav} from '../nav';
import {TopicPicker} from './TopicPicker';
import {useStore} from '../store/AppStore';
import {pathString} from '../store/tree';
import {firstInterval, ratingHint} from '../store/schedule';
import {LogKind, Rating} from '../types';
import {addDays, isValidKey, prettyDate, todayKey} from '../utils/date';
import {C} from '../theme';

const KINDS: {key: LogKind; label: string}[] = [
  {key: 'learn', label: '📖 Learned'},
  {key: 'revise', label: '🔁 Revised'},
  {key: 'practice', label: '🛠 Practice / Work'},
];
const MINUTES = [15, 30, 45, 60, 90, 120];

export function LogSheet({
  initialNodeId,
  initialKind,
  initialMinutes,
  initialTitle,
  slotId,
  onClose,
}: {
  initialNodeId?: string | null;
  initialKind?: LogKind;
  initialMinutes?: number;
  initialTitle?: string;
  slotId?: string;
  onClose: () => void;
}) {
  const {nodes, settings, addLog, setSlotDone} = useStore();
  const nav = useNav();
  const [kind, setKind] = useState<LogKind>(initialKind || 'learn');
  const [nodeId, setNodeId] = useState<string | null>(initialNodeId || null);
  const [title, setTitle] = useState(initialTitle || '');
  const [minutes, setMinutes] = useState(String(initialMinutes || 30));
  const [rating, setRating] = useState<Rating>('okay');
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState('');
  const [picking, setPicking] = useState(false);

  const node = useMemo(() => nodes.find(n => n.id === nodeId) || null, [nodes, nodeId]);
  const needsNode = kind !== 'practice';

  const save = () => {
    if (!isValidKey(date)) {
      Alert.alert('Check the date', 'Use the format YYYY-MM-DD, e.g. 2026-10-11.');
      return;
    }
    if (needsNode && !node) {
      Alert.alert('Choose a topic', 'Pick which topic you learned / revised so it can be scheduled.');
      return;
    }
    if (!node && !title.trim()) {
      Alert.alert('Add a title', 'Choose a topic or describe what you worked on.');
      return;
    }
    addLog({
      kind,
      nodeId: node ? node.id : null,
      freeTitle: node ? undefined : title.trim(),
      minutes: parseInt(minutes, 10) || 0,
      date,
      note,
      rating,
    });
    if (slotId) {
      setSlotDone(slotId, date, true);
    }
    onClose();
  };

  let info = '';
  if (kind === 'learn' && node && !node.learnedOn) {
    info = `First time learned → first revision on ${prettyDate(addDays(date, firstInterval(settings)))}.`;
  } else if (kind === 'learn' && node && node.learnedOn) {
    info = 'Already learned before — this just adds a study session to your history.';
  }

  if (picking) {
    return (
      <TopicPicker
        title="Choose topic"
        mode="node"
        onClose={() => setPicking(false)}
        onSelect={id => {
          setNodeId(id);
          setPicking(false);
        }}
      />
    );
  }

  return (
    <Sheet title="Log study" onClose={onClose} footer={<Btn title="Save entry" onPress={save} />}>
      <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
        {KINDS.map(k => (
          <Chip key={k.key} label={k.label} active={kind === k.key} onPress={() => setKind(k.key)} />
        ))}
      </View>

      <Text style={{fontSize: 12, fontWeight: '700', color: C.sub, marginTop: 8, marginBottom: 6}}>TOPIC</Text>
      <Btn
        title={node ? pathString(nodes, node.id) : 'Choose topic…'}
        kind="ghost"
        onPress={() => setPicking(true)}
        style={{alignItems: 'flex-start', marginBottom: 12}}
      />
      <Btn
        title="⏱ Use full-screen stopwatch instead"
        kind="soft"
        onPress={() => {
          onClose();
          nav.openTimer(node ? node.id : null, slotId);
        }}
        style={{marginBottom: 12}}
      />
      {!node && kind === 'practice' ? (
        <Field label="Or describe the work" placeholder="e.g. Solved 3 LeetCode graph problems" value={title} onChangeText={setTitle} />
      ) : null}
      {info ? <Text style={{color: C.primary, fontSize: 13, marginBottom: 12}}>{info}</Text> : null}

      {kind === 'revise' ? (
        <View style={{marginBottom: 8}}>
          <Text style={{fontSize: 12, fontWeight: '700', color: C.sub, marginBottom: 6}}>HOW DID IT GO?</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            <Chip label="😕 Forgot" active={rating === 'forgot'} color={C.red} onPress={() => setRating('forgot')} />
            <Chip label="🙂 Okay" active={rating === 'okay'} color={C.amber} onPress={() => setRating('okay')} />
            <Chip label="😎 Easy" active={rating === 'easy'} color={C.green} onPress={() => setRating('easy')} />
          </View>
          <Text style={{color: C.sub, fontSize: 12, marginBottom: 10}}>{ratingHint(settings, rating)}</Text>
        </View>
      ) : null}

      <Text style={{fontSize: 12, fontWeight: '700', color: C.sub, marginBottom: 6}}>TIME SPENT (MINUTES)</Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
        {MINUTES.map(m => (
          <Chip key={m} label={String(m)} active={minutes === String(m)} onPress={() => setMinutes(String(m))} />
        ))}
      </View>
      <Field value={minutes} onChangeText={t => setMinutes(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="0" />

      <Text style={{fontSize: 12, fontWeight: '700', color: C.sub, marginBottom: 6}}>DATE</Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
        <Chip label="Today" active={date === todayKey()} onPress={() => setDate(todayKey())} />
        <Chip label="Yesterday" active={date === addDays(todayKey(), -1)} onPress={() => setDate(addDays(todayKey(), -1))} />
      </View>
      <Field value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />

      <Field label="Notes (what you learned, doubts, links)" value={note} onChangeText={setNote} multiline placeholder="Key takeaways…" />
    </Sheet>
  );
}
