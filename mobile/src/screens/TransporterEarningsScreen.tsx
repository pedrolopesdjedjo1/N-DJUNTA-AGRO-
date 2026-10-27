import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { TransporterLayout } from "../components/TransporterTabs";
import { Page, Title, SubTitle, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { ColumnBars } from "../components/ngo/Charts";
import { getTransporterEarnings } from "../api/transporter";
import { dayLabel } from "../constants/agentWork";
import { formatNumber } from "../utils/format";
import { money, formatDate } from "../constants/market";
import { colors } from "../theme/colors";

const ZERO = { amount: 0, count: 0 };

const EMPTY = {
  today: ZERO,
  week: ZERO,
  month: ZERO,
  total: ZERO,
  withoutValue: 0,
  byDay: [] as any[],
  recent: [] as any[],
  note: "",
};

// Ganhos do transportador: o valor do transporte das entregas concluídas
export default function TransporterEarningsScreen({ navigation }: any) {
  const loader = useLoader(getTransporterEarnings, EMPTY);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const ranges: [string, any][] = [
    ["Hoje", d.today],
    ["Esta semana", d.week],
    ["Este mês", d.month],
  ];

  const hasChart = (d.byDay as any[]).some((x) => x.amount > 0);
  const average = d.total.count ? Math.round(d.total.amount / d.total.count) : 0;

  return (
    <TransporterLayout active="TransporterEarnings">
      <Page loader={loader}>
        <Title>💰 Ganhos</Title>
        <Text style={u.muted}>O valor do transporte das entregas que concluiu. O app não movimenta dinheiro: o pagamento combina-se com quem encomenda.</Text>

        <View style={u.grid}>
          {ranges.map(([label, r]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 16, color: colors.primary }]}>{money(r.amount)}</Text>
                <Text style={u.tileLabel}>
                  {label} · {r.count} entrega(s)
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={u.grid}>
          {(
            [
              ["💼 Total desde o início", money(d.total.amount)],
              ["✅ Entregas concluídas", formatNumber(d.total.count)],
              ["📊 Média por entrega", money(average)],
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

        {d.withoutValue > 0 ? (
          <Card>
            <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>⚠️ {d.withoutValue} entrega(s) sem valor indicado</Text>
            <Text style={u.muted}>Estas entregas contam como zero. Combine o valor do transporte com o comprador antes de aceitar.</Text>
          </Card>
        ) : null}

        <SubTitle>Últimos 14 dias</SubTitle>
        {hasChart ? (
          <Card>
            <ColumnBars data={(d.byDay as any[]).map((x) => ({ label: dayLabel(x.date), value: x.amount }))} />
          </Card>
        ) : (
          <Empty text="Ainda não há ganhos nos últimos 14 dias." />
        )}

        <View style={u.row}>
          <Btn small label="🧾 Histórico financeiro" onPress={() => navigation.navigate("TransporterEarningsHistory")} />
          <Btn small kind="outline" label="📑 Relatório" onPress={() => navigation.navigate("TransporterReport")} />
          <Btn small kind="outline" label="⭐ Avaliações" onPress={() => navigation.navigate("TransporterRatings")} />
        </View>

        <SubTitle>Últimas entregas pagas</SubTitle>
        {d.recent.length === 0 ? (
          <Empty text="Ainda não concluiu entregas. Os ganhos aparecem aqui depois da primeira." />
        ) : (
          d.recent.map((r: any) => (
            <TouchableOpacity key={r.id} activeOpacity={0.85} onPress={() => navigation.navigate("TransporterDelivery", { id: r.id })}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>Entrega {r.orderCode}</Text>
                  <Text style={{ fontWeight: "bold", color: r.payout ? colors.primary : "#757575" }}>{r.payout ? `+ ${money(r.payout)}` : "sem valor"}</Text>
                </View>
                <Text style={u.muted} numberOfLines={1}>
                  📍 {r.pickup ?? "Recolha"} → 🏁 {r.destination ?? "Destino"}
                </Text>
                <Text style={u.muted}>Concluída em {formatDate(r.deliveredAt)}</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {d.note ? <Text style={[u.muted, { marginTop: 12 }]}>{d.note}</Text> : null}
      </Page>
    </TransporterLayout>
  );
}
