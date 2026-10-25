import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Card, Btn, Chip, Field, u } from "../ui";
import { rateMyAgent } from "../../api/agent";
import { getApiErrorMessage } from "../../api/errorMessage";

interface Props {
  linkId: string;
  current?: number | null;
  onDone: () => void;
  onCancel: () => void;
}

// Avaliar o agente de 1 a 5 estrelas
export default function RatePanel({ linkId, current, onDone, onCancel }: Props) {
  const [rating, setRating] = useState<number>(current ?? 0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (rating < 1) {
      Alert.alert("Atenção", "Escolha de 1 a 5 estrelas.");
      return;
    }

    setBusy(true);
    try {
      await rateMyAgent(linkId, { rating, comment: comment.trim() || undefined });
      Alert.alert("Obrigado", "A sua avaliação foi guardada.");
      onDone();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a avaliação."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Text style={u.strong}>Como correu o acompanhamento?</Text>
      <View style={u.row}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} label={`${n} ⭐`} active={rating === n} onPress={() => setRating(n)} />
        ))}
      </View>
      <Field label="Comentário (opcional)" value={comment} onChangeText={setComment} multiline placeholder="Ex: Ajudou-me a vender o arroz e explicou tudo bem" />
      <View style={u.row}>
        <Btn label={busy ? "A guardar..." : "Guardar avaliação"} onPress={send} disabled={busy || rating < 1} />
        <Btn kind="outline" label="Cancelar" onPress={onCancel} />
      </View>
    </Card>
  );
}
