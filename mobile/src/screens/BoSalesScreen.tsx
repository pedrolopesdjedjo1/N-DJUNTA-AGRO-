import React, { useState } from "react";
import { View, Text } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, SubTitle, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { ColumnBars, HBars } from "../components/ngo/Charts";
import { getBoSales } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { dayLabel, monthLabel } from "../constants/agentWork";
import { DEPARTMENT_ICON } from "../constants/backofficeMarket";
import { humanize } from "../constants/agentOps";
import { formatNumber } from "../utils/format";
import { money, formatDate } from "../constants/market";

const EMPTY = {
  from: null as any,
  to: null as any,
  summary: { count: 0, total: 0, average: 0, shipping: 0, net: 0, platformPercent: 0, platformEstimate: 0, capped: false },
  series: [] as any[],
  monthly: false,
  byRegion: [] as any[],
  byDepartment: [] as any[],
  byMethod: [] as any[],
  topSellers: [] as any[],
  topProducts: [] as any[],
  note: "",
};

export default function BoSalesScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const [range, setRange] = useState({ from: "", to: "" });
  const loader = useLoader(() => getBoSales({ from: range.from, to: range.to }), EMPTY, [range]);
  const d: any = loader.data;
  const s = d.summary;

  const chart = (d.series as any[]).slice(-31).map((x) => ({ label: d.monthly ? monthLabel(x.label) : dayLabel(x.label), value: x.amount }));

  return (
    <AdminLayout active="BoFinance">
      <Page loader={loader}>
        <Title>📈 Vendas</Title>
        <Text style={u.muted}>Encomendas concluídas ou entregues, pela data em que foram feitas.</Text>

        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} />
        {d.from ? (
          <Text style={[u.muted, { marginTop: 6 }]}>
            Período: {formatDate(d.from)} a {formatDate(d.to)}
          </Text>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["🧾 Encomendas", formatNumber(s.count)],
              ["💰 Valor vendido", money(s.total)],
              ["📊 Média por encomenda", money(s.average)],
              ["🚚 Transporte incluído", money(s.shipping)],
              ["🌾 Valor sem transporte", money(s.net)],
              [`🏦 Comissão da plataforma (${s.platformPercent}%)`, `≈ ${money(s.platformEstimate)}`],
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
        {s.capped ? <Text style={{ color: "#EF6C00" }}>⚠️ O período tem mais de 5000 encomendas. Escolha um período mais curto para números exatos.</Text> : null}

        <SubTitle>{d.monthly ? "Vendas por mês" : "Vendas por dia"}</SubTitle>
        <Card>{chart.some((c) => c.value > 0) ? <ColumnBars data={chart} /> : <Empty text="Sem vendas neste período." />}</Card>

        {d.byRegion.length > 0 ? (
          <>
            <SubTitle>Por região do vendedor</SubTitle>
            <Card>
              <HBars data={d.byRegion.map((x: any) => ({ label: x.name, value: x.amount }))} color="#2E7D32" />
            </Card>
          </>
        ) : null}

        {d.byDepartment.length > 0 ? (
          <>
            <SubTitle>Por categoria</SubTitle>
            <Card>
              <HBars
                data={d.byDepartment.map((x: any) => ({
                  label: `${DEPARTMENT_ICON[x.department] ?? ""} ${labelOf(catalog.departments, x.department) || x.department}`.trim(),
                  value: x.amount,
                }))}
                color="#1565C0"
              />
            </Card>
          </>
        ) : null}

        {d.byMethod.length > 0 ? (
          <>
            <SubTitle>Por forma de pagamento</SubTitle>
            <Card>
              <HBars data={d.byMethod.map((x: any) => ({ label: humanize(x.method), value: x.amount }))} color="#F9A825" />
            </Card>
          </>
        ) : null}

        <SubTitle>🏆 Melhores vendedores</SubTitle>
        {d.topSellers.length === 0 ? (
          <Empty text="Sem vendas neste período." />
        ) : (
          d.topSellers.map((x: any, i: number) => (
            <Card key={x.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {i + 1}. {x.name}
                </Text>
                <Text style={{ fontWeight: "bold" }}>{money(x.amount)}</Text>
              </View>
              <Text style={u.muted}>{x.count} encomenda(s)</Text>
              <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: x.id })} />
            </Card>
          ))
        )}

        <SubTitle>🛍️ Produtos mais vendidos</SubTitle>
        {d.topProducts.length === 0 ? (
          <Empty text="Sem produtos vendidos neste período." />
        ) : (
          d.topProducts.map((x: any, i: number) => (
            <Card key={`${x.title}-${i}`}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {i + 1}. {x.title}
                </Text>
                <Text style={{ fontWeight: "bold" }}>{money(x.amount)}</Text>
              </View>
              <Text style={u.muted}>{formatNumber(x.quantity)} unidade(s)</Text>
            </Card>
          ))
        )}

        {d.note ? <Text style={[u.muted, { marginTop: 10 }]}>{d.note}</Text> : null}
        <Btn kind="outline" label="📑 Gerar relatório financeiro" onPress={() => navigation.navigate("BoFinanceReport")} />
      </Page>
    </AdminLayout>
  );
}
