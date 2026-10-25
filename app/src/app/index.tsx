import { Redirect, router } from 'expo-router';
import { QaLinks } from '../components/QaLinks';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, colors, Screen, Title } from '../components/ui';
import { MARKETS, type MarketId } from '../lib/markets';
import { useApp } from '../state/AppContext';

export default function Welcome() {
  const { user, verified, hasDrift } = useApp();
  // Seeded / returning users skip onboarding.
  if (user) return <Redirect href={verified ? '/wallet' : '/verify'} />;

  return (
    <Screen>
      <Title sub="A tiny fintech app built to be tested: sign up, verify your identity, add and send money.">
        Welcome to PayDemo
      </Title>
      <Card>
        {['Create an account in seconds', 'Verify your identity', 'Send up to $500 a day'].map((t) => (
          <View key={t} style={{ flexDirection: 'row', marginBottom: 8 }}>
            <Text style={{ color: colors.brand, marginRight: 8, fontWeight: '800' }}>✓</Text>
            <Text style={{ color: colors.ink, fontSize: 15 }}>{t}</Text>
          </View>
        ))}
      </Card>
      <Button
        // ?drift=testids simulates a release that renamed this testID
        testID={hasDrift('testids') ? 'welcome-start' : 'welcome-get-started'}
        label="Get started"
        onPress={() => router.push('/signup')}
      />

      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 22, marginBottom: 10 }}>
        Or sign up in your market
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        {(Object.keys(MARKETS) as MarketId[]).map((id) => (
          <Pressable
            key={id}
            accessibilityRole="link"
            accessibilityLabel={`Sign up in ${MARKETS[id].name}`}
            onPress={() => router.push({ pathname: '/signup', params: { market: id } })}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' }}
          >
            <Text style={{ color: colors.ink, fontWeight: '600' }}>{MARKETS[id].flag} {MARKETS[id].name}</Text>
          </Pressable>
        ))}
      </View>
      <QaLinks />
    </Screen>
  );
}
