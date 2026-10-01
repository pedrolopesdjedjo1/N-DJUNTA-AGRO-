import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  requestVerification,
  verificationErrorMessage,
} from "../api/verification";

const DOCUMENT_TYPES = [
  "Bilhete de Identidade",
  "Passaporte",
  "Cartão de eleitor",
  "Carta de condução",
  "Outro",
];

export default function VerificationScreen() {
  const auth: any = useAuth();
  const user = auth?.user;

  const [documentType, setDocumentType] = useState<string | null>(null);
  const [documentNote, setDocumentNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!documentType) {
      Alert.alert("Verificação", "Escolha o tipo de documento.");
      return;
    }
    try {
      setSending(true);
      await requestVerification(documentType, documentNote.trim());
      setSent(true);
    } catch (err: any) {
      Alert.alert("Erro", verificationErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (user?.isVerified) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.bigIcon}>✅</Text>
        <Text style={styles.title}>Conta verificada</Text>
        <Text style={styles.info}>
          Sua identidade já foi verificada pela equipe.
        </Text>
      </View>
    );
  }

  if (sent) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.bigIcon}>📨</Text>
        <Text style={styles.title}>Pedido enviado</Text>
        <Text style={styles.info}>
          Sua solicitação foi enviada. A equipe vai analisar e você receberá o
          resultado. Saia e entre de novo no app depois da aprovação para ver o
          selo de verificado.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Verificação de identidade</Text>
      <Text style={styles.info}>
        Contas verificadas passam mais confiança para compradores e vendedores.
      </Text>

      <Text style={styles.label}>Tipo de documento</Text>
      {DOCUMENT_TYPES.map((type) => {
        const active = documentType === type;
        return (
          <TouchableOpacity
            key={type}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => setDocumentType(type)}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        );
      })}

      <Text style={styles.label}>Observação (opcional)</Text>
      <TextInput
        style={styles.input}
        value={documentNote}
        onChangeText={setDocumentNote}
        placeholder="Ex.: número do documento"
        multiline
        maxLength={300}
      />

      <TouchableOpacity
        style={[styles.submit, sending && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Enviar pedido</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  centerBox: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  bigIcon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "bold", color: "#1B5E20", marginBottom: 8 },
  info: { fontSize: 14, color: "#555", marginBottom: 16, textAlign: "center" },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 12, marginBottom: 8 },
  option: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  optionActive: { backgroundColor: "#1B5E20", borderColor: "#1B5E20" },
  optionText: { fontSize: 15, color: "#222" },
  optionTextActive: { color: "#fff", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  submit: {
    backgroundColor: "#1B5E20",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
