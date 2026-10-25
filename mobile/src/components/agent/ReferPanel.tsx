import React, { useState } from "react";
import { Text, Alert } from "react-native";
import { Card, Btn, Field, u } from "../ui";
import ClientPicker from "./ClientPicker";
import { referToClients } from "../../api/agent";
import { getApiErrorMessage } from "../../api/errorMessage";

interface Props {
  type: "OPORTUNIDADE" | "FORMACAO" | "PROGRAMA";
  refId: string;
  title: string;
  presetLinkId?: string;
  onDone: () => void;
  onCancel: () => void;
}

// Indicar uma oportunidade, formação ou programa a vários clientes de uma vez
export default function ReferPanel({ type, refId, title, presetLinkId, onDone, onCancel }: Props) {
  const [picked, setPicked] = useState<string[]>(presetLinkId ? [presetLinkId] : []);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(link: any) {
    setPicked((prev) => (prev.includes(link.id) ? prev.filter((x) => x !== link.id) : [...prev, link.id]));
  }

  async function send() {
    if (picked.length === 0) {
      Alert.alert("Atenção", "Escolha pelo menos uma pessoa.");
      return;
    }

    setBusy(true);
    try {
      const r = await referToClients({ type, refId, linkIds: picked, message: message.trim() || undefined });
      Alert.alert(
        "Indicação enviada",
        `${r.sent} pessoa(s) receberam a indicação.${r.skipped ? ` ${r.skipped} já a tinham recebido.` : ""}`
      );
      onDone();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a indicação."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Text style={u.strong}>Indicar "{title}" a…</Text>
      <ClientPicker selected={picked} onToggle={toggle} />
      <Field
        label="Mensagem (opcional)"
        value={message}
        onChangeText={setMessage}
        multiline
        placeholder="Ex: Acho que é boa para si. Se quiser, ajudo-o a candidatar-se."
      />
      <Btn label={busy ? "A enviar..." : `Enviar a ${picked.length || ""} pessoa(s)`} onPress={send} disabled={busy || picked.length === 0} />
      <Btn small kind="outline" label="Cancelar" onPress={onCancel} />
    </Card>
  );
}
