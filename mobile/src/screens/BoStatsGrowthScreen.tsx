import React, { useState } from "react";
import { View, Text } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, SubTitle, Card, Empty, useLoader, u } from "../components/ui";
import { ColumnBars } from "../components/ngo/Charts";
import { getBoStatsGrowth } from "../api/backoffice";
import { dayLabel, monthLabel } from "../constants/agentWork";
import { formatNumber } from "../utils/format";
import { money, formatDate } from "../constants/market";

const EMPTY = {
  from: null as any,
  to: null as any,
  monthly: false,
  items: [] as any[],
  totals: { newUsers: 0, orders: 0, sales: 0, usersNow: 0 },
  trend: { newUsers: null as number | null, orders: null as number | null, sales: null as number | null },
  note: "",
};

function arrow(n: number | null): string {
  if (n === null) return "—";
  return `${n > 0 ? "▲ +" : n < 0 ? "▼ " : ""}${n}%`;
}

function trendColor(n: number | null): string | undefined {
  if (n === null) return undefined;
  return n > 0 ? "#2E7D32" : n < 0 ? "#C62828" : undefined;
}

// Crescimento da plataforma: contas, encomendas, vendas e entregas ao longo do tempo
export default function BoStatsGrowthScreen({ route }: any) {
  const [range, setRange] = useState({ from: route?.params?.from ?? "", to: route?.params?.to ?? "" });
  const loader = useLoader(() => getBoStatsGrowth({ from: range.from, to: range.to }), EMPTY, [range]);
  const d: any = loader.data;

  const series = (key: string) =>
    (d.items as any[]).slice(-31).map((x) => ({ label: d.monthly ? monthLabel(x.label) : dayLabel(x.label), value: x[key] }));
  const has = (key: string) => (d.items as any[]).some((x) => x[key] > 0);

  function block(title: string, key: string, color?: string) {
    return (
      <>
        <SubTitle>{title}</SubTitle>
        <Card>{has(key) ? <ColumnBars data={series(key)} /> : <Empty text="Sem dados neste período." />}</Card>
      </>
    );
  }

  return (
    <AdminLayout active="BoStats">
      <Page loader={loader}>
        <Title>📈 Crescimento da plataforma</Title>
        <Text style={u.muted}>Por defeito, os últimos 90 dias. Períodos longos (mais de 2 meses) aparecem somados por mês.</Text>

        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} />
        {d.from ? (
          <Text style={[u.muted, { marginTop: 6 }]}>
            Período: {formatDate(d.from)} a {formatDate(d.to)}
          </Text>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["👥 Contas agora", formatNumber(d.totals.usersNow), null],
              ["🆕 Contas novas", formatNumber(d.totals.newUsers), d.trend.newUsers],
              ["📦 Encomendas", formatNumber(d.totals.orders), d.trend.orders],
              ["💰 Vendas", money(d.totals.sales), d.trend.sales],
            ] as [string, string, number | null][]
          ).map(([label, value, trend]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
                {trend !== null ? <Text style={{ color: trendColor(trend), fontWeight: "bold", marginTop: 2 }}>{arrow(trend)}</Text> : null}
              </View>
            </View>
          ))}
        </View>
        {d.note ? <Text style={u.muted}>{d.note}</Text> : null}

        {block("Contas novas", "newUsers")}
        {block("Total de contas", "totalUsers")}
        {block("Produtos publicados", "products")}
        {block("Encomendas", "orders")}
        {block("Vendas concluídas (FCFA)", "sales")}
        {block("Entregas concluídas", "deliveries")}
      </Page>
    </AdminLayout>
  );
}
