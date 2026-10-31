import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Btn, Field, u } from "../ui";
import { getApiErrorMessage } from "../../api/errorMessage";

interface Props {
  hidden: boolean;
  hiddenReason?: string | null;
  onHide: (reason: string) => Promise<any>;
  onRestore: (reason: string) => Promise<any>;
  hideLabel?: string;
  restoreLabel?: string;
  onDone?: () => void;
}

// Esconder ou repor um conteúdo, com o motivo que o autor vê
export default function HideControl({ hidden, hiddenReason, onHide, onRestore, hideLabel, restoreLabel, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (reason.trim().length < 5) {
      Alert.alert("Atenção", "Explique o motivo (pelo menos 5 letras). O autor vê esta explicação.");
      return;
    }

    setBusy(true);
    try {
      await (hidden ? onRestore(reason.trim()) : onHide(reason.trim()));
      setOpen(false);
      setReason("");
      if (onDone) onDone();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ marginTop: 4 }}>
      {hidden && hiddenReason ? <Text style={{ color: "#C62828", marginBottom: 4 }}>🙈 Escondido: {hiddenReason}</Text> : null}
      <View style={u.row}>
        <Btn
          small
          kind={hidden ? "outline" : "danger"}
          label={open ? "Cancelar" : hidden ? restoreLabel ?? "Repor" : hideLabel ?? "Esconder"}
          onPress={() => {
            setOpen(!open);
            setReason("");
          }}
        />
      </View>
      {open ? (
        <View style={{ marginTop: 6 }}>
          <Field
            label={hidden ? "Porque volta a aparecer (o autor vê)" : "Motivo (o autor vê)"}
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder={hidden ? "Ex: O erro foi corrigido." : "Ex: Contém informação errada sobre preços."}
          />
          <Btn kind={hidden ? "primary" : "danger"} label={busy ? "A guardar..." : "Confirmar"} onPress={confirm} disabled={busy} />
        </View>
      ) : null}
    </View>
  );
}
