import React, {useMemo, useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {Bar as ProgressBar, Btn, Card, Chip, Empty, SectionTitle} from '../components/ui';
import {BarChart} from '../components/BarChart';
import {useStore} from '../store/AppStore';
import {sectionNameOfLog, topicsDetail} from '../store/stats';
import {LogEntry} from '../types';
import {addDays, dayLabel, dayName, fmtMinutes, parseKey, shortDate, startOfWeek, todayKey, toKey} from '../utils/date';
import {C, colorFor} from '../theme';

type Period = 'week' | 'month' | 'year';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type Bucket = {key: string; label: string; title: string; isDay: boolean; logs: LogEntry[]};

function monthDays(anchor: string): string[] {
  const d = parseKey(anchor);
  const count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return Array.from({length: count}, (_, i) => toKey(new Date(first.getFullYear(), first.getMonth(), i + 1)));
}

function shiftAnchor(period: Period, anchor: string, dir: number): string {
  if (period === 'week') {
    return addDays(anchor, dir * 7);
  }
  const d = parseKey(anchor);
  if (period === 'month') {
    return toKey(new Date(d.getFullYear(), d.getMonth() + dir, 1));
  }
  return toKey(new Date(d.getFullYear() + dir, 0, 1));
}

export function ReportView() {
  const {nodes, logs, settings} = useStore();
  const today = todayKey();
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(today);
  const [selKey, setSelKey] = useState<string | null>(null);

  const {buckets, title, periodLogs} = useMemo(() => {
    const byDate = new Map<string, LogEntry[]>();
    logs.forEach(l => {
      const arr = byDate.get(l.date) || [];
      arr.push(l);
      byDate.set(l.date, arr);
    });
    let list: Bucket[] = [];
    let ttl = '';
    if (period === 'week') {
      const start = startOfWeek(anchor);
      list = Array.from({length: 7}, (_, i) => {
        const k = addDays(start, i);
        return {key: k, label: dayName(k).slice(0, 1), title: dayLabel(k), isDay: true, logs: byDate.get(k) || []};
      });
      ttl = `${shortDate(start)} – ${shortDate(addDays(start, 6))}`;
    } else if (period === 'month') {
      const d = parseKey(anchor);
      list = monthDays(anchor).map(k => ({key: k, label: String(parseKey(k).getDate()), title: dayLabel(k), isDay: true, logs: byDate.get(k) || []}));
      ttl = `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
    } else {
      const y = parseKey(anchor).getFullYear();
      list = Array.from({length: 12}, (_, m) => {
        const prefix = `${y}-${m < 9 ? '0' : ''}${m + 1}`;
        return {key: prefix, label: MONTHS[m].slice(0, 1), title: `${MONTHS_LONG[m]} ${y}`, isDay: false, logs: logs.filter(l => l.date.startsWith(prefix))};
      });
      ttl = String(y);
    }
    return {buckets: list, title: ttl, periodLogs: list.flatMap(b => b.logs)};
  }, [logs, period, anchor]);

  const minutes = buckets.map(b => b.logs.reduce((a, l) => a + l.minutes, 0));
  const topics = buckets.map(b => topicsDetail(b.logs).length);
  const totalMin = minutes.reduce((a, b) => a + b, 0);
  const allTopics = topicsDetail(periodLogs);
  const learned = periodLogs.filter(l => l.kind === 'learn').length;
  const revised = periodLogs.filter(l => l.kind === 'revise').length;
  const activeDays = new Set(periodLogs.map(l => l.date)).size;
  const bestIdx = minutes.indexOf(Math.max(...minutes));

  const todayIdx = buckets.findIndex(b => (b.isDay ? b.key === today : today.startsWith(b.key)));
  const selIdx = (() => {
    const i = selKey ? buckets.findIndex(b => b.key === selKey) : -1;
    if (i >= 0) {
      return i;
    }
    if (todayIdx >= 0) {
      return todayIdx;
    }
    return Math.max(0, bestIdx);
  })();
  const sel = buckets[selIdx];
  const selTopics = topicsDetail(sel.logs);

  const perSection = useMemo(() => {
    const map = new Map<string, {m: number; topics: Set<string>}>();
    periodLogs.forEach(l => {
      const name = sectionNameOfLog(l, nodes);
      const cur = map.get(name) || {m: 0, topics: new Set<string>()};
      cur.m += l.minutes;
      cur.topics.add(l.nodeId || 'p:' + l.nodePath);
      map.set(name, cur);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].m - a[1].m);
  }, [periodLogs, nodes]);

  const barLabel = (i: number) => (period === 'month' ? (i % 5 === 0 || i === buckets.length - 1 ? buckets[i].label : '') : buckets[i].label);
  const chartMinutes = buckets.map((b, i) => ({label: barLabel(i), value: minutes[i], display: minutes[i] >= 60 ? `${(minutes[i] / 60).toFixed(1)}h` : String(minutes[i])}));
  const chartTopics = buckets.map((b, i) => ({label: barLabel(i), value: topics[i]}));
  const dense = period === 'month';

  const change = (dir: number) => {
    setAnchor(shiftAnchor(period, anchor, dir));
    setSelKey(null);
  };

  return (
    <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 110}}>
      <View style={{flexDirection: 'row', marginBottom: 4}}>
        {(['week', 'month', 'year'] as Period[]).map(p => (
          <Chip
            key={p}
            label={p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Year'}
            active={period === p}
            onPress={() => {
              setPeriod(p);
              setSelKey(null);
            }}
          />
        ))}
      </View>

      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
        <Btn title="‹" small kind="soft" onPress={() => change(-1)} />
        <Text style={{fontWeight: '800', color: C.text}}>{title}</Text>
        <Btn title="›" small kind="soft" onPress={() => change(1)} />
      </View>

      <Card>
        <View style={{flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap'}}>
          <Num label="Total time" value={fmtMinutes(totalMin)} />
          <Num label="Topics" value={String(allTopics.length)} />
          <Num label="Learned" value={String(learned)} />
          <Num label="Revised" value={String(revised)} />
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'space-around', marginTop: 12}}>
          <Num label="Active days" value={String(activeDays)} />
          <Num label="Avg / active day" value={activeDays ? fmtMinutes(Math.round(totalMin / activeDays)) : '—'} />
          <Num label={period === 'year' ? 'Best month' : 'Best day'} value={totalMin ? (period === 'year' ? MONTHS[parseInt(buckets[bestIdx].key.slice(5), 10) - 1] : shortDate(buckets[bestIdx].key)) : '—'} small />
        </View>
      </Card>

      <Card>
        <Text style={{fontWeight: '800', color: C.text, marginBottom: 10}}>
          ⏱ Minutes {period === 'year' ? 'per month' : 'per day'}
        </Text>
        <BarChart
          data={chartMinutes}
          color={C.primary}
          selected={selIdx}
          onSelect={i => setSelKey(buckets[i].key)}
          showValues={!dense}
          labelEvery={1}
          goal={period === 'year' ? undefined : settings.dailyGoalMinutes || undefined}
          highlightIndex={todayIdx}
        />
        {period !== 'year' && settings.dailyGoalMinutes ? (
          <Text style={{fontSize: 10, color: C.green, marginTop: 4}}>┈ daily goal {fmtMinutes(settings.dailyGoalMinutes)}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={{fontWeight: '800', color: C.text, marginBottom: 10}}>
          📚 Topics studied {period === 'year' ? 'per month' : 'per day'}
        </Text>
        <BarChart
          data={chartTopics}
          color={C.green}
          selected={selIdx}
          onSelect={i => setSelKey(buckets[i].key)}
          showValues={!dense}
          barArea={70}
          highlightIndex={todayIdx}
        />
        <Text style={{fontSize: 10, color: C.faint, marginTop: 4}}>Counts distinct topics worked on. Tap any bar to see the details.</Text>
      </Card>

      <Card>
        <Text style={{fontWeight: '800', color: C.text}}>{sel.title}</Text>
        <Text style={{color: C.sub, marginTop: 2, marginBottom: 8}}>
          {fmtMinutes(minutes[selIdx])} · {topics[selIdx]} topic{topics[selIdx] === 1 ? '' : 's'}
        </Text>
        {selTopics.length === 0 ? (
          <Text style={{color: C.faint}}>Nothing logged.</Text>
        ) : (
          selTopics.slice(0, sel.isDay ? 20 : 10).map(t => (
            <View key={t.key} style={{flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.line}}>
              <Text style={{flex: 1, color: C.text, fontSize: 13}} numberOfLines={2}>
                {t.learn ? '📖' : ''}{t.revise ? '🔁' : ''}{t.practice ? '🛠' : ''} {t.name}
              </Text>
              <Text style={{color: C.sub, fontSize: 12, marginLeft: 8}}>{t.minutes ? fmtMinutes(t.minutes) : ''}</Text>
            </View>
          ))
        )}
        {!sel.isDay && selTopics.length > 10 ? <Text style={{color: C.faint, marginTop: 6}}>+ {selTopics.length - 10} more topics (top 10 by time shown)</Text> : null}
      </Card>

      <SectionTitle>Time by section</SectionTitle>
      {perSection.length === 0 ? (
        <Card>
          <Empty text="No study logged in this period." />
        </Card>
      ) : (
        <Card>
          {perSection.map(([name, v], i) => (
            <View key={name} style={{marginBottom: 10}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                <Text style={{color: C.text, fontWeight: '600'}}>{name}</Text>
                <Text style={{color: C.sub}}>{fmtMinutes(v.m)} · {v.topics.size} topic{v.topics.size === 1 ? '' : 's'}</Text>
              </View>
              <ProgressBar value={v.m} total={perSection[0][1].m || 1} color={colorFor(i)} />
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function Num({label, value, small}: {label: string; value: string; small?: boolean}) {
  return (
    <View style={{alignItems: 'center', minWidth: 70}}>
      <Text style={{fontSize: small ? 16 : 20, fontWeight: '900', color: C.text}}>{value}</Text>
      <Text style={{fontSize: 11, color: C.sub}}>{label}</Text>
    </View>
  );
}
