import React, { useState } from "react";
import { View, Text } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, SubTitle, Card, Chip, Empty, useLoader, u } from "../components/ui";
import { HBars } from "../components/ngo/Charts";
import { getBoStatsRegions } from "../api/backoffice";
import { formatNumber } from "../utils/format";
import { money, formatDate } from "../constants/market";

const EMPTY = { from: null as any, to: null as any, items: [] as any[], unplaced: 0 };

const METRICS: [string, string][] = [
  ["users", "👥 Contas"],
  ["newUsers", "🆕 Contas novas"],
  ["products", "🛍️ Produtos"],
  ["orders", "📦 Encomendas"],
  ["sales", "💰 Vendas"],
  ["deliveries", "🚚 Entregas"],
];

// Atividade por região
export default function BoStatsRegionsScreen({ route }: any) {
  const [range, setRange] = useState({ from: route?.params?.from ?? "", to: route?.params?.to ?? "" });
  const [metric, setMetric] = useState("users");
  const loader = useLoader(() => getBoStatsRegions({ from: range.from, to: range.to }), EMPTY, [range]);
  const d: any = loader.data;

  const rows = (d.items as any[]).filter((r) => r.region !== "Região por confirmar");
  const chart = [...rows]
    .sort((a, b) => b[metric] - a[metric])
    .filter((r) => r[metric] > 0)
    .slice(0, 12)
    .map((r) => ({ label: r.region, value: r[metric] }));

  return (
    <AdminLayout active="BoStats">
      <Page loader={loader}>
        <Title>🗺️ Atividade por região</Title>
        <Text style={u.muted}>As contas e os produtos contam-se pela localidade que cada pessoa escreveu. As vendas pela região do vendedor, e as entregas pela do comprador.</Text>

        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} />
        {d.from ? (
          <Text style={[u.muted, { marginTop: 6 }]}>
            Período: {formatDate(d.from)} a {formatDate(d.to)}
          </Text>
        ) : null}

        <SubTitle>Comparar regiões</SubTitle>
        <View style={u.row}>
          {METRICS.map(([key, label]) => (
            <Chip key={key} label={label} active={metric === key} onPress={() => setMetric(key)} />
          ))}
        </View>
        <Card>{chart.length > 0 ? <HBars data={chart} color="#00838F" /> : <Empty text="Sem dados por região neste período." />}</Card>

        <SubTitle>Detalhe</SubTitle>
        {rows.length === 0 && !loader.loading ? (
          <Empty text="Sem dados por região." />
        ) : (
          rows.map((r) => (
            <Card key={r.region}>
              <Text style={u.strong}>{r.region}</Text>
              <Text style={u.muted}>
                👥 {formatNumber(r.users)} contas ({r.newUsers} novas) · 🛍️ {formatNumber(r.products)} produtos
              </Text>
              <Text style={u.muted}>
                🌾 {r.farmers} · 🎣 {r.fishers} · 🧺 {r.artisans} · 🏪 {r.merchants} · 🚚 {r.transporters} · 🛒 {r.buyers} · 🌍 {r.ngos} · 🏛️ {r.institutions}
              </Text>
              <Text style={u.muted}>
                📦 {formatNumber(r.orders)} encomendas · 💰 {money(r.sales)} · ✅ {r.deliveries} entregas
              </Text>
              {r.openReports > 0 ? <Text style={{ color: "#EF6C00" }}>🚩 {r.openReports} denúncia(s) aberta(s)</Text> : null}
            </Card>
          ))
        )}

        {d.unplaced > 0 ? <Text style={[u.muted, { marginTop: 8 }]}>{formatNumber(d.unplaced)} conta(s) sem uma região reconhecida na localidade.</Text> : null}
      </Page>
    </AdminLayout>
  );
}
