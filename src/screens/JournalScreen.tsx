import React, {useMemo, useState} from 'react';
import {Alert, SectionList, Text, TouchableOpacity, View} from 'react-native';
import {Card, Chip, Empty, Field} from '../components/ui';
import {useStore} from '../store/AppStore';
import {useNav} from '../nav';
import {dayLabel, fmtMinutes} from '../utils/date';
import {C} from '../theme';
import {LogKind} from '../types';

const ICON = {learn: '📖', revise: '🔁', practice: '🛠'} as const;

export function JournalScreen() {
  const {logs, deleteLog} = useStore();
  const {openNode} = useNav();
  const [filter, setFilter] = useState<LogKind | 'all'>('all');
  const [q, setQ] = useState('');

  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = logs
      .filter(l => filter === 'all' || l.kind === filter)
      .filter(l => !needle || (l.nodePath + ' ' + l.note).toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const groups: {title: string; total: number; data: typeof list}[] = [];
    list.forEach(l => {
      const last = groups[groups.length - 1];
      if (last && last.title === l.date) {
        last.data.push(l);
        last.total += l.minutes;
      } else {
        groups.push({title: l.date, total: l.minutes, data: [l]});
      }
    });
    return groups;
  }, [logs, filter, q]);

  return (
    <View style={{flex: 1}}>
      <View style={{padding: 16, paddingBottom: 0}}>
        <Text style={{fontSize: 30, fontWeight: '900', color: C.text, marginBottom: 10}}>Journal</Text>
        <Field placeholder="🔍 Search notes & topics" value={q} onChangeText={setQ} />
        <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
          <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="📖 Learned" active={filter === 'learn'} onPress={() => setFilter('learn')} />
          <Chip label="🔁 Revised" active={filter === 'revise'} onPress={() => setFilter('revise')} />
          <Chip label="🛠 Practice" active={filter === 'practice'} onPress={() => setFilter('practice')} />
        </View>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={l => l.id}
        contentContainerStyle={{padding: 16, paddingBottom: 110}}
        ListEmptyComponent={<Empty text="No entries yet. Use “＋ Log” to record what you studied." />}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({section}) => (
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 6}}>
            <Text style={{fontWeight: '800', color: C.text}}>{dayLabel(section.title)}</Text>
            <Text style={{color: C.sub}}>{fmtMinutes(section.total)}</Text>
          </View>
        )}
        renderItem={({item: l}) => (
          <Card style={{marginBottom: 8}}>
            <View style={{flexDirection: 'row'}}>
              <Text style={{fontSize: 18, marginRight: 10}}>{ICON[l.kind]}</Text>
              <View style={{flex: 1}}>
                <TouchableOpacity disabled={!l.nodeId} onPress={() => openNode(l.nodeId)}>
                  <Text style={{fontWeight: '700', color: C.text}}>{l.nodePath || 'Untitled'}</Text>
                </TouchableOpacity>
                {l.note ? <Text style={{color: C.sub, marginTop: 2}}>{l.note}</Text> : null}
                {l.minutes ? <Text style={{color: C.faint, fontSize: 12, marginTop: 4}}>{fmtMinutes(l.minutes)}</Text> : null}
              </View>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Delete entry?', 'This removes the log entry only.', [
                    {text: 'Cancel', style: 'cancel'},
                    {text: 'Delete', style: 'destructive', onPress: () => deleteLog(l.id)},
                  ])
                }>
                <Text style={{color: C.faint, fontSize: 16, padding: 4}}>🗑</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
