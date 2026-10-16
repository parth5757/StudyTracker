import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Alert} from 'react-native';
import {Btn, Card, Chip, Empty, SectionTitle} from '../components/ui';
import {SlotSheet} from '../components/SlotSheet';
import {ReportView} from './ReportView';
import {repeatLabel, slotRange, slotsOn} from '../store/slots';
import {useStore} from '../store/AppStore';
import {useNav} from '../nav';
import {dueOn, dueOnOrBefore, revisionCandidates} from '../store/stats';
import {pathString} from '../store/tree';
import {addDays, dayLabel, dayName, parseKey, shortDate, startOfWeek, todayKey} from '../utils/date';
import {C} from '../theme';

export function PlanScreen() {
  const [tab, setTab] = useState<'upcoming' | 'slots' | 'report'>('upcoming');
  return (
    <View style={{flex: 1}}>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', padding: 16, paddingBottom: 0}}>
        <Chip label="📅 Plan" active={tab === 'upcoming'} onPress={() => setTab('upcoming')} />
        <Chip label="⏰ Time slots" active={tab === 'slots'} onPress={() => setTab('slots')} />
        <Chip label="📊 Reports" active={tab === 'report'} onPress={() => setTab('report')} />
      </View>
      {tab === 'upcoming' ? <Upcoming /> : tab === 'slots' ? <SlotsManager /> : <ReportView />}
    </View>
  );
}

function Upcoming() {
  const {nodes, slots} = useStore();
  const {openNode} = useNav();
  const today = todayKey();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [selected, setSelected] = useState(today);

  const days = useMemo(() => Array.from({length: 7}, (_, i) => addDays(weekStart, i)), [weekStart]);
  const overdue = dueOnOrBefore(nodes, addDays(today, -1));
  const dayItems = selected === today ? dueOnOrBefore(nodes, today) : dueOn(nodes, selected);
  const later = revisionCandidates(nodes).filter(n => (n.nextRevision as string) > addDays(weekStart, 6)).length;

  return (
    <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 110}}>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
        <Btn title="‹" small kind="soft" onPress={() => setWeekStart(addDays(weekStart, -7))} />
        <Text style={{fontWeight: '800', color: C.text}}>
          {shortDate(days[0])} – {shortDate(days[6])}
        </Text>
        <Btn title="›" small kind="soft" onPress={() => setWeekStart(addDays(weekStart, 7))} />
      </View>

      <View style={{flexDirection: 'row', marginBottom: 12}}>
        {days.map(d => {
          const count = d === today ? dueOnOrBefore(nodes, today).length : dueOn(nodes, d).length;
          const active = d === selected;
          return (
            <TouchableOpacity
              key={d}
              onPress={() => setSelected(d)}
              style={[s.dayCell, active && {backgroundColor: C.primary}, d === today && !active && {borderColor: C.primary, borderWidth: 1.5}]}>
              <Text style={[s.dayName, active && {color: '#fff'}]}>{dayName(d)}</Text>
              <Text style={[s.dayNum, active && {color: '#fff'}]}>{parseKey(d).getDate()}</Text>
              <View style={[s.dot, {backgroundColor: count ? (active ? '#fff' : C.red) : 'transparent'}]}>
                <Text style={{fontSize: 10, fontWeight: '800', color: active ? C.primary : '#fff'}}>{count || ''}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {slotsOn(slots, selected).length ? (
        <>
          <SectionTitle>⏰ Planned study slots</SectionTitle>
          {slotsOn(slots, selected).map(sl => (
            <Card key={sl.id} style={{padding: 12}}>
              <Text style={{fontWeight: '800', color: C.primary}}>{slotRange(sl)}</Text>
              <Text style={{color: C.text, marginTop: 2}}>{sl.title}</Text>
            </Card>
          ))}
        </>
      ) : null}

      <SectionTitle>🔁 {dayLabel(selected)}{selected === today ? ' (includes overdue)' : ''}</SectionTitle>
      {dayItems.length === 0 ? (
        <Card>
          <Empty text="No revisions scheduled for this day." />
        </Card>
      ) : (
        dayItems.map(n => (
          <TouchableOpacity key={n.id} onPress={() => openNode(n.id)} activeOpacity={0.8}>
            <Card>
              <Text style={{fontSize: 15, fontWeight: '700', color: C.text}}>{n.emoji ? n.emoji + ' ' : ''}{n.name}</Text>
              <Text style={{fontSize: 12, color: C.faint, marginTop: 2}}>{pathString(nodes, n.id)}</Text>
              {(n.nextRevision as string) < today ? (
                <Text style={{color: C.red, fontSize: 12, marginTop: 4}}>Overdue since {shortDate(n.nextRevision as string)}</Text>
              ) : null}
            </Card>
          </TouchableOpacity>
        ))
      )}
      {selected !== today && overdue.length ? (
        <Text style={{color: C.red, marginTop: 4}}>⚠ {overdue.length} overdue item(s) are waiting on the Today tab.</Text>
      ) : null}
      {later ? <Text style={{color: C.sub, marginTop: 8}}>{later} more revision(s) scheduled after this week.</Text> : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  dayCell: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 8,
    marginRight: 5,
  },
  dayName: {fontSize: 11, color: C.sub, fontWeight: '700'},
  dayNum: {fontSize: 17, color: C.text, fontWeight: '800', marginVertical: 2},
  dot: {minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center'},
});

function SlotsManager() {
  const {slots, nodes, deleteSlot} = useStore();
  const [editing, setEditing] = useState<string | null | undefined>(undefined); // undefined = closed, null = new
  const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <View style={{flex: 1}}>
      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 110}}>
        <Text style={{color: C.sub, marginBottom: 12}}>
          Plan WHEN you will study each topic. Today's slots appear on the Today tab with a countdown.
        </Text>
        <Btn title="＋ Add time slot" onPress={() => setEditing(null)} style={{marginBottom: 12}} />
        {sorted.length === 0 ? (
          <Card>
            <Empty text="No time slots yet. Example: Probability · 20:00–21:00 · every day." />
          </Card>
        ) : (
          sorted.map(sl => {
            const node = sl.nodeId ? nodes.find(n => n.id === sl.nodeId) : null;
            return (
              <Card key={sl.id}>
                <Text style={{fontWeight: '800', color: C.primary}}>{slotRange(sl)} · {sl.minutes} min</Text>
                <Text style={{color: C.text, fontWeight: '700', marginTop: 2}}>{node ? pathString(nodes, node.id) : sl.title}</Text>
                <Text style={{color: C.sub, fontSize: 12, marginTop: 2}}>{repeatLabel(sl)}</Text>
                {sl.note ? <Text style={{color: C.sub, marginTop: 4}}>{sl.note}</Text> : null}
                <View style={{flexDirection: 'row', marginTop: 10}}>
                  <Btn title="✏️ Edit" small kind="soft" style={{marginRight: 8}} onPress={() => setEditing(sl.id)} />
                  <Btn
                    title="🗑 Delete"
                    small
                    kind="danger"
                    onPress={() =>
                      Alert.alert('Delete this slot?', 'Logged study history is not affected.', [
                        {text: 'Cancel', style: 'cancel'},
                        {text: 'Delete', style: 'destructive', onPress: () => deleteSlot(sl.id)},
                      ])
                    }
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
      {editing !== undefined ? <SlotSheet slotId={editing || undefined} onClose={() => setEditing(undefined)} /> : null}
    </View>
  );
}
