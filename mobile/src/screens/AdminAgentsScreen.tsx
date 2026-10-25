import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { adminListAgents } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { AGENT_STATUS_COLOR } from "../constants/agent";
import { formatDate } from "../constants/market";

const EMPTY = { counts: {} as Record<string, number>, items: [] as any[] };

const TABS: [string, string][] = [
  ["PENDENTE", "Em análise"],
  ["APROVADO", "Aprovados"],
  ["SUSPENSO", "Suspensos"],
  ["RECUSADO", "Recusados"],
  ["RASCUNHO", "Por enviar"],
  ["", "Todos"],
];

// Para a equipa do NÔDJUNTA AGRO: aprovar e acompanhar os agentes
export default function AdminAgentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const catalog = useAgentCatalog();
  const allowed = user?.role === "ADMIN";

  const [status, setStatus] = useState("PENDENTE");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(() => (allowed ? adminListAgents({ status, q }) : Promise.resolve(EMPTY)), EMPTY, [allowed, status, q]);
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
        <Title>🤝 Agentes</Title>
        <Empty text="Acesso restrito à equipa do NÔDJUNTA AGRO." />
      </Page>
    );
  }

  const total = Object.values(d.counts as Record<string, number>).reduce((s, n) => s + n, 0);

  return (
    <Page loader={loader}>
      <Title>🤝 Agentes</Title>
      <Text style={u.muted}>Aprove os agentes, defina as permissões e a comissão, e acompanhe a segurança.</Text>

      <View style={u.grid}>
        {(
          [
            ["🚨", "Sinais de alerta", "AdminAgentSignals"],
            ["🚩", "Denúncias de segurança", "AdminAgentSecurity"],
            ["🆘", "Chamados dos agentes", "AdminAgentCases"],
            ["💰", "Comissões", "AdminAgentCommissions"],
          ] as [string, string, string][]
        ).map(([icon, label, route]) => (
          <TouchableOpacity key={route} style={u.tile} onPress={() => navigation.navigate(route)}>
            <View style={u.tileBox}>
              <Text style={{ fontSize: 22 }}>{icon}</Text>
              <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <SubTitle>Agentes ({total})</SubTitle>
      <View style={u.row}>
        {TABS.map(([value, label]) => (
          <Chip
            key={value || "all"}
            label={`${label}${value ? ` (${d.counts[value] ?? 0})` : ""}`}
            active={status === value}
            onPress={() => setStatus(value)}
          />
        ))}
      </View>

      <Field
        placeholder="Procurar por nome ou telefone"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />

      {d.items.length === 0 && !loader.loading ? (
        <Empty text={status === "PENDENTE" ? "Não há agentes à espera de aprovação." : "Nenhum agente com este estado."} />
      ) : (
        d.items.map((i: any) => {
          const p = i.profile;
          return (
            <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => navigation.navigate("AdminAgent", { userId: p.userId })}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                    {i.user?.name ?? "Agente"} {i.user?.isVerified ? "✅" : ""}
                  </Text>
                  <Badge label={labelOf(catalog.agentStatus, p.status) || p.status} color={AGENT_STATUS_COLOR[p.status] ?? "#757575"} />
                </View>
                <Text style={u.muted}>{labelOf(catalog.agentTypes, p.agentType)}</Text>
                {i.user?.location ? <Text style={u.muted}>📍 {i.user.location}</Text> : null}
                {i.user?.phone ? <Text style={u.muted}>📞 {i.user.phone}</Text> : null}
                <Text style={u.muted}>
                  📄 {i.documents.length} documento(s) · 👥 {i.activeClients} cliente(s) ativo(s)
                </Text>
                {p.submittedAt && p.status === "PENDENTE" ? <Text style={u.muted}>Enviado em {formatDate(p.submittedAt)}</Text> : null}
                {p.lockedAt ? <Text style={{ color: "#C62828", marginTop: 2 }}>🔒 Conta bloqueada pelo agente</Text> : null}
                {p.commissionRate > 0 ? <Text style={u.muted}>💰 Comissão de {p.commissionRate}%</Text> : null}
              </Card>
            </TouchableOpacity>
          );
        })
      )}
    </Page>
  );
}
