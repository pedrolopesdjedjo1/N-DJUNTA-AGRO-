import React, { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Btn, Empty, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listAgentActivities } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { ACTIVITY_ICON } from "../constants/agent";
import { formatDateTime } from "../constants/market";

// Todo o histórico de atividades do agente
export default function AgentActivityScreen({ navigation }: any) {
  const catalog = useAgentCatalog();
  const [kind, setKind] = useState("");

  const loader = useLoader(() => listAgentActivities({ kind, limit: 200 }), [] as any[], [kind]);
  const items: any[] = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <Page loader={loader}>
      <Title>🕑 Histórico de atividades</Title>
      <Text style={u.muted}>Tudo o que fez como agente: registos, contactos, sessões de ajuda, indicações e chamados.</Text>

      <ChipGroup
        label="Tipo de atividade"
        options={catalog.activityKinds.map((k) => ({ ...k, icon: ACTIVITY_ICON[k.value] }))}
        value={kind}
        onChange={setKind}
        allowEmpty
        scroll
      />

      <Text style={[u.muted, { marginTop: 8 }]}>{loader.loading && items.length === 0 ? "A carregar..." : `${items.length} registo(s)`}</Text>

      {items.length === 0 && !loader.loading ? (
        <Empty text="Ainda não há atividade registada." />
      ) : (
        items.map((a) => (
          <Card key={a.id}>
            <Text style={u.strong}>
              {ACTIVITY_ICON[a.kind] ?? "•"} {labelOf(catalog.activityKinds, a.kind) || a.kind}
            </Text>
            {a.message ? <Text style={{ marginTop: 2, lineHeight: 20 }}>{a.message}</Text> : null}
            <Text style={u.muted}>
              {a.clientName ? `${a.clientName} · ` : ""}
              {formatDateTime(a.createdAt)}
              {a.isPrivate ? " · 🔒 só você vê" : ""}
            </Text>
          </Card>
        ))
      )}

      <Btn kind="outline" label="Voltar ao perfil" onPress={() => navigation.goBack()} />
    </Page>
  );
}
