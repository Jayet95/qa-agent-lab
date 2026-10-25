import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, Button, colors, Field, Screen, Title } from '../components/ui';
import { amountFormatProblem, parseAmount } from '../lib/validation';
import { formatMoney, MAX_DEPOSIT, useApp } from '../state/AppContext';

const PROCESS_MS = 700; // simulated card top-up
const QUICK_AMOUNTS = [50, 100, 250];

export default function Deposit() {
  const { user, verified, balance, recordDeposit, showToast } = useApp();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const busy = useRef(false);

  if (!user) return <Redirect href="/" />;

  const formatProblem = amountFormatProblem(amount);

  const change = (v: string) => {
    setAmount(v);
    if (error) setError(null);
  };

  const submit = () => {
    if (busy.current) return;
    const value = parseAmount(amount);

    let problem: string | null = null;
    if (!verified) problem = 'Verify your identity before adding money';
    else if (formatProblem) problem = formatProblem;
    else if (value === null || value <= 0) problem = 'Enter an amount greater than $0';
    else if (value > MAX_DEPOSIT) problem = `You can add up to ${formatMoney(MAX_DEPOSIT)} at a time`;

    setError(problem);
    if (problem || value === null) return;

    busy.current = true;
    setProcessing(true);
    setTimeout(() => {
      recordDeposit(value);
      showToast(`Added ${formatMoney(value)} to your wallet`);
      busy.current = false;
      if (router.canGoBack()) router.back();
      else router.replace('/wallet');
    }, PROCESS_MS);
  };

  return (
    <Screen>
      <Title sub={`Current balance ${formatMoney(balance)}. Up to ${formatMoney(MAX_DEPOSIT)} per deposit.`}>Add money</Title>
      {error ? <Banner tone="danger" testID="deposit-error">{error}</Banner> : null}
      <View style={s.quick}>
        {QUICK_AMOUNTS.map((n) => (
          <Pressable
            key={n}
            testID={`deposit-quick-${n}`}
            accessibilityRole="button"
            onPress={() => change(String(n))}
            style={[s.chip, parseAmount(amount) === n && s.chipOn]}
          >
            <Text style={[s.chipText, parseAmount(amount) === n && s.chipTextOn]}>{formatMoney(n)}</Text>
          </Pressable>
        ))}
      </View>
      <Field
        testID="deposit-amount"
        label="Amount (USD)"
        value={amount}
        onChangeText={change}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={formatProblem}
      />
      <Text style={s.source}>From: Visa ending 4242 (demo card, no real money)</Text>
      <Button
        testID="deposit-submit"
        label={processing ? 'Adding…' : 'Add money'}
        onPress={submit}
        loading={processing}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  quick: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  chipText: { color: colors.ink, fontWeight: '700' },
  chipTextOn: { color: colors.brand },
  source: { color: colors.muted, fontSize: 13, marginBottom: 8 },
});
