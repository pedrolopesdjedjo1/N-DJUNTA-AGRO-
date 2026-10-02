import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { requestVerification, verificationErrorMessage } from "../api/verification";

// "value" vai para o backend (sempre em português); "key" é só a tradução na tela.
const DOCUMENT_TYPES = [
  { value: "Bilhete de Identidade", key: "doc_BI" },
  { value: "Passaporte", key: "doc_PASSAPORTE" },
  { value: "Cartão de eleitor", key: "doc_ELEITOR" },
  { value: "Carta de condução", key: "doc_CARTA" },
  { value: "Outro", key: "doc_OUTRO" },
];

export default function VerificationScreen() {
  const auth: any = useAuth();
  const { t } = useLanguage();
  const user = auth?.user;

  const [documentType, setDocumentType] = useState<string | null>(null);
  const [documentNote, setDocumentNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!documentType) {
      Alert.alert(t("verification"), t("chooseDoc"));
      return;
    }
    try {
      setSending(true);
      await requestVerification(documentType, documentNote.trim());
      setSent(true);
    } catch (err: any) {
      Alert.alert(t("error"), verificationErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (user?.isVerified) {
    return (
      <View style={s.centerBox}>
        <Text style={s.bigIcon}>✅</Text>
        <Text style={s.title}>{t("verifiedTitle")}</Text>
        <Text style={s.info}>{t("verifiedInfo")}</Text>
      </View>
    );
  }

  if (sent) {
    return (
      <View style={s.centerBox}>
        <Text style={s.bigIcon}>📨</Text>
        <Text style={s.title}>{t("sentTitle")}</Text>
        <Text style={s.info}>{t("sentInfo")}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>{t("verification")}</Text>
      <Text style={s.info}>{t("verifIntro")}</Text>

      <Text style={s.label}>{t("docType")}</Text>
      {DOCUMENT_TYPES.map((d) => {
        const active = documentType === d.value;
        return (
          <TouchableOpacity key={d.value} style={[s.option, active && s.optionActive]} onPress={() => setDocumentType(d.value)}>
            <Text style={[s.optionText, active && s.optionTextActive]}>{t(d.key)}</Text>
          </TouchableOpacity>
        );
      })}

      <Text style={s.label}>{t("docNote")}</Text>
      <TextInput style={s.input} value={documentNote} onChangeText={setDocumentNote} placeholder={t("docNotePlaceholder")} multiline maxLength={300} />

      <TouchableOpacity style={[s.submit, sending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={sending}>
        {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{t("submitRequest")}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  centerBox: { flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", padding: 24 },
  bigIcon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "bold", color: "#1B5E20", marginBottom: 8 },
  info: { fontSize: 14, color: "#555", marginBottom: 16, textAlign: "center" },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 12, marginBottom: 8 },
  option: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 14, marginBottom: 8 },
  optionActive: { backgroundColor: "#1B5E20", borderColor: "#1B5E20" },
  optionText: { fontSize: 15, color: "#222" },
  optionTextActive: { color: "#fff", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: "top" },
  submit: { backgroundColor: "#1B5E20", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
