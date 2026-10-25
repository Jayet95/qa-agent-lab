import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { QA_LINKS } from '../lib/links';
import { colors } from './ui';

const ITEMS = [
  { id: 'lab', label: '🧪 Run the tests', href: QA_LINKS.lab },
  { id: 'dashboard', label: '📊 Quality dashboard', href: QA_LINKS.dashboard },
  { id: 'repo', label: '</> Source', href: QA_LINKS.repo },
] as const;

/** "Behind the scenes" links from the demo app to the suite that tests it. */
export function QaLinks() {
  return (
    <View style={s.box} testID="qa-links">
      <Text style={s.title}>Behind the scenes</Text>
      <Text style={s.sub}>PayDemo exists to be tested. Watch the test suite run against it, or see the results.</Text>
      <View style={s.row}>
        {ITEMS.map((i) => (
          <Pressable
            key={i.id}
            testID={`qa-link-${i.id}`}
            accessibilityRole="link"
            // On web this renders a real <a>, so it opens in a new tab.
            {...({ href: i.href, hrefAttrs: { target: '_blank', rel: 'noopener' } } as object)}
            onPress={Platform.OS === 'web' ? undefined : () => Linking.openURL(i.href)}
            style={s.chip}
          >
            <Text style={s.chipText}>{i.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { marginTop: 28, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  title: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  sub: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  chipText: { color: colors.brand, fontWeight: '600', fontSize: 13 },
});
