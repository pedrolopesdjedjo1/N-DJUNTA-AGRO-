import React, { useState } from "react";
import { Text, Alert } from "react-native";
import { Page, Title, Card, Btn, Field, u } from "../components/ui";
import { inviteClient } from "../api/agent";
import { getApiErrorMessage } from "../api/errorMessage";

const PHONE = /^[+\d][\d\s-]{5,19}$/;

// A pessoa já tem conta: o agente envia um convite e ela aceita ou recusa
export default function AgentInviteScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function send() {
    if (!PHONE.test(phone.trim())) {
      Alert.alert("Atenção", "Escreva o telefone com que a pessoa entra no app.");
      return;
    }

    setSaving(true);
    try {
      const r = await inviteClient({ phone: phone.trim(), notes: notes.trim() || undefined });
      Alert.alert("Convite enviado", `${r.client?.name ?? "A pessoa"} recebeu o convite no app. Quando o aceitar, passa a ser seu cliente.`, [
        { text: "Ver clientes", onPress: () => navigation.replace("AgentClients") },
      ]);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar o convite."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>✉️ Convidar quem já tem conta</Title>
      <Text style={u.muted}>Escreva o telefone da pessoa. Ela recebe um convite e escolhe se o aceita. Só depois pode ajudá-la.</Text>

      <Field label="Telefone da pessoa" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Ex: 955000000" />
      <Field label="Nota para si (opcional)" value={notes} onChangeText={setNotes} multiline />

      <Card>
        <Text style={u.muted}>Pode enviar até 20 convites por dia. Se a pessoa ainda não tem conta, registe-a em Clientes.</Text>
      </Card>

      <Btn label={saving ? "A enviar..." : "Enviar convite"} onPress={send} disabled={saving} />
      <Btn kind="outline" label="Registar uma pessoa nova" onPress={() => navigation.replace("AgentClientForm")} />
    </Page>
  );
}
