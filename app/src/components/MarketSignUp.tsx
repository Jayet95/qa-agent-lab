import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { applyFormDrift, displayName, MARKETS, type MarketField, type MarketId } from '../lib/markets';
import { useApp } from '../state/AppContext';
import { Button, colors, Field, Screen, Title } from './ui';

const KEYBOARD = {
  text: 'default',
  email: 'email-address',
  password: 'default',
  tel: 'phone-pad',
  numeric: 'number-pad',
  choice: 'default',
} as const;

function Choice({ field, value, error, onChange }: {
  field: MarketField; value: string; error?: string | null; onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{field.label}</Text>
      <View accessibilityRole="radiogroup" style={s.chips}>
        {field.options!.map((opt) => (
          <Pressable
            key={opt}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === opt }}
            accessibilityLabel={opt}
            onPress={() => onChange(opt)}
            style={[s.chip, value === opt && s.chipOn]}
          >
            <Text style={[s.chipText, value === opt && { color: colors.brand }]}>{opt}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={s.error} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

export function MarketSignUp({ marketId }: { marketId: MarketId }) {
  const { signUp, hasDrift } = useApp();
  const base = MARKETS[marketId];
  const market = hasDrift('form') ? applyFormDrift(base) : base;
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const change = (f: MarketField) => (v: string) => {
    setValues((vs) => ({ ...vs, [f.key]: v }));
    if (errors[f.key]) setErrors((e) => ({ ...e, [f.key]: f.validate(v) }));
  };

  const submit = () => {
    const next = Object.fromEntries(market.fields.map((f) => [f.key, f.validate(values[f.key] ?? '')]));
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    signUp({ name: displayName(marketId, values), email: (values.email ?? '').trim() });
    router.replace('/verify');
  };

  return (
    <Screen>
      <Title sub={`${market.flag} ${market.name}`}>Create your account</Title>
      {market.fields.map((f) =>
        f.kind === 'choice' ? (
          <Choice key={f.key} field={f} value={values[f.key] ?? ''} error={errors[f.key]} onChange={change(f)} />
        ) : (
          <Field
            key={f.key}
            testID={f.testID}
            label={f.label}
            labelMode={f.labelMode}
            placeholder={f.placeholder}
            value={values[f.key] ?? ''}
            onChangeText={change(f)}
            keyboardType={KEYBOARD[f.kind]}
            secureTextEntry={f.kind === 'password'}
            autoCapitalize={f.kind === 'email' || f.kind === 'password' ? 'none' : 'words'}
            maxLength={f.maxLength}
            error={errors[f.key]}
          />
        ),
      )}
      {/* No testID on purpose — automation has to find it like a user would. */}
      <Button label={market.submitLabel} onPress={submit} />
    </Screen>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  chipText: { fontWeight: '600', color: colors.ink },
  error: { color: colors.danger, fontSize: 13, marginTop: 5 },
});
