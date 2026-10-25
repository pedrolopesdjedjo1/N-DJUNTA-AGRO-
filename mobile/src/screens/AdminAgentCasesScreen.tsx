import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, Card, Badge, Chip, Empty, useLoader, u } from "../components/ui";
import { adminListAgentCases } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { CASE_ICON, CASE_STATUS_COLOR } from "../constants/agentSupport";
import { shortId } from "../constants/agentOps";
import { formatDate } from "../constants/market";

const EMPTY = { counts: {} as Record<string, number>, items: [] as any[] };

// Chamados que os agentes passaram à equipa
export default function AdminAgentCasesScreen({ navigation }: any) {
  const { user } = useAuth();
  const catalog = useAgentCatalog();
  const allowed = user?.role === "ADMIN";

  const [status, setStatus] = useState("ESCALADO");
  const loader = useLoader(() => (allowed ? adminListAgentCases({ status }) : Promise.resolve(EMPTY)), EMPTY, [allowed, status]);
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
        <Title>🆘 Chamados dos agentes</Title>
        <Empty text="Acesso restrito à equipa do NÔDJUNTA AGRO." />
      </Page>
    );
  }

  return (
    <Page loader={loader}>
      <Title>🆘 Chamados dos agentes</Title>
      <Text style={u.muted}>Os problemas que os agentes não conseguiram resolver e passaram à equipa.</Text>

      <View style={u.row}>
        {catalog.caseStatus.map((s) => (
          <Chip key={s.value} label={`${s.label} (${d.counts[s.value] ?? 0})`} active={status === s.value} onPress={() => setStatus(s.value)} />
        ))}
      </View>

      {d.items.length === 0 && !loader.loading ? (
        <Empty text={status === "ESCALADO" ? "Não há chamados à espera da equipa." : "Nenhum chamado com este estado."} />
      ) : (
        d.items.map((c: any) => (
          <TouchableOpacity key={c.id} activeOpacity={0.85} onPress={() => navigation.navigate("AdminAgentCase", { id: c.id })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {CASE_ICON[c.category] ?? "⚠️"} {c.title}
                </Text>
                <Badge label={labelOf(catalog.caseStatus, c.status) || c.status} color={CASE_STATUS_COLOR[c.status] ?? "#757575"} />
              </View>
              <Text style={u.muted}>{labelOf(catalog.caseCategories, c.category)}</Text>
              <Text style={u.muted}>🤝 Agente: {c.agent?.name ?? "—"}</Text>
              {c.clientName ? <Text style={u.muted}>👤 Cliente: {c.clientName}</Text> : null}
              {c.orderId ? <Text style={u.muted}>📦 Encomenda {shortId(c.orderId)}</Text> : null}
              <Text style={u.muted}>{c.escalatedAt ? `Passado à equipa em ${formatDate(c.escalatedAt)}` : `Aberto em ${formatDate(c.createdAt)}`}</Text>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </Page>
  );
}
