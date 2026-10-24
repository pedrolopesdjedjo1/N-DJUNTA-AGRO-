import React, { useCallback } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AgentLayout } from "../components/AgentTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { ColumnBars } from "../components/ngo/Charts";
import { getAgentEarnings, listAgentOrders } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { COMMISSION_COLOR, COMMISSION_ICON, dayLabel } from "../constants/agentWork";
import { formatNumber } from "../utils/format";
import { money, formatDate } from "../constants/market";

const ZERO = { amount: 0, orders: 0, sales: 0 };

const EMPTY = {
  earnings: {
    enabled: false,
    rate: 0,
    today: ZERO,
    week: ZERO,
    month: ZERO,
    totals: { pending: 0, paid: 0, entries: 0 },
    byDay: [] as any[],
    recent: [] as any[],
    note: "",
  },
  orders: null as any,
};

// Negócios e ganhos: vendas acompanhadas, pagamentos e (se a conta tiver comissão) os ganhos
export default function AgentEarningsScreen({ navigation }: any) {
  const catalog = useAgentCatalog();

  const loader = useLoader(
    async () => {
      const [earnings, orders] = await Promise.all([
        getAgentEarnings(),
        listAgentOrders({ scope: "open" })
          .then((r: any) => r.summary)
          .catch(() => null),
      ]);
      return { earnings, orders };
    },
    EMPTY
  );
  const d: any = loader.data;
  const e = d.earnings;
  const orders = d.orders;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const ranges: [string, any][] = [
    ["Hoje", e.today],
    ["Esta semana", e.week],
    ["Este mês", e.month],
  ];

  const hasChart = (e.byDay as any[]).some((x) => x.amount > 0);

  return (
    <AgentLayout active="AgentHome">
      <Page loader={loader}>
        <Title>💰 Negócios e ganhos</Title>
        <Text style={u.muted}>Acompanhe as vendas dos seus clientes, os pagamentos e, se a sua conta tiver comissão, os seus ganhos.</Text>

        {e.enabled ? (
          <>
            <SubTitle>Os meus ganhos (comissão de {e.rate}%)</SubTitle>
            <View style={u.grid}>
              {ranges.map(([label, r]) => (
                <View key={label} style={u.tile}>
                  <View style={u.tileBox}>
                    <Text style={[u.tileValue, { fontSize: 16 }]}>{money(r.amount)}</Text>
                    <Text style={u.tileLabel}>
                      {label} · {r.orders} encomenda(s)
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={u.grid}>
              {(
                [
                  ["⏳ A receber", e.totals.pending],
                  ["✅ Já recebido", e.totals.paid],
                ] as [string, number][]
              ).map(([label, value]) => (
                <View key={label} style={u.tile}>
                  <View style={u.tileBox}>
                    <Text style={[u.tileValue, { fontSize: 16 }]}>{money(value)}</Text>
                    <Text style={u.tileLabel}>{label}</Text>
                  </View>
                </View>
              ))}
            </View>

            <SubTitle>Últimos 14 dias</SubTitle>
            {hasChart ? (
              <Card>
                <ColumnBars data={(e.byDay as any[]).map((x) => ({ label: dayLabel(x.date), value: x.amount }))} />
              </Card>
            ) : (
              <Empty text="Ainda não há comissões nos últimos 14 dias." />
            )}
          </>
        ) : (
          <Card>
            <Text style={u.strong}>Sem comissão na sua conta</Text>
            <Text style={u.muted}>
              A equipa do NÔDJUNTA AGRO define a comissão de cada agente. Enquanto não houver comissão, continua a poder acompanhar as vendas e os pagamentos dos seus clientes.
            </Text>
          </Card>
        )}

        <SubTitle>Negócios dos meus clientes</SubTitle>
        {orders ? (
          <View style={u.grid}>
            {(
              [
                ["📦 Em aberto", formatNumber(orders.open)],
                ["💰 Valor em aberto", money(orders.openValue)],
                ["🏁 Concluídas (30 dias)", formatNumber(orders.completed30)],
                ["💼 Vendido (30 dias)", money(orders.completedValue30)],
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
        ) : (
          <Text style={u.muted}>Não foi possível carregar os negócios agora.</Text>
        )}

        <View style={u.row}>
          <Btn small label="📦 Ver encomendas" onPress={() => navigation.navigate("AgentOrders")} />
          <Btn small kind="outline" label="💳 Pagamentos" onPress={() => navigation.navigate("AgentPayments")} />
          <Btn small kind="outline" label="📑 Relatório" onPress={() => navigation.navigate("AgentReport")} />
          {e.enabled ? <Btn small kind="outline" label="🧾 Histórico financeiro" onPress={() => navigation.navigate("AgentCommissions")} /> : null}
        </View>

        {e.enabled ? (
          <>
            <SubTitle>Últimas comissões</SubTitle>
            {e.recent.length === 0 ? (
              <Empty text="Ainda não tem comissões. Elas aparecem quando uma encomenda feita com a sua ajuda é concluída." />
            ) : (
              e.recent.map((c: any) => (
                <Card key={c.id}>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>+ {money(c.amount)}</Text>
                    <Badge label={labelOf(catalog.commissionStatus, c.status) || c.status} color={COMMISSION_COLOR[c.status] ?? "#757575"} />
                  </View>
                  <Text style={u.muted}>
                    {COMMISSION_ICON[c.reason] ?? "•"} {labelOf(catalog.commissionReasons, c.reason) || c.reason}
                  </Text>
                  <Text style={u.muted}>
                    {c.clientName ? `${c.clientName} · ` : ""}
                    {formatDate(c.orderCompletedAt)}
                  </Text>
                </Card>
              ))
            )}
          </>
        ) : null}

        {e.note ? <Text style={[u.muted, { marginTop: 12 }]}>{e.note}</Text> : null}
      </Page>
    </AgentLayout>
  );
}
