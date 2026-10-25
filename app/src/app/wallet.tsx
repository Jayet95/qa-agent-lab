import { Redirect, router } from 'expo-router';
import { QaLinks } from '../components/QaLinks';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, Screen } from '../components/ui';
import { DAILY_LIMIT, formatMoney, useApp } from '../state/AppContext';

export default function Wallet() {
  const { user, verified, balance, sentToday, transactions } = useApp();
  if (!user) return <Redirect href="/" />;

  const firstName = user.name.split(' ')[0];

  return (
    <Screen>
      <Text style={s.greeting} testID="wallet-greeting">Hi, {firstName} 👋</Text>

      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>Available balance</Text>
        <Text style={s.balance} testID="wallet-balance">{formatMoney(balance)}</Text>
        <View style={s.badgeRow}>
          <Text style={[s.badge, verified ? s.badgeOk : s.badgeWarn]} testID="wallet-verification">
            {verified ? '✓ Verified' : '! Not verified'}
          </Text>
          <Text style={s.limit} testID="wallet-limit">
            {formatMoney(DAILY_LIMIT - sentToday)} left today
          </Text>
        </View>
      </View>

      <View style={s.actions}>
        <View style={{ flex: 1 }}>
          <Button testID="wallet-send" label="Send money" onPress={() => router.push('/send')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button testID="wallet-deposit" label="Add money" variant="ghost" onPress={() => router.push('/deposit')} />
        </View>
      </View>

      <Text style={s.section}>Recent activity</Text>
      <Card testID="wallet-transactions">
        {transactions.length === 0 ? (
          <Text style={{ color: colors.muted }} testID="wallet-empty">No transactions yet</Text>
        ) : (
          transactions.map((t, i) => (
            <View key={t.id} style={[s.tx, i > 0 && s.txBorder]} testID={`wallet-tx-${i}`}>
              <Text style={{ color: colors.ink, flex: 1 }} numberOfLines={1}>
                {t.kind === 'deposit' ? 'Added to wallet' : `To ${t.to}`}
              </Text>
              <Text style={{ color: t.kind === 'deposit' ? colors.success : colors.danger, fontWeight: '700' }}>
                {t.kind === 'deposit' ? '+' : '−'}{formatMoney(t.amount)}
              </Text>
            </View>
          ))
        )}
      </Card>
      <QaLinks />
    </Screen>
  );
}

const s = StyleSheet.create({
  greeting: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 14 },
  balanceCard: { backgroundColor: colors.brand, borderRadius: 18, padding: 20, marginBottom: 10 },
  balanceLabel: { color: '#DDD6FE', fontSize: 14 },
  balance: { color: '#fff', fontSize: 36, fontWeight: '800', marginVertical: 6 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  badge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  badgeOk: { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeWarn: { backgroundColor: '#FEF3C7', color: '#92400E' },
  limit: { color: '#DDD6FE', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10 },
  section: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 22, marginBottom: 10 },
  tx: { flexDirection: 'row', paddingVertical: 10 },
  txBorder: { borderTopWidth: 1, borderTopColor: colors.border },
});
