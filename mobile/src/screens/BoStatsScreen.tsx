import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, SubTitle, Card, useLoader, u } from "../components/ui";
import { HBars } from "../components/ngo/Charts";
import { getBoStatsOverview } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { STATS_MENU } from "../constants/backofficeComms";
import { DEPARTMENT_ICON } from "../constants/backofficeMarket";
import { ORDER_STAGE_LABEL } from "../constants/backofficeOrders";
import { formatNumber } from "../utils/format";
import { money, formatDate } from "../constants/market";

const EMPTY = {
  from: null as any,
  to: null as any,
  users: { active: 0, new: 0, verified: 0, verifiedShare: 0, byKind: {} as Record<string, number>, newByKind: {} as Record<string, number> },
  market: { available: 0, newInPeriod: 0, byDepartment: [] as any[] },
  orders: { total: 0, completed: 0, cancelled: 0, cancelRate: 0, sales: 0, average: 0, byStage: {} as Record<string, number> },
  transport: { accepted: 0, delivered: 0, problems: 0, released: 0 },
  organizations: { newInPeriod: 0 },
  moderation: { reportsOpened: 0, reportsClosed: 0 },
};

const KIND_ROWS: [string, string][] = [
  ["farmers", "🌾 Agricultores"],
  ["fishers", "🎣 Pescadores"],
  ["artisans", "🧺 Artesãos"],
  ["merchants", "🏪 Comerciantes"],
  ["transporters", "🚚 Transportadores"],
  ["buyers", "🛒 Clientes"],
  ["ngos", "🌍 ONGs"],
  ["institutions", "🏛️ Instituições públicas"],
  ["agents", "🤝 Agentes"],
];

export default function BoStatsScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const [range, setRange] = useState({ from: "", to: "" });
  const loader = useLoader(() => getBoStatsOverview({ from: range.from, to: range.to }), EMPTY, [range]);
  const d: any = loader.data;

  const stages = Object.keys(d.orders.byStage).map((k) => ({ label: ORDER_STAGE_LABEL[k] ?? k, value: d.orders.byStage[k] }));

  return (
    <AdminLayout active="BoStats">
      <Page loader={loader}>
        <Title>📊 Relatórios e estatísticas</Title>
        <Text style={u.muted}>Números reais da plataforma, no período que escolher. Por defeito, os últimos 30 dias.</Text>

        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} />
        {d.from ? (
          <Text style={[u.muted, { marginTop: 6 }]}>
            Período: {formatDate(d.from)} a {formatDate(d.to)}
          </Text>
        ) : null}

        <SubTitle>Menu</SubTitle>
        <View style={u.grid}>
          {STATS_MENU.map(([icon, label, route, params]) => (
            <TouchableOpacity key={route} style={u.tile} onPress={() => navigation.navigate(route, { ...(params ?? {}), from: range.from, to: range.to })}>
              <View style={u.tileBox}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <SubTitle>Por segmento</SubTitle>
        <View style={u.row}>
          {catalog.statSegments.map((s: any) => (
            <TouchableOpacity key={s.value} onPress={() => navigation.navigate("BoStatsSegment", { kind: s.value, from: range.from, to: range.to })}>
              <View style={{ borderWidth: 1, borderColor: "#CFD8DC", borderRadius: 18, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginTop: 8 }}>
                <Text>
                  {s.icon} {s.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <SubTitle>👥 Utilizadores</SubTitle>
        <View style={u.grid}>
          {(
            [
              ["Contas ativas", formatNumber(d.users.active)],
              ["Contas novas", formatNumber(d.users.new)],
              ["Verificadas", `${d.users.verifiedShare}%`],
              ["ONGs e instituições novas", formatNumber(d.organizations.newInPeriod)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>
        <Card>
          {KIND_ROWS.map(([key, label]) => (
            <View key={key} style={[u.between, { marginTop: 4 }]}>
              <Text>{label}</Text>
              <Text style={{ fontWeight: "bold" }}>
                {formatNumber(d.users.byKind[key] ?? 0)}
                {d.users.newByKind[key] ? <Text style={{ color: "#2E7D32" }}>  +{d.users.newByKind[key]}</Text> : null}
              </Text>
            </View>
          ))}
          <Text style={[u.muted, { marginTop: 6 }]}>O número a verde são as contas novas no período.</Text>
        </Card>

        <SubTitle>🛒 Mercado</SubTitle>
        <View style={u.grid}>
          {(
            [
              ["Produtos à venda", formatNumber(d.market.available)],
              ["Publicados no período", formatNumber(d.market.newInPeriod)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>
        {d.market.byDepartment.length > 0 ? (
          <Card>
            <HBars
              data={d.market.byDepartment.map((x: any) => ({ label: `${DEPARTMENT_ICON[x.department] ?? ""} ${labelOf(catalog.departments, x.department) || x.department}`.trim(), value: x.count }))}
              color="#2E7D32"
            />
          </Card>
        ) : null}

        <SubTitle>📦 Encomendas e vendas</SubTitle>
        <View style={u.grid}>
          {(
            [
              ["Encomendas", formatNumber(d.orders.total)],
              ["Concluídas", formatNumber(d.orders.completed)],
              ["Canceladas", `${formatNumber(d.orders.cancelled)} (${d.orders.cancelRate}%)`],
              ["Valor vendido", money(d.orders.sales)],
              ["Média por venda", money(d.orders.average)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>
        {stages.length > 0 ? (
          <Card>
            <HBars data={stages} color="#1565C0" />
          </Card>
        ) : null}

        <SubTitle>🚚 Transportes</SubTitle>
        <View style={u.grid}>
          {(
            [
              ["Entregas aceites", d.transport.accepted],
              ["Entregas concluídas", d.transport.delivered],
              ["Devolvidas", d.transport.released],
              ["Problemas", d.transport.problems],
            ] as [string, number][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{formatNumber(value)}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        {adminCan("reports.view") ? (
          <>
            <SubTitle>🚩 Moderação</SubTitle>
            <Card>
              <Text>
                Denúncias recebidas: <Text style={{ fontWeight: "bold" }}>{d.moderation.reportsOpened}</Text>
              </Text>
              <Text>
                Denúncias decididas: <Text style={{ fontWeight: "bold" }}>{d.moderation.reportsClosed}</Text>
              </Text>
            </Card>
          </>
        ) : null}
      </Page>
    </AdminLayout>
  );
}
