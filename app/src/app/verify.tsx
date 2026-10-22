import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DocumentScan } from '../components/DocumentScan';
import { Banner, Button, Card, colors, Field, Screen, Title } from '../components/ui';
import {
  FIELD_LABELS,
  KYC_FIELDS,
  LOW_CONFIDENCE,
  readDocument,
  validateField,
  type DocType,
  type KycErrors,
  type KycField,
  type OcrResult,
} from '../lib/ocr';
import { useApp } from '../state/AppContext';

// idle → reading (OCR) → review (user checks/edits) → pending (provider) → verified
type Status = 'idle' | 'reading' | 'review' | 'pending' | 'verified';

const OCR_MS = 1200;    // simulated OCR latency
const VERIFY_MS = 1400; // simulated identity-provider latency

const FIELD_ID: Record<KycField, string> = {
  name: 'name',
  dob: 'dob',
  nationality: 'nationality',
  documentNumber: 'document-number',
  expiry: 'expiry',
};

const PLACEHOLDER: Partial<Record<KycField, string>> = { dob: 'YYYY-MM-DD', expiry: 'YYYY-MM-DD' };

export default function Verify() {
  const { user, verified, markVerified, hasBug } = useApp();
  const [doc, setDoc] = useState<DocType | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [status, setStatus] = useState<Status>(verified ? 'verified' : 'idle');
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [values, setValues] = useState<Record<KycField, string> | null>(null);
  const [errors, setErrors] = useState<KycErrors>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!user) return <Redirect href="/" />;

  const check = (field: KycField, value: string) =>
    validateField(field, value, user.name, hasBug('expiry-check'));

  const scan = () => {
    if (!doc) return;
    setStatus('reading');
    timer.current = setTimeout(() => {
      const result = readDocument(doc, user.name);
      setOcr(result);
      setValues(Object.fromEntries(KYC_FIELDS.map((f) => [f, result[f].value])) as Record<KycField, string>);
      setStatus('review');
    }, OCR_MS);
  };

  const edit = (field: KycField) => (v: string) => {
    setValues((vs) => (vs ? { ...vs, [field]: v } : vs));
    // Re-check a field that already shows an error, so it clears once fixed.
    if (errors[field]) setErrors((e) => ({ ...e, [field]: check(field, v) }));
  };

  const confirm = () => {
    if (!values) return;
    const next: KycErrors = Object.fromEntries(KYC_FIELDS.map((f) => [f, check(f, values[f])]));
    setErrors(next);
    if (KYC_FIELDS.some((f) => next[f])) return;
    setStatus('pending');
    if (hasBug('kyc-stuck')) return; // planted bug: the provider never answers
    timer.current = setTimeout(() => {
      markVerified();
      setStatus('verified');
    }, VERIFY_MS);
  };

  const locked = status !== 'idle';

  return (
    <Screen>
      <Title sub="Regulations require us to confirm who you are before you can send money.">
        Verify your identity
      </Title>

      {status === 'idle' || status === 'reading' ? (
        <Card>
          <Text style={s.step}>1. Choose a document</Text>
          <View style={s.row}>
            {([['passport', 'Passport'], ['id-card', 'ID card']] as const).map(([id, label]) => (
              <Pressable
                key={id}
                testID={`kyc-doc-${id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: doc === id }}
                onPress={() => setDoc(id)}
                disabled={locked}
                style={[s.choice, doc === id && s.choiceOn]}
              >
                <Text style={[s.choiceText, doc === id && { color: colors.brand }]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[s.step, { marginTop: 16 }]}>2. Upload a photo</Text>
          {doc && uploaded ? <DocumentScan doc={doc} scanning={status === 'reading'} /> : null}
          <Button
            testID="kyc-upload"
            variant="ghost"
            label={uploaded ? 'Replace photo' : 'Upload photo'}
            onPress={() => setUploaded(true)}
            disabled={!doc || locked}
          />
          {uploaded ? <Text style={s.uploaded} testID="kyc-upload-status">📎 document.jpg uploaded</Text> : null}
        </Card>
      ) : null}

      {status === 'reading' ? (
        <Banner tone="info" testID="kyc-status-reading">Reading your document…</Banner>
      ) : null}

      {status === 'idle' || status === 'reading' ? (
        <Button
          testID="kyc-submit"
          label="Scan document"
          onPress={scan}
          disabled={!doc || !uploaded}
          loading={status === 'reading'}
        />
      ) : null}

      {status === 'review' && ocr && values ? (
        <View testID="kyc-review">
          <Card>
            <Text style={s.reviewTitle}>3. Check your details</Text>
            <Text style={s.reviewSub}>We read these from your document. Edit anything that’s wrong.</Text>
            {KYC_FIELDS.map((f) => {
              const low = ocr[f].confidence < LOW_CONFIDENCE;
              return (
                <Field
                  key={f}
                  testID={`kyc-field-${FIELD_ID[f]}`}
                  label={FIELD_LABELS[f]}
                  value={values[f]}
                  onChangeText={edit(f)}
                  placeholder={PLACEHOLDER[f]}
                  autoCapitalize={f === 'name' ? 'characters' : 'none'}
                  error={errors[f]}
                  hint={
                    <Text
                      testID={`kyc-confidence-${FIELD_ID[f]}`}
                      style={[s.conf, low ? s.confLow : s.confOk]}
                    >
                      {low ? `⚠ Low confidence · ${Math.round(ocr[f].confidence * 100)}%` : `${Math.round(ocr[f].confidence * 100)}%`}
                    </Text>
                  }
                />
              );
            })}
          </Card>
          <Button testID="kyc-confirm" label="Confirm details" onPress={confirm} />
        </View>
      ) : null}

      {status === 'pending' ? (
        <Banner tone="info" testID="kyc-status-pending">Verifying your identity…</Banner>
      ) : null}
      {status === 'verified' ? (
        <>
          <Banner tone="success" testID="kyc-status-verified">Identity verified ✓</Banner>
          <Button testID="kyc-continue" label="Go to wallet" onPress={() => router.replace('/wallet')} />
        </>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  step: { fontWeight: '700', color: colors.ink, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  choice: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  choiceOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  choiceText: { fontWeight: '600', color: colors.ink },
  uploaded: { marginTop: 10, color: colors.success, fontWeight: '600' },
  reviewTitle: { fontWeight: '800', color: colors.ink, fontSize: 16 },
  reviewSub: { color: colors.muted, marginTop: 4, marginBottom: 16 },
  conf: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  confOk: { backgroundColor: colors.successSoft, color: colors.success },
  confLow: { backgroundColor: '#FEF3C7', color: '#92400E' },
});
