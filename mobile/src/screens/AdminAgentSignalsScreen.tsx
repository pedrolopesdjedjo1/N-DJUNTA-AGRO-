import React, { useCallback } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { adminAgentSignals } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { AGENT_STATUS_COLOR } from "../constants/agent";

const EMPTY = { thresholds: { sessions24h: 0, registrations24h: 0, actions24h: 0 }, items: [] as any[] };

// Agentes com atividade fora do normal nas últimas 24 horas
export default function AdminAgentSignalsScreen({ navigation }: any) {
  const { user } = useAuth();
  const catalog = useAgentCatalog();
  const allowed = user?.role === "ADMIN";

  const loader = useLoader(() => (allowed ? adminAgentSignals() : Promise.resolve(EMPTY)), EMPTY, [allowed]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      if (allowed) loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed])
  );

  if (!allowed) {
    return (
      <Page>
        <Title>🚨 Sinais de alerta</Title>
        <Empty text="Acesso restrito à equipa do NÔDJUNTA AGRO." />
      </Page>
    );
  }

  const t = d.thresholds;

  return (
    <Page loader={loader}>
      <Title>🚨 Sinais de alerta</Title>
      <Text style={u.muted}>
        Agentes com mais de {t.sessions24h} sessões, {t.actions24h} alterações em contas ou {t.registrations24h} contas registadas em 24 horas, ou com denúncias por analisar.
      </Text>

      {d.items.length === 0 && !loader.loading ? (
        <Empty text="Nenhum agente com sinais de alerta. Tudo normal." />
      ) : (
        d.items.map((i: any) => (
          <Card key={i.agentId}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{i.agent?.name ?? "Agente"}</Text>
              <Badge label={labelOf(catalog.agentStatus, i.status) || i.status} color={AGENT_STATUS_COLOR[i.status] ?? "#757575"} />
            </View>
            {i.flags.map((f: string) => (
              <Text key={f} style={{ color: "#C62828", marginTop: 4 }}>
                ⚠️ {f}
              </Text>
            ))}
            <Text style={[u.muted, { marginTop: 6 }]}>
              Em 24 horas: {i.metrics.sessions24h} sessão(ões) · {i.metrics.actions24h} alteração(ões) · {i.metrics.registrations24h} conta(s) registada(s)
            </Text>
            <View style={u.row}>
              <Btn small label="Abrir o agente" onPress={() => navigation.navigate("AdminAgent", { userId: i.agentId })} />
              {i.agent ? <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: i.agent.id, userName: i.agent.name })} /> : null}
            </View>
          </Card>
        ))
      )}
    </Page>
  );
}
