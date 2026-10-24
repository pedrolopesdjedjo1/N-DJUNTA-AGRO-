import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AgentLayout } from "../components/AgentTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, useLoader, u } from "../components/ui";
import { getAgentHome, endAssist } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { useAssist } from "../utils/assistMode";
import { labelOf } from "../utils/ngoCatalog";
import { ALERT_COLOR } from "../constants/ngo";
import { ACTIVITY_ICON, AGENT_STATUS_COLOR } from "../constants/agent";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate, formatDateTime } from "../constants/market";

const EMPTY = {
  agent: {
    name: "",
    photoUrl: null as string | null,
    isVerified: false,
    status: "RASCUNHO",
    agentType: "COMUNITARIO",
    canRegister: true,
    canAssist: true,
    commissionRate: 0,
    rating: { average: null as number | null, count: 0 },
  },
  people: { activeClients: 0, pendingInvites: 0, newThisMonth: 0, attendedThisMonth: 0, silent: 0 },
  orders: { open: 0, stale: 0, byStatus: {} as Record<string, number>, completed30: 0, value30: 0 },
  opportunities: { open: 0, referredThisMonth: 0 },
  tasks: { pending: 0, overdue: 0, today: 0, list: [] as any[] },
  needs: { open: 0 },
  commission: { rate: 0 },
  alerts: [] as any[],
  activeSessions: [] as any[],
  recentActivities: [] as any[],
  unreadNotifications: 0,
};

type MenuItem = [string, string, string, Record<string, any>?];

const MENU: MenuItem[] = [
  ["👥", "Clientes e utilizadores", "AgentClients"],
  ["🛒", "Mercado", "AgentMarket"],
  ["📦", "Encomendas", "AgentOrders"],
  ["🚚", "Transporte", "AgentTransport"],
  ["💰", "Negócios e ganhos", "AgentEarnings"],
  ["🌱", "Produtores e comunidades", "AgentCommunities"],
  ["📢", "Oportunidades", "AgentOpportunities"],
  ["☑️", "Tarefas", "AgentTasks"],
  ["💬", "Mensagens", "Conversations"],
  ["🔔", "Notificações", "Notifications"],
  ["🗺️", "Mapa", "AgentMap"],
  ["🆘", "Suporte e chamados", "AgentSupport"],
  ["👤", "Meu perfil", "AgentProfile"],
  ["🛡️", "Segurança", "AgentSecurity"],
  ["⚙️", "Configurações", "Settings"],
];

function openTarget(navigation: any, target: { screen: string; id?: string }) {
  switch (target.screen) {
    case "profile":
      return navigation.navigate("AgentProfile");
    case "session":
      return navigation.navigate("AgentSessions");
    case "tasks":
      return navigation.navigate("AgentTasks");
    case "orders":
      return navigation.navigate("AgentOrders");
    case "clients":
      return navigation.navigate("AgentClients");
    case "alert":
      return navigation.navigate("GovAlert", { id: target.id });
    default:
      return undefined;
  }
}

export default function AgentHomeScreen({ navigation }: any) {
  const catalog = useAgentCatalog();
  const { session } = useAssist();
  const loader = useLoader(getAgentHome, EMPTY);
  const d: any = loader.data;
  const [busyId, setBusyId] = useState("");

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function finishSession(id: string) {
    setBusyId(id);
    try {
      await endAssist(id);
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível terminar a sessão."));
    } finally {
      setBusyId("");
    }
  }

  const a = d.agent;
  const earningsOn = a.commissionRate > 0;

  const tiles: [string, string, string, Record<string, any>?][] = [
    ["👥 Pessoas atendidas (30 dias)", formatNumber(d.people.attendedThisMonth), "AgentClients"],
    ["📦 Pedidos em acompanhamento", formatNumber(d.orders.open), "AgentOrders"],
    ["💼 Negócios concluídos (30 dias)", `${formatNumber(d.orders.completed30)} · ${money(d.orders.value30)}`, "AgentEarnings"],
    ["📢 Oportunidades abertas", formatNumber(d.opportunities.open), "AgentOpportunities"],
    ["☑️ Tarefas pendentes", formatNumber(d.tasks.pending), "AgentTasks"],
    earningsOn
      ? ["💰 Comissão", `${a.commissionRate}%`, "AgentEarnings"]
      : ["👤 Clientes ativos", formatNumber(d.people.activeClients), "AgentClients"],
  ];

  return (
    <AgentLayout active="AgentHome">
      <Page loader={loader}>
        <View style={[u.row, { alignItems: "center" }]}>
          {a.photoUrl ? (
            <Image source={{ uri: a.photoUrl }} style={[u.photo, { width: 56, height: 56, borderRadius: 28 }]} />
          ) : (
            <View style={[u.photo, { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 26 }}>🤝</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Title>{a.name || "Agente"}</Title>
            <Text style={u.muted}>{labelOf(catalog.agentTypes, a.agentType)}</Text>
          </View>
        </View>

        <View style={u.row}>
          <Badge label={labelOf(catalog.agentStatus, a.status) || a.status} color={AGENT_STATUS_COLOR[a.status] ?? "#757575"} />
          {a.isVerified ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label="Verificado ✅" color="#2E7D32" />
            </View>
          ) : null}
          {a.rating?.average ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label={`⭐ ${a.rating.average} (${a.rating.count})`} color="#F9A825" />
            </View>
          ) : null}
          {d.unreadNotifications > 0 ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label={`🔔 ${d.unreadNotifications}`} color="#C62828" />
            </View>
          ) : null}
        </View>

        <View style={u.row}>
          <Btn small label="➕ Registar cliente" onPress={() => navigation.navigate("AgentClientForm")} disabled={!a.canRegister} />
          <Btn small kind="outline" label="✉️ Convidar" onPress={() => navigation.navigate("AgentInvite")} disabled={!a.canRegister} />
          <Btn small kind="outline" label="☑️ Nova tarefa" onPress={() => navigation.navigate("AgentTaskForm")} />
          <Btn small kind="outline" label="🆘 Abrir chamado" onPress={() => navigation.navigate("AgentCaseForm")} />
        </View>

        <View style={u.grid}>
          {tiles.map(([label, value, route, routeParams]) => (
            <TouchableOpacity key={label} style={u.tile} onPress={() => navigation.navigate(route, routeParams)}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 16 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {session ? (
          <Card>
            <Text style={u.strong}>🤝 Sessão de ajuda aberta com {session.client.name}</Text>
            <View style={u.row}>
              <Btn small label="Abrir o painel" onPress={() => navigation.navigate("AgentAssist")} />
            </View>
          </Card>
        ) : d.activeSessions.length > 0 ? (
          <>
            <SubTitle>Sessões de ajuda abertas</SubTitle>
            {d.activeSessions.map((s: any) => (
              <Card key={s.id}>
                <Text style={u.strong}>🤝 {s.clientName ?? "Cliente"}</Text>
                <Text style={u.muted}>Termina em {formatDateTime(s.expiresAt)}</Text>
                <Btn small kind="outline" label={busyId === s.id ? "A terminar..." : "Terminar sessão"} onPress={() => finishSession(s.id)} disabled={busyId === s.id} />
              </Card>
            ))}
          </>
        ) : null}

        <SubTitle>⚠️ Alertas importantes</SubTitle>
        {d.alerts.length === 0 ? (
          <Text style={u.muted}>Tudo em dia. Nenhum alerta por agora.</Text>
        ) : (
          d.alerts.map((al: any) => (
            <TouchableOpacity key={al.key} activeOpacity={0.85} onPress={() => openTarget(navigation, al.target)}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{al.title}</Text>
                  <Badge label={al.level === "ALTA" ? "Urgente" : al.level === "MEDIA" ? "Atenção" : "Info"} color={ALERT_COLOR[al.level] ?? "#757575"} />
                </View>
                <Text style={u.muted}>{al.detail}</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <SubTitle>☑️ Tarefas pendentes ({d.tasks.pending})</SubTitle>
        {d.tasks.list.length === 0 ? (
          <Text style={u.muted}>Não tem tarefas pendentes.</Text>
        ) : (
          d.tasks.list.map((t: any) => (
            <Card key={t.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{t.title}</Text>
                {t.priority === "ALTA" ? <Badge label="Alta" color="#C62828" /> : null}
              </View>
              {t.clientName ? <Text style={u.muted}>👤 {t.clientName}</Text> : null}
              {t.dueDate ? (
                <Text style={{ color: t.overdue ? "#C62828" : undefined, marginTop: 2 }}>
                  {t.overdue ? "⚠️ Atrasada · " : "⏳ "}
                  {formatDate(t.dueDate)}
                </Text>
              ) : null}
            </Card>
          ))
        )}
        <View style={u.row}>
          <Btn small kind="outline" label="Ver todas as tarefas" onPress={() => navigation.navigate("AgentTasks")} />
          <Btn small kind="outline" label="➕ Nova tarefa" onPress={() => navigation.navigate("AgentTaskForm")} />
        </View>

        <SubTitle>🕑 Atividade recente</SubTitle>
        {d.recentActivities.length === 0 ? (
          <Text style={u.muted}>Ainda não há atividade registada.</Text>
        ) : (
          d.recentActivities.map((x: any) => (
            <Card key={x.id}>
              <Text style={u.strong}>
                {ACTIVITY_ICON[x.kind] ?? "•"} {labelOf(catalog.activityKinds, x.kind) || x.kind}
              </Text>
              {x.message ? <Text style={{ marginTop: 2 }}>{x.message}</Text> : null}
              <Text style={u.muted}>
                {x.clientName ? `${x.clientName} · ` : ""}
                {formatDateTime(x.createdAt)}
              </Text>
            </Card>
          ))
        )}

        <SubTitle>Menu</SubTitle>
        <View style={u.grid}>
          {MENU.map(([icon, label, route, routeParams]) => (
            <TouchableOpacity key={route} style={u.tile} onPress={() => navigation.navigate(route, routeParams)}>
              <View style={u.tileBox}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Page>
    </AgentLayout>
  );
}
