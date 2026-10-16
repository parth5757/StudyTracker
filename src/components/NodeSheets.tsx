import React, {useState} from 'react';
import {Alert, Text, View} from 'react-native';
import {Btn, Chip, Field, Sheet} from './ui';
import {useStore} from '../store/AppStore';
import {addDays, isValidKey, prettyDate, todayKey} from '../utils/date';
import {C} from '../theme';

export function EditNodeSheet({id, onClose}: {id: string; onClose: () => void}) {
  const {nodes, updateNode} = useStore();
  const node = nodes.find(n => n.id === id);
  const [name, setName] = useState(node?.name || '');
  const [emoji, setEmoji] = useState(node?.emoji || '');
  const [notes, setNotes] = useState(node?.notes || '');
  if (!node) {
    return null;
  }
  return (
    <Sheet
      title="Edit"
      onClose={onClose}
      footer={
        <Btn
          title="Save"
          disabled={!name.trim()}
          onPress={() => {
            updateNode(id, {name: name.trim(), emoji: emoji.trim().slice(0, 4), notes});
            onClose();
          }}
        />
      }>
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Emoji (optional)" value={emoji} onChangeText={setEmoji} placeholder="📐" />
      <Field label="Notes / resources / formulas" value={notes} onChangeText={setNotes} multiline style={{minHeight: 200}} placeholder="Write anything you want to remember about this topic…" />
    </Sheet>
  );
}

export function RescheduleSheet({id, onClose}: {id: string; onClose: () => void}) {
  const {nodes, setNextRevision} = useStore();
  const node = nodes.find(n => n.id === id);
  const [date, setDate] = useState(node?.nextRevision || addDays(todayKey(), 7));
  if (!node) {
    return null;
  }
  const apply = (d: string | null) => {
    setNextRevision(id, d);
    onClose();
  };
  return (
    <Sheet
      title="Reschedule revision"
      onClose={onClose}
      footer={
        <Btn
          title={`Set to ${isValidKey(date) ? prettyDate(date) : '…'}`}
          disabled={!isValidKey(date)}
          onPress={() => apply(date)}
        />
      }>
      <Text style={{color: C.sub, marginBottom: 12}}>
        Currently: {node.nextRevision ? prettyDate(node.nextRevision) : 'not scheduled'}
      </Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
        {[
          ['Today', 0],
          ['Tomorrow', 1],
          ['+3 days', 3],
          ['+1 week', 7],
          ['+2 weeks', 14],
          ['+1 month', 30],
        ].map(([label, d]) => (
          <Chip key={label as string} label={label as string} onPress={() => setDate(addDays(todayKey(), d as number))} />
        ))}
      </View>
      <Field label="Or type a date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
      {node.nextRevision ? (
        <Btn
          title="Remove from revision schedule"
          kind="danger"
          onPress={() =>
            Alert.alert('Remove schedule?', 'It will not appear in revisions until you learn/revise it again.', [
              {text: 'Cancel', style: 'cancel'},
              {text: 'Remove', style: 'destructive', onPress: () => apply(null)},
            ])
          }
        />
      ) : null}
    </Sheet>
  );
}
