import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { ColumnBars } from "../components/ngo/Charts";
import { getTrEarnings } from "../api/transporterV2";
import { PAYOUT_COLOR, PAYOUT_ICON } from "../constants/transporterMoney";
import { dayLabel } from "../constants/agentWork";
import { formatNumber } from "../utils/format";
import { money, formatDate } from "../constants/market";

const ZERO = { amount: 0, net: 0, commission: 0, count: 0 };

const EMPTY = {
  today: ZERO,
  week: ZERO,
  month: ZERO,
  total: ZERO,
  withoutValue: 0,
  byDay: [] as any[],
  pending: ZERO,
  received: ZERO,
  contested: ZERO,
  expenses: { week: 0, month: 0 },
  profitMonth: 0,
  commission: { percent: 0, month: 0 },
  recent: [] as any[],
  note: "",
};

export default function TrEarningsScreen({ navigation }: any) {
  const loader = useLoader(getTrEarnings, EMPTY);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const chart = (d.byDay as any[]).map((x) => ({ label: dayLabel(x.date), value: x.amount }));
  const hasCommission = d.commission.percent > 0;

  const periods: [string, any][] = [
    ["Hoje", d.today],
    ["Esta semana", d.week],
    ["Este mês", d.month],
  ];

  return (
    <TrLayout active="TrEarnings">
      <Page loader={loader}>
        <Title>💰 Ganhos</Title>
        <Text style={u.muted}>O valor do transporte de cada entrega concluída. O app não movimenta dinheiro: confirme aqui quando o receber.</Text>

        <View style={u.grid}>
          {periods.map(([label, r]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{money(r.net)}</Text>
                <Text style={u.tileLabel}>
                  {label} · {formatNumber(r.count)} entrega(s)
                </Text>
              </View>
            </View>
          ))}
        </View>
        {hasCommission ? (
          <Text style={u.muted}>
            Os valores são líquidos, depois da comissão de {d.commission.percent}% (este mês: {money(d.commission.month)} retidos).
          </Text>
        ) : (
          <Text style={u.muted}>Sem comissão sobre o transporte.</Text>
        )}

        {d.pending.count > 0 ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("TrPayments", { status: "PENDENTE" })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>⏳ {money(d.pending.net)} por receber</Text>
                <Badge label={`${d.pending.count} entrega(s)`} color={PAYOUT_COLOR.PENDENTE} />
              </View>
              <Text style={u.muted}>Já recebeu? Confirme. Não chegou? Reclame. Toque para ver.</Text>
            </Card>
          </TouchableOpacity>
        ) : null}

        {d.contested.count > 0 ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("TrPayments", { status: "CONTESTADO" })}>
            <Card>
              <Text style={{ color: "#C62828", fontWeight: "bold" }}>
                ⚠️ {d.contested.count} pagamento(s) reclamado(s), {money(d.contested.net)}
              </Text>
              <Text style={u.muted}>A equipa está a analisar. Recebe uma resposta por notificação.</Text>
            </Card>
          </TouchableOpacity>
        ) : null}

        {d.withoutValue > 0 ? (
          <Text style={{ color: "#EF6C00", marginTop: 6 }}>
            {d.withoutValue} entrega(s) concluída(s) sem valor de transporte registado na encomenda.
          </Text>
        ) : null}

        <SubTitle>Este mês</SubTitle>
        <Card>
          <View style={u.between}>
            <Text>Ganho líquido</Text>
            <Text style={{ fontWeight: "bold" }}>{money(d.month.net)}</Text>
          </View>
          <View style={[u.between, { marginTop: 4 }]}>
            <Text>Despesas do veículo</Text>
            <Text style={{ fontWeight: "bold", color: "#C62828" }}>− {money(d.expenses.month)}</Text>
          </View>
          <View style={[u.between, { marginTop: 8, borderTopWidth: 1, borderTopColor: "#ECEFF1", paddingTop: 8 }]}>
            <Text style={u.strong}>Resultado</Text>
            <Text style={{ fontWeight: "bold", fontSize: 17, color: d.profitMonth >= 0 ? "#2E7D32" : "#C62828" }}>{money(d.profitMonth)}</Text>
          </View>
          <View style={u.row}>
            <Btn small kind="outline" label="🧾 Despesas" onPress={() => navigation.navigate("TrExpenses")} />
            <Btn small kind="outline" label="📑 Relatório" onPress={() => navigation.navigate("TrFinanceReport")} />
          </View>
        </Card>

        <SubTitle>Últimos 14 dias</SubTitle>
        <Card>{chart.some((c) => c.value > 0) ? <ColumnBars data={chart} /> : <Empty text="Ainda sem entregas concluídas nestes dias." />}</Card>

        <SubTitle>Pagamentos</SubTitle>
        <View style={u.grid}>
          {(
            [
              ["⏳ Por receber", d.pending, "PENDENTE"],
              ["✅ Recebidos", d.received, "RECEBIDO"],
            ] as [string, any, string][]
          ).map(([label, r, status]) => (
            <TouchableOpacity key={label} style={u.tile} onPress={() => navigation.navigate("TrPayments", { status })}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{money(r.net)}</Text>
                <Text style={u.tileLabel}>
                  {label} · {formatNumber(r.count)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Btn kind="outline" label="Ver todos os pagamentos" onPress={() => navigation.navigate("TrPayments")} />

        <SubTitle>Valor por entrega (últimas)</SubTitle>
        {d.recent.length === 0 ? (
          <Empty text="Ainda não concluiu entregas com valor de transporte." />
        ) : (
          d.recent.map((r: any) => (
            <TouchableOpacity key={r.payoutId} activeOpacity={0.85} onPress={() => navigation.navigate("TrDelivery", { id: r.id })}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>Entrega {r.orderCode}</Text>
                  <Text style={{ fontWeight: "bold", fontSize: 16 }}>{money(r.net)}</Text>
                </View>
                <Text style={u.muted} numberOfLines={1}>
                  {[r.pickup, r.destination].filter(Boolean).join(" → ") || "—"}
                </Text>
                <View style={[u.between, { marginTop: 4 }]}>
                  <Text style={u.muted}>{formatDate(r.deliveredAt)}</Text>
                  <Badge label={`${PAYOUT_ICON[r.status] ?? ""} ${r.status === "RECEBIDO" ? "Recebido" : r.status === "PENDENTE" ? "Por receber" : "Reclamado"}`.trim()} color={PAYOUT_COLOR[r.status] ?? "#757575"} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {d.note ? <Text style={[u.muted, { marginTop: 10 }]}>{d.note}</Text> : null}
      </Page>
    </TrLayout>
  );
}
