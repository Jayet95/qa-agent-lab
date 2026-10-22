import { Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, colors, Screen, Title } from '../components/ui';
import { useApp } from '../state/AppContext';

export default function Welcome() {
  const { user, verified } = useApp();
  // Seeded / returning users skip onboarding.
  if (user) return <Redirect href={verified ? '/wallet' : '/verify'} />;

  return (
    <Screen>
      <Title sub="A tiny fintech app built to be tested — sign up, verify your identity, and send money.">
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
      <Button testID="welcome-get-started" label="Get started" onPress={() => router.push('/signup')} />
    </Screen>
  );
}
