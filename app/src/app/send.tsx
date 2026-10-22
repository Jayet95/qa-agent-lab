import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Banner, Button, Field, Screen, Title } from '../components/ui';
import { isValidEmail, parseAmount } from '../lib/validation';
import { DAILY_LIMIT, formatMoney, useApp } from '../state/AppContext';

const PROCESS_MS = 900; // simulated payment processing

export default function Send() {
  const { user, verified, balance, sentToday, recordPayment, showToast, hasBug } = useApp();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const busy = useRef(false);

  if (!user) return <Redirect href="/" />;

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
    else if (value === null || value <= 0) problem = 'Enter an amount greater than $0';
    else if (value > balance) problem = 'Insufficient funds';
    else if (sentToday + value > limit) problem = `Amount exceeds your daily limit of ${formatMoney(DAILY_LIMIT)}`;

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
      <Title sub={`You can send up to ${formatMoney(DAILY_LIMIT - sentToday)} more today.`}>Send money</Title>
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
