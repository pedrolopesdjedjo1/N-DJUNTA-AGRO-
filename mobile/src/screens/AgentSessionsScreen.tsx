import React, { useCallback, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { listAssistSessions, endAssist } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { getAssist, clearAssist } from "../utils/assistMode";
import { labelOf } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

// Histórico das sessões de ajuda. Serve também para terminar uma sessão que ficou aberta.
export default function AgentSessionsScreen({ navigation, route }: any) {
  const linkId: string | undefined = route?.params?.linkId;
  const catalog = useAgentCatalog();
  const loader = useLoader(() => listAssistSessions({ linkId }), [] as any[], [linkId]);
  const items: any[] = loader.data;
  const [busyId, setBusyId] = useState("");

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function finish(id: string) {
    setBusyId(id);
    try {
      await endAssist(id);
      if (getAssist()?.sessionId === id) clearAssist();
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível terminar a sessão."));
    } finally {
      setBusyId("");
    }
  }

  const active = items.filter((s) => s.isActive);

  return (
    <Page loader={loader}>
      <Title>🤝 Sessões de ajuda</Title>
      <Text style={u.muted}>Cada sessão dura 30 minutos e fica registada. A pessoa ajudada vê estas sessões.</Text>

      {active.length > 0 ? (
        <Card>
          <Text style={u.strong}>{active.length} sessão(ões) aberta(s)</Text>
          <Text style={u.muted}>Termine as que já não precisa.</Text>
        </Card>
      ) : null}

      {items.length === 0 && !loader.loading ? (
        <Empty text="Ainda não fez sessões de ajuda." />
      ) : (
        items.map((s) => (
          <Card key={s.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🤝 {s.clientName ?? "Cliente"}</Text>
              <Badge label={s.isActive ? "Aberta" : "Terminada"} color={s.isActive ? "#EF6C00" : "#757575"} />
            </View>
            <Text style={u.muted}>{labelOf(catalog.assistReasons, s.reason) || s.reason}</Text>
            <Text style={u.muted}>Início: {formatDateTime(s.startedAt)}</Text>
            <Text style={u.muted}>
              {s.isActive ? `Termina: ${formatDateTime(s.expiresAt)}` : `Fim: ${formatDateTime(s.endedAt ?? s.expiresAt)}`} · {s.actions} alteração(ões)
            </Text>
            {s.isActive ? (
              <Btn small kind="danger" label={busyId === s.id ? "A terminar..." : "Terminar sessão"} onPress={() => finish(s.id)} disabled={busyId === s.id} />
            ) : null}
          </Card>
        ))
      )}

      <Btn kind="outline" label="Voltar aos clientes" onPress={() => navigation.navigate("AgentClients")} />
    </Page>
  );
}
