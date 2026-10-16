import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Btn, Field, Sheet} from './ui';
import {useStore} from '../store/AppStore';
import {childrenOf, pathOf, pathString} from '../store/tree';
import {C} from '../theme';

type Props = {
  title: string;
  mode: 'node' | 'parent'; // node: pick a topic; parent: pick a destination folder (for Move)
  excludeIds?: string[];
  onSelect: (id: string | null) => void;
  onClose: () => void;
};

export function TopicPicker({title, mode, excludeIds = [], onSelect, onClose}: Props) {
  const {nodes, addNode} = useStore();
  const [cur, setCur] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  const q = query.trim().toLowerCase();
  const searchHits = useMemo(() => {
    if (!q) {
      return [];
    }
    return nodes
      .filter(n => !excluded.has(n.id))
      .map(n => ({n, path: pathString(nodes, n.id)}))
      .filter(x => x.path.toLowerCase().includes(q))
      .slice(0, 40);
  }, [q, nodes, excluded]);

  const kids = childrenOf(nodes, cur).filter(n => !excluded.has(n.id));
  const crumbs = pathOf(nodes, cur);
  const hasKids = (id: string) => nodes.some(n => n.parentId === id);

  const create = () => {
    const names = newName
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean);
    if (!names.length) {
      return;
    }
    const ids = names.map(nm => addNode(cur, nm));
    setNewName('');
    if (mode === 'node' && ids.length === 1) {
      onSelect(ids[0]);
    }
  };

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        mode === 'parent' ? (
          <Btn
            title={cur ? `Move into “${crumbs[crumbs.length - 1]?.name}”` : 'Move to top level (as a Section)'}
            onPress={() => onSelect(cur)}
          />
        ) : cur ? (
          <Btn title={`Select “${crumbs[crumbs.length - 1]?.name}” itself`} kind="soft" onPress={() => onSelect(cur)} />
        ) : undefined
      }>
      <Field placeholder="🔍 Search all topics…" value={query} onChangeText={setQuery} />

      {q ? (
        searchHits.length ? (
          searchHits.map(({n, path}) => (
            <TouchableOpacity key={n.id} style={s.row} onPress={() => onSelect(n.id)}>
              <Text style={s.rowText}>{n.emoji ? n.emoji + ' ' : ''}{path}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={{color: C.faint, textAlign: 'center', marginTop: 20}}>No match. Clear the search to create a new topic.</Text>
        )
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
            <TouchableOpacity onPress={() => setCur(null)}>
              <Text style={s.crumb}>All sections</Text>
            </TouchableOpacity>
            {crumbs.map(c => (
              <TouchableOpacity key={c.id} onPress={() => setCur(c.id)}>
                <Text style={s.crumb}> › {c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {kids.length === 0 ? (
            <Text style={{color: C.faint, marginVertical: 14}}>Nothing here yet — add one below.</Text>
          ) : null}

          {kids.map(n => {
            const folder = hasKids(n.id);
            return (
              <View key={n.id} style={s.row}>
                <TouchableOpacity
                  style={{flex: 1}}
                  onPress={() => (folder || mode === 'parent' ? setCur(n.id) : onSelect(n.id))}>
                  <Text style={s.rowText}>
                    {n.emoji ? n.emoji + ' ' : ''}
                    {n.name}
                    {folder ? '  ›' : ''}
                  </Text>
                </TouchableOpacity>
                {mode === 'node' && folder ? (
                  <Btn title="Select" small kind="soft" onPress={() => onSelect(n.id)} />
                ) : null}
              </View>
            );
          })}

          <View style={{marginTop: 16}}>
            <Field
              label={mode === 'node' ? 'Create new here (one per line)' : 'Create new folder here (one per line)'}
              placeholder={cur ? 'e.g. Bayes theorem' : 'e.g. Quant Finance'}
              value={newName}
              onChangeText={setNewName}
              multiline
              style={{minHeight: 60}}
            />
            <Btn title={mode === 'node' ? 'Create & use' : 'Create'} kind="soft" onPress={create} disabled={!newName.trim()} />
          </View>
        </>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rowText: {fontSize: 15, color: C.text, fontWeight: '600'},
  crumb: {fontSize: 13, color: C.primary, fontWeight: '700', paddingVertical: 4},
});
