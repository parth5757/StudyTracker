import React, {useEffect} from 'react';
import {
  BackHandler,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {C} from '../theme';

type BtnKind = 'primary' | 'soft' | 'ghost' | 'danger' | 'success';

export function Btn({
  title,
  onPress,
  kind = 'primary',
  small,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: BtnKind;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg: Record<BtnKind, string> = {
    primary: C.primary,
    soft: C.primarySoft,
    ghost: 'transparent',
    danger: C.redSoft,
    success: C.greenSoft,
  };
  const fg: Record<BtnKind, string> = {
    primary: '#fff',
    soft: C.primary,
    ghost: C.sub,
    danger: C.red,
    success: C.green,
  };
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.btn,
        small && s.btnSmall,
        {backgroundColor: bg[kind], opacity: disabled ? 0.45 : 1},
        kind === 'ghost' && {borderWidth: 1, borderColor: C.line},
        style,
      ]}>
      <Text style={[s.btnText, small && {fontSize: 13}, {color: fg[kind]}]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Card({children, style}: {children: React.ReactNode; style?: StyleProp<ViewStyle>}) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const accent = color || C.primary;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[s.chip, active && {backgroundColor: accent, borderColor: accent}]}>
      <Text style={[s.chipText, active && {color: '#fff'}]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Badge({label, bg, fg}: {label: string; bg: string; fg: string}) {
  return (
    <View style={[s.badge, {backgroundColor: bg}]}>
      <Text style={[s.badgeText, {color: fg}]}>{label}</Text>
    </View>
  );
}

export function Field(props: TextInputProps & {label?: string}) {
  const {label, style, ...rest} = props;
  return (
    <View style={{marginBottom: 12}}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.faint}
        {...rest}
        style={[s.input, rest.multiline && {minHeight: 90, textAlignVertical: 'top'}, style]}
      />
    </View>
  );
}

export function Bar({value, total, color = C.primary}: {value: number; total: number; color?: string}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, {width: `${pct}%`, backgroundColor: color}]} />
    </View>
  );
}

export function SectionTitle({children, right}: {children: React.ReactNode; right?: React.ReactNode}) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Empty({text}: {text: string}) {
  return (
    <View style={{paddingVertical: 24, alignItems: 'center'}}>
      <Text style={{color: C.faint, fontSize: 14, textAlign: 'center'}}>{text}</Text>
    </View>
  );
}

// Full-screen overlay "sheet" rendered inside the app window (keeps insets + keyboard behaviour simple).
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);
  return (
    <View style={[StyleSheet.absoluteFill, {backgroundColor: C.bg, paddingTop: insets.top}]}>
      <View style={s.sheetHeader}>
        <TouchableOpacity onPress={onClose} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={{fontSize: 22, color: C.sub}}>✕</Text>
        </TouchableOpacity>
        <Text style={s.sheetTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{width: 22}} />
      </View>
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{padding: 16, paddingBottom: 32}}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={[s.sheetFooter, {paddingBottom: 12 + insets.bottom}]}>{footer}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: {paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10},
  btnText: {fontSize: 15, fontWeight: '700'},
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#1B1E2B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {fontSize: 13, fontWeight: '600', color: C.text},
  badge: {paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, alignSelf: 'flex-start'},
  badgeText: {fontSize: 11, fontWeight: '700'},
  label: {fontSize: 12, fontWeight: '700', color: C.sub, marginBottom: 6, textTransform: 'uppercase'},
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
  },
  barTrack: {height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden'},
  barFill: {height: 6, borderRadius: 3},
  sectionRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8},
  sectionTitle: {fontSize: 16, fontWeight: '800', color: C.text},
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.card,
  },
  sheetTitle: {fontSize: 17, fontWeight: '800', color: C.text, flex: 1, textAlign: 'center', marginHorizontal: 8},
  sheetFooter: {
    padding: 12,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
});
