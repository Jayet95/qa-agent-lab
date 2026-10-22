import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../components/ui';
import { AppProvider, useApp } from '../state/AppContext';

function BugModeBanner() {
  const { bugs } = useApp();
  if (bugs.length === 0) return null;
  return (
    <View style={s.bugBanner} testID="bug-banner">
      <Text style={s.bugText}>🐞 Bug mode: {bugs.join(', ')}</Text>
    </View>
  );
}

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <View style={s.toastWrap} pointerEvents="none">
      <View style={s.toast} testID="toast" accessibilityRole="alert">
        <Text style={s.toastText}>{toast}</Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <BugModeBanner />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            headerTintColor: colors.ink,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'PayDemo' }} />
          <Stack.Screen name="signup" options={{ title: 'Create account' }} />
          <Stack.Screen name="verify" options={{ title: 'Verify identity' }} />
          <Stack.Screen name="wallet" options={{ title: 'Wallet', headerBackVisible: false }} />
          <Stack.Screen name="send" options={{ title: 'Send money' }} />
        </Stack>
        <Toast />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  bugBanner: { backgroundColor: '#7F1D1D', paddingVertical: 6, paddingHorizontal: 12 },
  bugText: { color: '#FECACA', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 32, alignItems: 'center' },
  toast: {
    backgroundColor: colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    maxWidth: 420,
  },
  toastText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
