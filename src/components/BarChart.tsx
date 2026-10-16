import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {C} from '../theme';

export type Bar = {label: string; value: number; display?: string};

type Props = {
  data: Bar[];
  color: string;
  selected?: number;
  onSelect?: (i: number) => void;
  showValues?: boolean; // numbers above bars (off for dense charts)
  labelEvery?: number; // show every n-th x label
  goal?: number; // dashed goal line
  barArea?: number;
  highlightIndex?: number; // e.g. "today"
};

export function BarChart({data, color, selected, onSelect, showValues = true, labelEvery = 1, goal, barArea = 90, highlightIndex}: Props) {
  const max = Math.max(1, ...data.map(d => d.value), goal || 0);
  const dense = data.length > 14;
  return (
    <View>
      <View style={{height: barArea + 18}}>
        <View style={[s.row, {height: barArea + 18}]}>
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(4, Math.round((d.value / max) * barArea)) : 3;
            const isSel = selected === i;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                disabled={!onSelect}
                onPress={() => onSelect && onSelect(i)}
                style={[s.col, isSel && {backgroundColor: C.primarySoft}, {paddingHorizontal: dense ? 0.5 : 2}]}>
                {showValues ? (
                  <Text style={s.val} numberOfLines={1}>
                    {d.value > 0 ? d.display ?? d.value : ''}
                  </Text>
                ) : (
                  <View style={{height: 14}} />
                )}
                <View
                  style={{
                    width: dense ? '70%' : 20,
                    height: h,
                    borderRadius: dense ? 2 : 5,
                    backgroundColor: color,
                    opacity: d.value > 0 ? 1 : 0.18,
                  }}
                />
              </TouchableOpacity>
            );
          })}
        </View>
        {goal ? (
          <View pointerEvents="none" style={[s.goal, {bottom: Math.round((goal / max) * barArea)}]} />
        ) : null}
      </View>
      <View style={{flexDirection: 'row'}}>
        {data.map((d, i) => (
          <View key={i} style={{flex: 1, alignItems: 'center'}}>
            <Text
              style={[s.lbl, highlightIndex === i && {color: C.primary, fontWeight: '900'}]}
              numberOfLines={1}>
              {i % labelEvery === 0 ? d.label : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'flex-end'},
  col: {flex: 1, alignItems: 'center', justifyContent: 'flex-end', borderRadius: 6},
  val: {fontSize: 9, color: C.sub, height: 14},
  lbl: {fontSize: 10, color: C.faint, fontWeight: '700', marginTop: 4},
  goal: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.green,
  },
});
