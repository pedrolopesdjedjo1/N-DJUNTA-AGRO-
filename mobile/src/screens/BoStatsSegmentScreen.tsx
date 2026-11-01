import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { ColumnBars, HBars } from "../components/ngo/Charts";
import { getBoStatsSegment } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { dayLabel, monthLabel } from "../constants/agentWork";
import { DEPARTMENT_ICON } from "../constants/backofficeMarket";
import { formatNumber } from "../utils/format";
import { money, formatDate } from "../constants/market";

const EMPTY = {
  from: null as any,
  to: null as any,
  label: "",
  totals: { accounts: 0, active: 0, new: 0, verified: 0, verifiedShare: 0 },
  market: { productsAvailable: 0, byDepartment: [] as any[] },
  sales: { completed: 0, amount: 0, activeSellers: 0, average: 0 },
  topSellers: [] as any[],
  topRegions: [] as any[],
  series: [] as any[],
  monthly: false,
  organizations: null as any,
};

// Relatório de um grupo: agricultores, pescadores, artesãos, comerciantes, transportadores, ONGs ou instituições
export default function BoStatsSegmentScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();
  const [kind, setKind] = useState<string>(route?.params?.kind ?? "AGRICULTORES");
  const [range, setRange] = useState({ from: route?.params?.from ?? "", to: route?.params?.to ?? "" });
  const loader = useLoader(() => getBoStatsSegment(kind, { from: range.from, to: range.to }), EMPTY, [kind, range]);
  const d: any = loader.data;

  const chart = (d.series as any[]).slice(-31).map((x) => ({ label: d.monthly ? monthLabel(x.label) : dayLabel(x.label), value: x.newAccounts }));
  const selling = !["ONGS", "INSTITUICOES", "TRANSPORTADORES"].includes(kind);

  return (
    <AdminLayout active="BoStats">
      <Page loader={loader}>
        <Title>{d.label ? `📊 ${d.label}` : "📊 Relatório por grupo"}</Title>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {catalog.statSegments.map((s: any) => (
            <Chip key={s.value} label={`${s.icon} ${s.label}`} active={kind === s.value} onPress={() => setKind(s.value)} />
          ))}
        </ScrollView>

        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} />
        {d.from ? (
          <Text style={[u.muted, { marginTop: 6 }]}>
            Período: {formatDate(d.from)} a {formatDate(d.to)}
          </Text>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["Contas", formatNumber(d.totals.accounts)],
              ["Ativas", formatNumber(d.totals.active)],
              ["Novas no período", formatNumber(d.totals.new)],
              ["Verificadas", `${d.totals.verifiedShare}%`],
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
        <View style={u.row}>
          <Btn small kind="outline" label="Ver as contas" onPress={() => navigation.navigate("BoProfiles", { kind })} />
        </View>

        <SubTitle>Contas novas</SubTitle>
        <Card>{chart.some((c) => c.value > 0) ? <ColumnBars data={chart} /> : <Empty text="Sem contas novas neste período." />}</Card>

        {d.topRegions.length > 0 ? (
          <>
            <SubTitle>Onde estão</SubTitle>
            <Card>
              <HBars data={d.topRegions.map((x: any) => ({ label: x.region, value: x.count }))} color="#00838F" />
            </Card>
          </>
        ) : null}

        {selling ? (
          <>
            <SubTitle>Vendas no período</SubTitle>
            <View style={u.grid}>
              {(
                [
                  ["Vendas concluídas", formatNumber(d.sales.completed)],
                  ["Valor vendido", money(d.sales.amount)],
                  ["Vendedores ativos", formatNumber(d.sales.activeSellers)],
                  ["Média por venda", money(d.sales.average)],
                ] as [string, string][]
              ).map(([label, value]) => (
                <View key={label} style={u.tile}>
                  <View style={u.tileBox}>
                    <Text style={[u.tileValue, { fontSize: 14 }]}>{value}</Text>
                    <Text style={u.tileLabel}>{label}</Text>
                  </View>
                </View>
              ))}
            </View>

            {d.market.byDepartment.length > 0 ? (
              <>
                <SubTitle>Produtos à venda ({formatNumber(d.market.productsAvailable)})</SubTitle>
                <Card>
                  <HBars
                    data={d.market.byDepartment.map((x: any) => ({ label: `${DEPARTMENT_ICON[x.department] ?? ""} ${labelOf(catalog.departments, x.department) || x.department}`.trim(), value: x.count }))}
                    color="#2E7D32"
                  />
                </Card>
              </>
            ) : null}

            <SubTitle>🏆 Melhores vendedores</SubTitle>
            {d.topSellers.length === 0 ? (
              <Empty text="Sem vendas neste período." />
            ) : (
              d.topSellers.map((s: any, i: number) => (
                <Card key={s.id}>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                      {i + 1}. {s.name}
                    </Text>
                    <Text style={{ fontWeight: "bold" }}>{money(s.sales)}</Text>
                  </View>
                  <Text style={u.muted}>{s.orders} venda(s)</Text>
                  <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: s.id })} />
                </Card>
              ))
            )}
          </>
        ) : null}

        {d.organizations ? (
          <>
            <SubTitle>Organizações</SubTitle>
            <Card>
              <Text>Com perfil preenchido: {d.organizations.withProfile}</Text>
              <Text>Verificadas: {d.organizations.verified}</Text>
              <Text>📋 Projetos: {d.organizations.projects}</Text>
              <Text>📰 Publicações: {d.organizations.publications}</Text>
              <Text>🎯 Oportunidades: {d.organizations.opportunities}</Text>
              <Btn small kind="outline" label="Ver as organizações" onPress={() => navigation.navigate("BoOrgs", { kind: kind === "INSTITUICOES" ? "GOV" : "ONG" })} />
            </Card>
          </>
        ) : null}

        {kind === "TRANSPORTADORES" ? (
          <Btn small kind="outline" label="🚚 Ver o painel de transportes" onPress={() => navigation.navigate("BoTransport")} />
        ) : null}
      </Page>
    </AdminLayout>
  );
}
