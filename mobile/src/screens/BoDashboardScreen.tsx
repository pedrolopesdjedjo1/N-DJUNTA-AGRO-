import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { ColumnBars } from "../components/ngo/Charts";
import { getBoDashboard } from "../api/backoffice";
import { adminCan, getAdminMeCache } from "../utils/adminSession";
import { ATTENTION_ROUTES, LEVEL_COLOR } from "../constants/backoffice";
import { ALERT_COLOR } from "../constants/ngo";
import { dayLabel } from "../constants/agentWork";
import { formatNumber } from "../utils/format";
import { money } from "../constants/market";

const EMPTY = {
  users: { active: 0, inactive: 0, total: 0, new7: 0, new30: 0, byKind: {} as Record<string, number> },
  market: { available: 0, total: 0, new7: 0 },
  orders: { total: 0, today: 0, open: 0, completed: 0, cancelled: 0, stuck: 0, last30: 0, value30: 0, valueTotal: 0, byStage: {} as Record<string, number> },
  transport: { awaiting: 0, accepted: 0, inTransit: 0, delivered: 0, problems7: 0 },
  projects: { ngo: 0, government: 0 },
  alerts: { active: 0, items: [] as any[] },
  trend: [] as any[],
  reports: { open: 0, inAnalysis: 0 },
  attention: [] as any[],
};

type Tile = { label: string; value: string; route: string; params?: Record<string, any>; perms: string[] };

export default function BoDashboardScreen({ navigation }: any) {
  const loader = useLoader(getBoDashboard, EMPTY);
  const d: any = loader.data;
  const me = getAdminMeCache();

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const k = d.users.byKind;
  const tiles: Tile[] = [
    { label: "👥 Utilizadores ativos", value: formatNumber(d.users.active), route: "BoUsers", params: { status: "ATIVO" }, perms: ["users.view"] },
    { label: "🆕 Novos (7 dias)", value: formatNumber(d.users.new7), route: "BoUsers", perms: ["users.view"] },
    { label: "🌾 Agricultores", value: formatNumber(k.farmers ?? 0), route: "BoUsers", params: { role: "AGRICULTOR" }, perms: ["users.view"] },
    { label: "🎣 Pescadores", value: formatNumber(k.fishers ?? 0), route: "BoUsers", params: { role: "PESCADOR" }, perms: ["users.view"] },
    { label: "🧺 Artesãos", value: formatNumber(k.artisans ?? 0), route: "BoUsers", params: { role: "ARTESAO" }, perms: ["users.view"] },
    { label: "🚚 Transportadores", value: formatNumber(k.transporters ?? 0), route: "BoUsers", params: { role: "TRANSPORTADOR" }, perms: ["users.view"] },
    { label: "🛒 Compradores", value: formatNumber(k.buyers ?? 0), route: "BoUsers", params: { role: "BUYER" }, perms: ["users.view"] },
    { label: "🌍 ONGs", value: formatNumber(k.ngos ?? 0), route: "BoOrgs", params: { kind: "ONG" }, perms: ["orgs.manage", "profiles.view", "gov.view"] },
    { label: "🏛️ Instituições públicas", value: formatNumber(k.institutions ?? 0), route: "BoOrgs", params: { kind: "GOV" }, perms: ["orgs.manage", "profiles.view", "gov.view"] },
    { label: "📦 Produtos publicados", value: formatNumber(d.market.available), route: "BoMarket", perms: ["market.view"] },
    { label: `🧾 Encomendas (hoje ${d.orders.today})`, value: formatNumber(d.orders.total), route: "BoOrders", perms: ["orders.view"] },
    { label: "💰 Vendas (30 dias)", value: money(d.orders.value30), route: "BoFinance", perms: ["finance.view"] },
    { label: "🚚 Transportes em curso", value: formatNumber(d.transport.accepted + d.transport.inTransit), route: "BoTransport", perms: ["transport.view"] },
    { label: "📋 Projetos (ONGs e governo)", value: formatNumber(d.projects.ngo + d.projects.government), route: "BoOrgs", perms: ["orgs.manage", "gov.view", "profiles.view"] },
    { label: "🚨 Alertas ativos", value: formatNumber(d.alerts.active), route: "BoAlerts", perms: ["alerts.manage", "notify.send", "gov.view"] },
    { label: "📊 Relatórios", value: "Abrir", route: "BoStats", perms: ["stats.view"] },
  ];

  const visible = tiles.filter((t) => adminCan(...t.perms));
  const usersChart = (d.trend as any[]).map((x) => ({ label: dayLabel(x.date), value: x.users }));
  const salesChart = (d.trend as any[]).map((x) => ({ label: dayLabel(x.date), value: x.sales }));

  function openAttention(a: any) {
    const route = ATTENTION_ROUTES[a.target?.screen];
    if (route) navigation.navigate(route);
  }

  return (
    <AdminLayout active="BoDashboard">
      <Page loader={loader}>
        <Title>🏠 Painel principal</Title>
        <View style={u.row}>
          <Text style={u.muted}>Olá, {me?.name ?? "administrador"}</Text>
          {me ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label={`${me.levelIcon} ${me.levelLabel}`} color={LEVEL_COLOR[me.level] ?? "#1565C0"} />
            </View>
          ) : null}
        </View>

        {me && !me.twoFactorEnabled ? (
          <Card>
            <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>🔐 A sua conta ainda não tem autenticação de dois fatores</Text>
            <Text style={u.muted}>Quem tem acesso à administração deve ativá-la: protege a plataforma se perder o telemóvel ou a palavra-passe.</Text>
            <Btn small label="Ativar agora" onPress={() => navigation.navigate("BoSecurity")} />
          </Card>
        ) : null}

        <SubTitle>⚠️ Precisa de atenção</SubTitle>
        {d.attention.length === 0 ? (
          <Text style={u.muted}>Tudo em dia. Nada à espera da equipa.</Text>
        ) : (
          d.attention.map((a: any) => (
            <TouchableOpacity key={a.key} activeOpacity={0.85} onPress={() => openAttention(a)}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{a.title}</Text>
                  <Badge label={a.level === "ALTA" ? "Urgente" : a.level === "MEDIA" ? "Atenção" : "Info"} color={ALERT_COLOR[a.level] ?? "#757575"} />
                </View>
                <Text style={u.muted}>{a.detail}</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <SubTitle>Resumo da plataforma</SubTitle>
        <View style={u.grid}>
          {visible.map((t) => (
            <TouchableOpacity key={t.label} style={u.tile} onPress={() => navigation.navigate(t.route, t.params)}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{t.value}</Text>
                <Text style={u.tileLabel}>{t.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {d.users.inactive > 0 && adminCan("users.view") ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("BoUsers", { status: "INATIVO" })}>
            <Text style={[u.muted, { marginTop: 6 }]}>
              {formatNumber(d.users.inactive)} conta(s) suspensa(s) ou bloqueada(s). Toque para ver.
            </Text>
          </TouchableOpacity>
        ) : null}

        {d.trend.length > 0 ? (
          <>
            <SubTitle>Contas novas (14 dias)</SubTitle>
            <Card>{usersChart.some((c) => c.value > 0) ? <ColumnBars data={usersChart} /> : <Empty text="Sem contas novas nestes dias." />}</Card>

            {adminCan("finance.view", "stats.view") ? (
              <>
                <SubTitle>Vendas concluídas (14 dias)</SubTitle>
                <Card>{salesChart.some((c) => c.value > 0) ? <ColumnBars data={salesChart} /> : <Empty text="Sem vendas concluídas nestes dias." />}</Card>
              </>
            ) : null}
          </>
        ) : null}

        {d.alerts.items.length > 0 ? (
          <>
            <SubTitle>🚨 Alertas oficiais ativos</SubTitle>
            {d.alerts.items.map((a: any) => (
              <Card key={a.id}>
                <Text style={u.strong}>{a.title}</Text>
                <Text style={u.muted}>
                  {String(a.kind)} · {String(a.severity)}
                </Text>
              </Card>
            ))}
          </>
        ) : null}

        <SubTitle>Atalhos</SubTitle>
        <View style={u.row}>
          {adminCan("reports.view") ? <Btn small kind="outline" label={`🚩 Denúncias (${d.reports.open})`} onPress={() => navigation.navigate("BoReports")} /> : null}
          {adminCan("users.verify") ? <Btn small kind="outline" label="🆔 Verificações" onPress={() => navigation.navigate("BoIdentity")} /> : null}
          {adminCan("notify.send", "alerts.manage") ? <Btn small kind="outline" label="📣 Enviar aviso" onPress={() => navigation.navigate("BoBroadcasts")} /> : null}
          {adminCan("support.view") ? <Btn small kind="outline" label="🎧 Suporte" onPress={() => navigation.navigate("BoSupport")} /> : null}
        </View>
      </Page>
    </AdminLayout>
  );
}
