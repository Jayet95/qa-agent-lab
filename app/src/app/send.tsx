import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, Button, colors, Field, Screen, Title } from '../components/ui';
import { amountFormatProblem, isValidEmail, parseAmount } from '../lib/validation';
import { DAILY_LIMIT, formatMoney, useApp } from '../state/AppContext';

const PROCESS_MS = 900; // simulated payment processing

export default function Send() {
  const { user, verified, balance, sentToday, canSendNow, recordPayment, showToast, hasBug } = useApp();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const busy = useRef(false);

  if (!user) return <Redirect href="/" />;

  const leftToday = Math.max(0, DAILY_LIMIT - sentToday);
  const room = canSendNow > 0 ? `You can send up to ${formatMoney(canSendNow)} right now.` : "You've reached today's limit.";
  // Shown under the field while typing, so "12abc" is flagged before submit.
  const formatProblem = amountFormatProblem(amount);

  // Editing either field dismisses the previous rejection message.
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    if (error) setError(null);
  };

  const submit = () => {
    if (busy.current) return;
    const value = parseAmount(amount);
    // Planted bug: the limit is checked against the wrong constant.
    const limit = hasBug('limit-check') ? DAILY_LIMIT + 100 : DAILY_LIMIT;

    let problem: string | null = null;
    if (!verified) problem = 'Verify your identity before sending money';
    else if (!isValidEmail(to)) problem = 'Enter a valid recipient email';
    else if (formatProblem) problem = formatProblem;
    else if (value === null || value <= 0) problem = 'Enter an amount greater than $0';
    else if (value > balance) problem = `Insufficient funds. ${room}`;
    else if (sentToday + value > limit) problem = `Amount exceeds your daily limit of ${formatMoney(DAILY_LIMIT)}. ${room}`;

    setError(problem);
    if (problem || value === null) return;

    busy.current = true;
    setProcessing(true);
    setTimeout(() => {
      recordPayment(to.trim(), value);
      showToast(`Payment of ${formatMoney(value)} approved`);
      busy.current = false;
      // Return to the wallet we came from (or open it, if we deep-linked here).
      if (router.canGoBack()) router.back();
      else router.replace('/wallet');
    }, PROCESS_MS);
  };

  return (
    <Screen>
      <Title>Send money</Title>
      <View style={s.available} testID="send-available-card">
        <Text style={s.availableMain} testID="send-available">{room}</Text>
        <Text style={s.availableSub} testID="send-available-detail">
          Balance {formatMoney(balance)} · {formatMoney(leftToday)} left of today's {formatMoney(DAILY_LIMIT)} limit
        </Text>
      </View>
      {error ? <Banner tone="danger" testID="send-error">{error}</Banner> : null}
      <Field
        testID="send-recipient"
        label="Recipient email"
        value={to}
        onChangeText={edit(setTo)}
        placeholder="friend@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field
        testID="send-amount"
        label="Amount (USD)"
        value={amount}
        onChangeText={edit(setAmount)}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={formatProblem}
        hint={
          canSendNow > 0 ? (
            <Pressable testID="send-max" accessibilityRole="button" onPress={() => edit(setAmount)(canSendNow.toFixed(2))}>
              <Text style={s.max}>Use max ({formatMoney(canSendNow)})</Text>
            </Pressable>
          ) : null
        }
      />
      <Button
        testID="send-submit"
        label={processing ? 'Processing…' : 'Send payment'}
        onPress={submit}
        loading={processing}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  available: { backgroundColor: colors.brandSoft, borderRadius: 12, padding: 14, marginBottom: 16 },
  availableMain: { color: colors.brand, fontWeight: '700', fontSize: 15 },
  availableSub: { color: colors.muted, fontSize: 13, marginTop: 4 },
  max: { color: colors.brand, fontSize: 13, fontWeight: '700' },
});
