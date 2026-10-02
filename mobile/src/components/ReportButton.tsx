import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { createProductReport } from '../api/productReports';

// "value" é o texto enviado ao backend (sempre em português);
// "key" é a chave de tradução usada só para mostrar na tela.
const REASONS = [
  { value: 'Golpe ou fraude', key: 'reasonFraud' },
  { value: 'Produto falso ou enganoso', key: 'reasonFake' },
  { value: 'Preço abusivo', key: 'reasonPrice' },
  { value: 'Conteúdo impróprio', key: 'reasonContent' },
  { value: 'Outro motivo', key: 'reasonOther' },
];

type Props = {
  productId: string | number;
  ownerId?: string | number;
};

export default function ReportButton({ productId, ownerId }: Props) {
  const auth: any = useAuth();
  const { t } = useLanguage();
  const currentUserId = auth?.user?.id;

  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  if (ownerId !== undefined && currentUserId !== undefined && String(ownerId) === String(currentUserId)) {
    return null;
  }

  const close = () => {
    setVisible(false);
    setReason(null);
    setDescription('');
  };

  const submit = async () => {
    if (!reason) {
      Alert.alert(t('report'), t('reportChoose'));
      return;
    }
    try {
      setSending(true);
      await createProductReport({
        productId,
        reportedUserId: ownerId,
        reason,
        description: description.trim(),
      });
      close();
      Alert.alert(t('reportThanks'), t('reportSent'));
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || t('reportError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={() => setVisible(true)}>
        <Text style={styles.buttonText}>🚩 {t('report')}</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>{t('reportProduct')}</Text>
              <Text style={styles.label}>{t('reportWhy')}</Text>

              {REASONS.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.reason, reason === r.value && styles.reasonActive]}
                  onPress={() => setReason(r.value)}
                >
                  <Text style={[styles.reasonText, reason === r.value && styles.reasonTextActive]}>
                    {t(r.key)}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.label}>{t('reportDetails')}</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder={t('reportPlaceholder')}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                style={[styles.submit, sending && { opacity: 0.6 }]}
                onPress={submit}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{t('reportSend')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancel} onPress={close} disabled={sending}>
                <Text style={styles.cancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c0392b',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  buttonText: { color: '#c0392b', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#111' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#333' },
  reason: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  reasonActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  reasonText: { color: '#222' },
  reasonTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submit: {
    backgroundColor: '#c0392b',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancel: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#555' },
});
