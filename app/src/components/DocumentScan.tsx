import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import type { DocType } from '../lib/ocr';
import { colors } from './ui';

/** A stylised document with a scan line sweeping over it while OCR runs. */
export function DocumentScan({ doc, scanning }: { doc: DocType; scanning: boolean }) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scanning) return;
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [scanning, sweep]);

  const top = sweep.interpolate({ inputRange: [0, 1], outputRange: [0, 128] });

  return (
    <View style={s.doc} testID="kyc-document-preview">
      <View style={s.header}>
        <Text style={s.headerText}>{doc === 'passport' ? 'PASSPORT' : 'IDENTITY CARD'}</Text>
      </View>
      <View style={s.body}>
        <View style={s.photo}><Text style={{ fontSize: 26 }}>🙂</Text></View>
        <View style={{ flex: 1, gap: 7 }}>
          {[80, 60, 70, 50].map((w, i) => <View key={i} style={[s.line, { width: `${w}%` }]} />)}
        </View>
      </View>
      <Text style={s.mrz} numberOfLines={1}>{'P<ISR<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<'}</Text>
      {scanning ? <Animated.View style={[s.scanLine, { transform: [{ translateY: top }] }]} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  doc: {
    height: 150,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    overflow: 'hidden',
    marginBottom: 14,
  },
  header: { backgroundColor: '#3730A3', paddingVertical: 5, paddingHorizontal: 12 },
  headerText: { color: '#E0E7FF', fontWeight: '800', fontSize: 11, letterSpacing: 2 },
  body: { flexDirection: 'row', padding: 12, gap: 12 },
  photo: {
    width: 54,
    height: 64,
    borderRadius: 6,
    backgroundColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { height: 7, borderRadius: 4, backgroundColor: '#A5B4FC' },
  mrz: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10, color: '#6366F1', paddingHorizontal: 12 },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 22,
    backgroundColor: 'rgba(109, 40, 217, 0.18)',
    borderBottomWidth: 2,
    borderBottomColor: colors.brand,
  },
});
