import React, { useState } from "react";
import { Text, Alert } from "react-native";
import { Page, Title, Card, Btn, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { fileReport } from "../api/reports";
import { REPORT_CATEGORIES, REPORT_TARGET_TEXT } from "../constants/transporterSocial";
import { getApiErrorMessage } from "../api/errorMessage";

// Denunciar um problema: uma pessoa, um produto, uma encomenda, uma entrega ou outra situação.
// Quem denuncia nunca é revelado à pessoa denunciada.
export default function ReportCreateScreen({ navigation, route }: any) {
  const targetType: string = route?.params?.targetType ?? "OTHER";
  const targetId: string | undefined = route?.params?.targetId;

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function send() {
    if (!category) return Alert.alert("Atenção", "Escolha o tipo de problema.");
    if (description.trim().length < 10) return Alert.alert("Atenção", "Explique o que se passou (pelo menos 10 letras).");

    setSaving(true);
    try {
      await fileReport({ targetType, targetId, category, description: description.trim() });
      Alert.alert("Denúncia enviada", "A equipa vai analisar. Quem denunciou nunca é revelado, e recebe uma notificação quando o caso for analisado.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a denúncia."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>🚩 Denunciar um problema</Title>
      <Text style={u.muted}>Está a denunciar {REPORT_TARGET_TEXT[targetType] ?? "uma situação"}. A equipa NÔDJUNTA analisa cada denúncia.</Text>

      <ChipGroup label="Que tipo de problema?" options={REPORT_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: c.icon }))} value={category} onChange={setCategory} />
      <Field label="O que aconteceu?" value={description} onChangeText={setDescription} multiline placeholder="Explique com calma: o que aconteceu, quando e com quem." />

      <Card>
        <Text style={u.muted}>🔒 A pessoa denunciada nunca sabe quem a denunciou. Denúncias falsas podem levar à suspensão de quem as faz.</Text>
      </Card>

      <Btn label={saving ? "A enviar..." : "Enviar a denúncia"} onPress={send} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
