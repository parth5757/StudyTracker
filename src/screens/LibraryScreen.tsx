import React, {useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Badge, Bar, Btn, Card, Empty, Field, SectionTitle} from '../components/ui';
import {EditNodeSheet, RescheduleSheet} from '../components/NodeSheets';
import {TopicPicker} from '../components/TopicPicker';
import {useStore} from '../store/AppStore';
import {useNav} from '../nav';
import {sectionStreaks} from '../store/stats';
import {childLevelName, childrenOf, depthOf, descendantIds, levelName, pathOf, progressOf} from '../store/tree';
import {fmtMinutes, prettyDate, relativeDay, todayKey} from '../utils/date';
import {C, colorFor} from '../theme';

export function LibraryScreen({nodeId, setNodeId}: {nodeId: string | null; setNodeId: (id: string | null) => void}) {
  const {nodes, logs, addNode, deleteNode, moveNode, updateNode} = useStore();
  const {openLog, openTimer} = useNav();
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [moving, setMoving] = useState(false);

  const node = nodeId ? nodes.find(n => n.id === nodeId) || null : null;
  const kids = childrenOf(nodes, node ? node.id : null);
  const crumbs = pathOf(nodes, node ? node.id : null);
  const depth = node ? depthOf(nodes, node.id) : 0;
  const nextLevel = childLevelName(depth);

  const history = useMemo(() => {
    if (!node) {
      return [];
    }
    const ids = new Set([node.id, ...descendantIds(nodes, node.id)]);
    return logs
      .filter(l => l.nodeId && ids.has(l.nodeId))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 12);
  }, [node, nodes, logs]);

  const totalMinutes = useMemo(() => {
    if (!node) {
      return 0;
    }
    const ids = new Set([node.id, ...descendantIds(nodes, node.id)]);
    return logs.reduce((sum, l) => (l.nodeId && ids.has(l.nodeId) ? sum + l.minutes : sum), 0);
  }, [node, nodes, logs]);

  const addMany = () => {
    const names = adding
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean);
    names.forEach(nm => addNode(node ? node.id : null, nm));
    setAdding('');
  };

  const confirmDelete = () => {
    if (!node) {
      return;
    }
    const count = descendantIds(nodes, node.id).length;
    Alert.alert(
      `Delete “${node.name}”?`,
      count ? `This also deletes ${count} item(s) inside it. Log history is kept.` : 'Log history is kept.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const parent = node.parentId;
            deleteNode(node.id);
            setNodeId(parent);
          },
        },
      ],
    );
  };

  const streaks = useMemo(() => {
    const map = new Map<string, {current: number; best: number; doneToday: boolean}>();
    sectionStreaks(logs, nodes).forEach(x => map.set(x.root.id, x.info));
    return map;
  }, [logs, nodes]);
  const myStreak = node && depth === 1 ? streaks.get(node.id) : undefined;

  const prog = node ? progressOf(nodes, node.id) : null;
  const isLeaf = kids.length === 0;

  return (
    <View style={{flex: 1}}>
      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 110}} keyboardShouldPersistTaps="handled">
        {/* breadcrumb */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
          <TouchableOpacity onPress={() => setNodeId(null)}>
            <Text style={s.crumb}>📚 Library</Text>
          </TouchableOpacity>
          {crumbs.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setNodeId(c.id)}>
              <Text style={s.crumb}> › {c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {!node ? (
          <>
            <Text style={s.h1}>Library</Text>
            <Text style={{color: C.sub, marginBottom: 12}}>Sections → Topics → Sub-topics. Tap a section to open it.</Text>
          </>
        ) : (
          <Card>
            <Text style={s.kicker}>{levelName(depth).toUpperCase()}</Text>
            <Text style={s.title}>{node.emoji ? node.emoji + ' ' : ''}{node.name}</Text>
            {prog && prog.total > 0 ? (
              <View style={{marginTop: 8}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                  <Text style={{color: C.sub, fontSize: 12}}>{isLeaf ? 'Status' : 'Progress'}</Text>
                  <Text style={{color: C.sub, fontSize: 12}}>
                    {prog.learned}/{prog.total} learned · {fmtMinutes(totalMinutes)} total
                  </Text>
                </View>
                <Bar value={prog.learned} total={prog.total} color={C.green} />
              </View>
            ) : null}

            {myStreak ? (
              <View style={s.streakBox}>
                <Text style={{fontSize: 22, fontWeight: '900', color: myStreak.current ? C.amber : C.faint}}>{myStreak.current}🔥</Text>
                <View style={{marginLeft: 10, flex: 1}}>
                  <Text style={{fontWeight: '800', color: C.text}}>Section streak</Text>
                  <Text style={{color: C.sub, fontSize: 12}}>
                    Best {myStreak.best} day{myStreak.best === 1 ? '' : 's'} · {myStreak.doneToday ? 'studied today ✓' : myStreak.current ? 'study this section today to keep it' : 'log a session to start one'}
                  </Text>
                </View>
              </View>
            ) : null}

            {isLeaf ? (
              <View style={{marginTop: 12}}>
                <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                  {node.learnedOn ? (
                    <Badge label={`Learned ${prettyDate(node.learnedOn)}`} bg={C.greenSoft} fg={C.green} />
                  ) : (
                    <Badge label="Not started" bg={C.line} fg={C.sub} />
                  )}
                  {node.revisionPaused ? (
                    <View style={{marginLeft: 6}}>
                      <Badge label="Revision paused" bg={C.amberSoft} fg={C.amber} />
                    </View>
                  ) : null}
                </View>
                {node.learnedOn ? (
                  <View style={{marginTop: 10}}>
                    <Row k="Next revision" v={node.nextRevision ? `${prettyDate(node.nextRevision)} (${relativeDay(node.nextRevision)})` : 'not scheduled'} />
                    <Row k="Last revised" v={prettyDate(node.lastRevised)} />
                    <Row k="Revisions done" v={String(node.revisionCount)} />
                    <Row k="Confidence" v={node.confidence ? '★'.repeat(node.confidence) + '☆'.repeat(5 - node.confidence) : '—'} />
                  </View>
                ) : null}
                <View style={{flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 12}}>
                  {!node.learnedOn ? (
                    <Btn title="📖 Mark learned" small style={{marginRight: 8}} onPress={() => openLog({nodeId: node.id, kind: 'learn'})} />
                  ) : (
                    <Btn title="🔁 Revised" small style={{marginRight: 8}} onPress={() => openLog({nodeId: node.id, kind: 'revise'})} />
                  )}
                  <Btn title="⏱ Stopwatch" small kind="success" style={{marginRight: 8}} onPress={() => openTimer(node.id)} />
                  <Btn title="🛠 Log time" small kind="soft" style={{marginRight: 8}} onPress={() => openLog({nodeId: node.id, kind: 'practice'})} />
                  {node.learnedOn ? <Btn title="📅 Reschedule" small kind="soft" onPress={() => setRescheduling(true)} /> : null}
                </View>
              </View>
            ) : (
              <View style={{flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 12}}>
                <Btn title="⏱ Stopwatch" small kind="success" style={{marginRight: 8}} onPress={() => openTimer(node.id)} />
                <Btn title="🛠 Log time" small kind="soft" onPress={() => openLog({nodeId: node.id, kind: 'practice'})} />
              </View>
            )}

            {node.notes ? (
              <View style={s.notes}>
                <Text style={{color: C.text, lineHeight: 20}}>{node.notes}</Text>
              </View>
            ) : null}

            <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 12}}>
              <Btn title="✏️ Edit / notes" small kind="ghost" style={{marginRight: 8, marginBottom: 6}} onPress={() => setEditing(true)} />
              <Btn title="📂 Move" small kind="ghost" style={{marginRight: 8, marginBottom: 6}} onPress={() => setMoving(true)} />
              {isLeaf && node.learnedOn ? (
                <Btn
                  title={node.revisionPaused ? '▶ Resume revisions' : '⏸ Pause revisions'}
                  small
                  kind="ghost"
                  style={{marginRight: 8, marginBottom: 6}}
                  onPress={() => {
                    const pausing = !node.revisionPaused;
                    updateNode(node.id, {
                      revisionPaused: pausing,
                      nextRevision: pausing ? null : todayKey(),
                    });
                  }}
                />
              ) : null}
              <Btn title="🗑 Delete" small kind="danger" style={{marginBottom: 6}} onPress={confirmDelete} />
            </View>
          </Card>
        )}

        <SectionTitle>{node ? (kids.length ? `${nextLevel}s inside` : `Add ${nextLevel.toLowerCase()}s`) : 'Sections'}</SectionTitle>
        {kids.length === 0 && !node ? <Empty text="No sections yet. Add your first one below." /> : null}
        {kids.map((k, idx) => {
          const p = progressOf(nodes, k.id);
          const leaf = !nodes.some(n => n.parentId === k.id);
          const accent = colorFor(node ? depth : idx);
          return (
            <TouchableOpacity key={k.id} activeOpacity={0.8} onPress={() => setNodeId(k.id)}>
              <Card style={{borderLeftWidth: 4, borderLeftColor: accent}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={{flex: 1, fontSize: 16, fontWeight: '700', color: C.text}}>{k.emoji ? k.emoji + ' ' : ''}{k.name}</Text>
                  {!node && (streaks.get(k.id)?.current || 0) > 0 ? (
                    <Text style={{color: C.amber, fontWeight: '900', marginRight: 10}}>{streaks.get(k.id)?.current}🔥</Text>
                  ) : null}
                  {leaf ? (
                    k.learnedOn ? (
                      <Badge label={k.nextRevision ? `Revise ${relativeDay(k.nextRevision)}` : 'Learned'} bg={C.greenSoft} fg={C.green} />
                    ) : (
                      <Badge label="Not started" bg={C.line} fg={C.sub} />
                    )
                  ) : (
                    <Text style={{color: C.sub, fontSize: 12}}>{p.learned}/{p.total}</Text>
                  )}
                </View>
                {!leaf ? (
                  <View style={{marginTop: 8}}>
                    <Bar value={p.learned} total={p.total} color={accent} />
                  </View>
                ) : null}
              </Card>
            </TouchableOpacity>
          );
        })}

        <Card>
          <Field
            label={node ? `Add ${nextLevel.toLowerCase()} (one per line)` : 'Add section (one per line)'}
            value={adding}
            onChangeText={setAdding}
            multiline
            style={{minHeight: 60}}
            placeholder={node ? 'e.g. Bayes theorem' : 'e.g. Quant Finance'}
          />
          <Btn title="＋ Add" onPress={addMany} disabled={!adding.trim()} />
        </Card>

        {node && history.length ? (
          <>
            <SectionTitle>History</SectionTitle>
            {history.map(l => (
              <View key={l.id} style={s.hist}>
                <Text style={{color: C.faint, fontSize: 12, width: 62}}>{prettyDate(l.date).slice(0, 6)}</Text>
                <Text style={{flex: 1, color: C.text, fontSize: 13}} numberOfLines={2}>
                  {l.kind === 'learn' ? '📖' : l.kind === 'revise' ? '🔁' : '🛠'} {l.note || l.nodePath.split(' › ').pop()}
                </Text>
                <Text style={{color: C.sub, fontSize: 12}}>{l.minutes ? fmtMinutes(l.minutes) : ''}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      {editing && node ? <EditNodeSheet id={node.id} onClose={() => setEditing(false)} /> : null}
      {rescheduling && node ? <RescheduleSheet id={node.id} onClose={() => setRescheduling(false)} /> : null}
      {moving && node ? (
        <TopicPicker
          title={`Move “${node.name}” to…`}
          mode="parent"
          excludeIds={[node.id, ...descendantIds(nodes, node.id)]}
          onClose={() => setMoving(false)}
          onSelect={pid => {
            moveNode(node.id, pid);
            setMoving(false);
          }}
        />
      ) : null}
    </View>
  );
}

function Row({k, v}: {k: string; v: string}) {
  return (
    <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3}}>
      <Text style={{color: C.sub, fontSize: 13}}>{k}</Text>
      <Text style={{color: C.text, fontSize: 13, fontWeight: '600'}}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  h1: {fontSize: 30, fontWeight: '900', color: C.text, marginBottom: 4},
  crumb: {fontSize: 13, color: C.primary, fontWeight: '700', paddingVertical: 6},
  kicker: {fontSize: 11, fontWeight: '800', color: C.faint, letterSpacing: 1},
  title: {fontSize: 22, fontWeight: '900', color: C.text, marginTop: 2},
  streakBox: {flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: C.amberSoft, borderRadius: 12, padding: 10},
  notes: {marginTop: 12, backgroundColor: C.bg, padding: 12, borderRadius: 10},
  hist: {flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line},
});
