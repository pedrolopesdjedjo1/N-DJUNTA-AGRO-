import React from "react";
import { View, Text } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Empty, useLoader, u } from "../components/ui";
import { getMyAgentActivity } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { ACTIVITY_ICON } from "../constants/agent";
import { formatDateTime } from "../constants/market";

const EMPTY = { activities: [] as any[], sessions: [] as any[] };

// O que um agente fez na minha conta (sem as notas privadas dele)
export default function MyAgentActivityScreen({ route }: any) {
  const linkId: string = route?.params?.linkId;
  const agentName: string = route?.params?.agentName ?? "O agente";
  const catalog = useAgentCatalog();

  const loader = useLoader(() => getMyAgentActivity(linkId), EMPTY, [linkId]);
  const d: any = loader.data;

  const now = Date.now();

  return (
    <Page loader={loader}>
      <Title>📋 O que {agentName} fez</Title>
      <Text style={u.muted}>As sessões de ajuda e os registos feitos na sua conta. As notas privadas do agente não aparecem aqui.</Text>

      <SubTitle>Sessões de ajuda ({d.sessions.length})</SubTitle>
      {d.sessions.length === 0 ? (
        <Empty text="O agente ainda não abriu sessões de ajuda na sua conta." />
      ) : (
        d.sessions.map((s: any) => {
          const live = !s.endedAt && new Date(s.expiresAt).getTime() > now;
          return (
            <Card key={s.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🤝 {labelOf(catalog.assistReasons, s.reason) || s.reason}</Text>
                <Badge label={live ? "Aberta" : "Terminada"} color={live ? "#EF6C00" : "#757575"} />
              </View>
              <Text style={u.muted}>Início: {formatDateTime(s.startedAt)}</Text>
              <Text style={u.muted}>
                {live ? `Termina: ${formatDateTime(s.expiresAt)}` : `Fim: ${formatDateTime(s.endedAt ?? s.expiresAt)}`} · {s.actions} alteração(ões)
              </Text>
            </Card>
          );
        })
      )}

      <SubTitle>Registos ({d.activities.length})</SubTitle>
      {d.activities.length === 0 ? (
        <Empty text="Ainda não há registos." />
      ) : (
        d.activities.map((a: any) => (
          <Card key={a.id}>
            <Text style={u.strong}>
              {ACTIVITY_ICON[a.kind] ?? "•"} {labelOf(catalog.activityKinds, a.kind) || a.kind}
            </Text>
            {a.message ? <Text style={{ marginTop: 2, lineHeight: 20 }}>{a.message}</Text> : null}
            <Text style={u.muted}>{formatDateTime(a.createdAt)}</Text>
          </Card>
        ))
      )}

      <Text style={[u.muted, { marginTop: 12 }]}>Viu algo que não reconhece? Retire o acesso ao agente em Os meus agentes e fale com o suporte.</Text>
    </Page>
  );
}
