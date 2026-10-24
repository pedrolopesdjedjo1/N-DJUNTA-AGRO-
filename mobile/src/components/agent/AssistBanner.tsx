import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAssist, timeText, clearAssist } from "../../utils/assistMode";
import { endAssist } from "../../api/agent";
import { getApiErrorMessage } from "../../api/errorMessage";

interface Props {
  navigationRef: any;
}

// Faixa laranja no topo de todas as telas enquanto o agente está a ajudar na conta de um cliente
export default function AssistBanner({ navigationRef }: Props) {
  const { session, remainingMs } = useAssist();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  if (!session) return null;

  const go = (name: string, params?: any) => {
    if (navigationRef?.isReady?.()) navigationRef.navigate(name, params);
  };

  async function finish() {
    if (!session) return;
    setBusy(true);
    try {
      await endAssist(session.sessionId);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível terminar a sessão no servidor. Ela termina sozinha."));
    } finally {
      const linkId = session.linkId;
      clearAssist();
      setBusy(false);
      go("AgentClient", { id: linkId });
    }
  }

  const low = remainingMs < 5 * 60000;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        elevation: 12,
        backgroundColor: low ? "#C62828" : "#EF6C00",
        paddingTop: insets.top + 4,
        paddingBottom: 6,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", flex: 1, fontSize: 12, fontWeight: "bold" }} numberOfLines={1}>
        🤝 A ajudar {session.client.name} · {timeText(remainingMs)}
      </Text>
      <TouchableOpacity onPress={() => go("AgentAssist")} style={{ marginLeft: 8 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 12, textDecorationLine: "underline" }}>Painel</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={finish} disabled={busy} style={{ marginLeft: 14 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold", textDecorationLine: "underline" }}>
          {busy ? "A terminar..." : "Terminar"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
