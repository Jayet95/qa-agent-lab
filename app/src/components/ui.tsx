import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

export const colors = {
  bg: '#F4F2FB',
  card: '#FFFFFF',
  ink: '#1B1530',
  muted: '#6B6680',
  brand: '#6D28D9',
  brandSoft: '#EDE7FE',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  success: '#059669',
  successSoft: '#D1FAE5',
  border: '#E4E0F0',
};

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.screenInner} keyboardShouldPersistTaps="handled">
      <View style={s.column}>{children}</View>
    </ScrollView>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={s.title} accessibilityRole="header">{children}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Card({ children, testID }: { children: ReactNode; testID?: string }) {
  return <View style={s.card} testID={testID}>{children}</View>;
}

interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  testID: string;
  /** Optional element shown to the right of the label (e.g. a badge). */
  hint?: ReactNode;
}

export function Field({ label, error, testID, hint, ...input }: FieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {hint}
      </View>
      <TextInput
        {...input}
        testID={testID}
        accessibilityLabel={label}
        placeholderTextColor="#A8A3BC"
        style={[s.input, error ? s.inputError : null]}
      />
      {error ? <Text style={s.error} testID={`${testID}-error`}>{error}</Text> : null}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
}

export function Button({ label, onPress, testID, disabled, loading, variant = 'primary' }: ButtonProps) {
  const ghost = variant === 'ghost';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        ghost && s.buttonGhost,
        (disabled || loading) && s.buttonDisabled,
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? <ActivityIndicator color={ghost ? colors.brand : '#fff'} style={{ marginRight: 8 }} /> : null}
      <Text style={[s.buttonText, ghost && { color: colors.brand }]}>{label}</Text>
    </Pressable>
  );
}

export function Banner({ tone, children, testID }: { tone: 'danger' | 'success' | 'info'; children: ReactNode; testID?: string }) {
  const bg = tone === 'danger' ? colors.dangerSoft : tone === 'success' ? colors.successSoft : colors.brandSoft;
  const fg = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.brand;
  return (
    <View style={[s.banner, { backgroundColor: bg }]} testID={testID} accessibilityRole="alert">
      <Text style={{ color: fg, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenInner: { padding: 20, alignItems: 'center' },
  column: { width: '100%', maxWidth: 440 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 15, color: colors.muted, marginTop: 6, lineHeight: 21 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: '#FBFAFE',
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13, marginTop: 5 },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
  },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.brand },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  banner: { borderRadius: 10, padding: 12, marginBottom: 14 },
});
