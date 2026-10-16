import React, {useEffect, useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Badge, Bar, Btn, Card, Empty, SectionTitle} from '../components/ui';
import {useStore} from '../store/AppStore';
import {useNav} from '../nav';
import {dueOnOrBefore, minutesOn, overdueDays, streak, daysSinceExport, sectionStreaks} from '../store/stats';
import {clock12, minutesOfDay, slotRange, slotsOn, toMin} from '../store/slots';
import {pathString} from '../store/tree';
import {ratingHint} from '../store/schedule';
import {fmtMinutes, prettyDate, relativeDay, todayKey} from '../utils/date';
import {C} from '../theme';
import {Rating} from '../types';

function useNow(ms = 30000): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function leftText(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const KIND_ICON = {learn: '📖', revise: '🔁', practice: '🛠'} as const;

export function TodayScreen({goBackup}: {goBackup: () => void}) {
  const {nodes, logs, slots, settings, addLog, deleteLog, setSlotDone} = useStore();
  const {openNode, openLog, openTimer} = useNav();
  const today = todayKey();

  const due = dueOnOrBefore(nodes, today);
  const todayLogs = logs.filter(l => l.date === today).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const mins = minutesOn(logs, today);
  const sinceExport = daysSinceExport(settings.lastExportAt);
  const needBackup =
    nodes.length + logs.length > 0 && (sinceExport === null ? logs.length > 0 : sinceExport >= settings.backupReminderDays);

  const now = useNow();
  const nowMin = minutesOfDay(now);
  const minsLeft = Math.max(0, 1440 - nowMin - (now.getSeconds() > 0 ? 1 : 0));
  const todaySlots = slotsOn(slots, today);
  const plannedLeft = todaySlots
    .filter(sl => !sl.doneDates.includes(today) && toMin(sl.start) + sl.minutes > nowMin)
    .reduce((a, sl) => a + sl.minutes, 0);
  const nextSlot = todaySlots.find(sl => !sl.doneDates.includes(today) && toMin(sl.start) + sl.minutes > nowMin);
  const sStreaks = useMemo(() => sectionStreaks(logs, nodes), [logs, nodes]);

  const revise = (id: string, rating: Rating) => addLog({kind: 'revise', nodeId: id, rating, minutes: 0});

  return (
    <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 110}}>
      <Text style={s.date}>{prettyDate(today)}</Text>
      <Text style={s.h1}>Today</Text>

      {needBackup ? (
        <TouchableOpacity onPress={goBackup}>
          <Card style={{backgroundColor: C.amberSoft}}>
            <Text style={{color: C.amber, fontWeight: '800'}}>💾 Time to back up</Text>
            <Text style={{color: C.text, marginTop: 2}}>
              {sinceExport === null ? 'You have never exported a backup.' : `Last backup was ${sinceExport} day(s) ago.`} Tap to export your JSON.
            </Text>
          </Card>
        </TouchableOpacity>
      ) : null}

      <Card>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end'}}>
          <View>
            <Text style={{color: C.sub, fontSize: 12, fontWeight: '700'}}>⏳ TIME LEFT TODAY</Text>
            <Text style={{fontSize: 28, fontWeight: '900', color: C.text}}>{leftText(minsLeft)}</Text>
          </View>
          <Text style={{color: C.sub, fontSize: 12}}>{clock12(`${Math.floor(nowMin / 60)}:${('0' + (nowMin % 60)).slice(-2)}`)}</Text>
        </View>
        <View style={{marginTop: 8}}>
          <Bar value={nowMin} total={1440} color={minsLeft < 120 ? C.red : C.amber} />
        </View>
        <Text style={{color: C.sub, fontSize: 12, marginTop: 6}}>
          {nextSlot ? `Next slot: ${slotRange(nextSlot)} · ${nextSlot.title.split(' › ').pop()}` : todaySlots.length ? 'All planned slots done or past ✅' : 'No study slots planned today.'}
          {plannedLeft ? `  ·  ${leftText(plannedLeft)} planned left` : ''}
        </Text>
      </Card>

      <View style={s.statRow}>
        <Stat label="Revisions due" value={String(due.length)} color={due.length ? C.red : C.green} />
        <Stat label="Studied today" value={fmtMinutes(mins)} color={C.primary} />
        <Stat label="Day streak" value={`${streak(logs)}🔥`} color={C.amber} />
      </View>
      {settings.dailyGoalMinutes > 0 ? (
        <Card>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
            <Text style={{fontWeight: '700', color: C.text}}>Daily goal</Text>
            <Text style={{color: C.sub}}>
              {fmtMinutes(mins)} / {fmtMinutes(settings.dailyGoalMinutes)}
            </Text>
          </View>
          <Bar value={mins} total={settings.dailyGoalMinutes} color={mins >= settings.dailyGoalMinutes ? C.green : C.primary} />
        </Card>
      ) : null}

      <SectionTitle>🔥 Streak by section</SectionTitle>
      <Card>
        {sStreaks.length === 0 ? (
          <Empty text="Add sections in the Library to track a streak for each." />
        ) : (
          sStreaks.map(({root, info}) => (
            <View key={root.id} style={s.streakRow}>
              <Text style={{flex: 1, color: C.text, fontWeight: '600'}} numberOfLines={1}>
                {root.emoji ? root.emoji + ' ' : ''}{root.name}
              </Text>
              {info.doneToday ? <Text style={{color: C.green, fontSize: 12, marginRight: 8}}>✓ today</Text> : info.current > 0 ? <Text style={{color: C.amber, fontSize: 12, marginRight: 8}}>do today!</Text> : null}
              <Text style={{fontWeight: '900', color: info.current ? C.amber : C.faint, minWidth: 48, textAlign: 'right'}}>
                {info.current}🔥
              </Text>
              <Text style={{color: C.faint, fontSize: 11, minWidth: 56, textAlign: 'right'}}>best {info.best}</Text>
            </View>
          ))
        )}
      </Card>

      {todaySlots.length ? (
        <>
          <SectionTitle>⏰ Today's schedule</SectionTitle>
          {todaySlots.map(sl => {
            const done = sl.doneDates.includes(today);
            const st = toMin(sl.start);
            const active = nowMin >= st && nowMin < st + sl.minutes;
            const past = nowMin >= st + sl.minutes;
            return (
              <Card key={sl.id} style={done ? {opacity: 0.6} : undefined}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                  <Text style={{fontWeight: '800', color: C.primary, flex: 1}}>{slotRange(sl)}</Text>
                  {done ? (
                    <Badge label="Done ✓" bg={C.greenSoft} fg={C.green} />
                  ) : active ? (
                    <Badge label="NOW" bg={C.primarySoft} fg={C.primary} />
                  ) : past ? (
                    <Badge label="Missed" bg={C.redSoft} fg={C.red} />
                  ) : (
                    <Badge label={`in ${leftText(st - nowMin)}`} bg={C.blueSoft} fg={C.blue} />
                  )}
                </View>
                <Text style={{color: C.text, fontWeight: '700'}}>{sl.title}</Text>
                {sl.note ? <Text style={{color: C.sub, marginTop: 2}}>{sl.note}</Text> : null}
                <View style={{flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 10}}>
                  {!done ? (
                    <Btn
                      title="Log & done"
                      small
                      style={{marginRight: 8}}
                      onPress={() =>
                        openLog(
                          sl.nodeId
                            ? {nodeId: sl.nodeId, kind: 'learn', minutes: sl.minutes, slotId: sl.id}
                            : {kind: 'practice', minutes: sl.minutes, title: sl.title, slotId: sl.id},
                        )
                      }
                    />
                  ) : null}
                  {!done && sl.nodeId ? (
                    <Btn title="⏱ Timer" small kind="success" style={{marginRight: 8}} onPress={() => openTimer(sl.nodeId, sl.id)} />
                  ) : null}
                  <Btn title={done ? 'Undo' : '✓ Mark done'} small kind="soft" onPress={() => setSlotDone(sl.id, today, !done)} />
                </View>
              </Card>
            );
          })}
        </>
      ) : null}

      <SectionTitle>🔁 Revise today</SectionTitle>
      {due.length === 0 ? (
        <Card>
          <Empty text="Nothing to revise right now. Log what you learn and revisions get scheduled automatically." />
        </Card>
      ) : (
        due.map(n => {
          const od = overdueDays(n);
          return (
            <Card key={n.id}>
              <TouchableOpacity onPress={() => openNode(n.id)}>
                <Text style={s.topicName}>{n.emoji ? n.emoji + ' ' : ''}{n.name}</Text>
                <Text style={s.path} numberOfLines={1}>{pathString(nodes, n.id)}</Text>
              </TouchableOpacity>
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 10}}>
                <Badge label={relativeDay(n.nextRevision)} bg={od ? C.redSoft : C.blueSoft} fg={od ? C.red : C.blue} />
                <Text style={{color: C.faint, fontSize: 12, marginLeft: 8}}>
                  Revised {n.revisionCount}× · learned {prettyDate(n.learnedOn)}
                </Text>
              </View>
              <View style={{flexDirection: 'row'}}>
                <Btn title="😕 Forgot" small kind="danger" style={s.rateBtn} onPress={() => revise(n.id, 'forgot')} />
                <Btn title="🙂 Okay" small kind="soft" style={s.rateBtn} onPress={() => revise(n.id, 'okay')} />
                <Btn title="😎 Easy" small kind="success" style={s.rateBtn} onPress={() => revise(n.id, 'easy')} />
              </View>
              <Text style={{color: C.faint, fontSize: 11, marginTop: 6}}>
                Forgot: {ratingHint(settings, 'forgot')} · Okay/Easy: {ratingHint(settings, 'okay')}
              </Text>
            </Card>
          );
        })
      )}

      <SectionTitle>📝 Logged today</SectionTitle>
      {todayLogs.length === 0 ? (
        <Card>
          <Empty text="No entries yet today. Tap “＋ Log” to add what you studied." />
        </Card>
      ) : (
        todayLogs.map(l => (
          <Card key={l.id}>
            <View style={{flexDirection: 'row'}}>
              <Text style={{fontSize: 20, marginRight: 10}}>{KIND_ICON[l.kind]}</Text>
              <View style={{flex: 1}}>
                <TouchableOpacity disabled={!l.nodeId} onPress={() => openNode(l.nodeId)}>
                  <Text style={s.topicName}>{l.nodePath || 'Untitled'}</Text>
                </TouchableOpacity>
                {l.note ? <Text style={{color: C.sub, marginTop: 2}}>{l.note}</Text> : null}
                <Text style={{color: C.faint, fontSize: 12, marginTop: 4}}>{l.minutes ? fmtMinutes(l.minutes) : 'no time recorded'}</Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Delete entry?', 'This removes the log entry (not the topic).', [
                    {text: 'Cancel', style: 'cancel'},
                    {text: 'Delete', style: 'destructive', onPress: () => deleteLog(l.id)},
                  ])
                }>
                <Text style={{color: C.faint, fontSize: 18, padding: 4}}>🗑</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}
      <View style={{height: 8}} />
      <Btn title="⏱ Start stopwatch" kind="success" onPress={() => openTimer(null)} style={{marginBottom: 8}} />
      <Btn title="＋ Log what I studied" onPress={() => openLog()} />
    </ScrollView>
  );
}

function Stat({label, value, color}: {label: string; value: string; color: string}) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, {color}]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  date: {color: C.sub, fontWeight: '600', fontSize: 13},
  h1: {fontSize: 30, fontWeight: '900', color: C.text, marginBottom: 12},
  statRow: {flexDirection: 'row', marginBottom: 12},
  stat: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  statValue: {fontSize: 22, fontWeight: '900'},
  statLabel: {fontSize: 11, color: C.sub, fontWeight: '600', marginTop: 2, textAlign: 'center'},
  topicName: {fontSize: 16, fontWeight: '700', color: C.text},
  path: {fontSize: 12, color: C.faint, marginTop: 2},
  rateBtn: {flex: 1, marginRight: 8},
  streakRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line},
});
