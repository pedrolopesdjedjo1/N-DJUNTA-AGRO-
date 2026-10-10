import React from "react";
import { View, Text } from "react-native";
import { MerchantLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Badge, Empty, useLoader, u } from "../components/ui";
import { getSales } from "../api/merchant";
import { ORDER_STATUS, money, formatDate } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = {
  today: 0,
  week: 0,
  month: 0,
  totalReceived: 0,
  pendingPayments: 0,
  history: [] as any[],
  report: [] as any[],
};

export default function MerchantSalesScreen() {
  const loader = useLoader(getSales, EMPTY);
  const d: any = loader.data;

  const last = d.report.slice(-14);
  const max = Math.max(1, ...last.map((r: any) => r.total));
  const totalLast = last.reduce((sum: number, r: any) => sum + r.total, 0);

  const tiles = [
    ["💰 Vendas de hoje", d.today],
    ["📅 Vendas da semana", d.week],
    ["🗓️ Vendas do mês", d.month],
    ["✅ Total recebido", d.totalReceived],
    ["⏳ Pagamentos pendentes", d.pendingPayments],
  ];

  return (
    <MerchantLayout active="MerchantSales">
      <Page loader={loader}>
        <Title>💰 Vendas e ganhos</Title>

        <View style={u.grid}>
          {tiles.map(([label, value]) => (
            <View key={String(label)} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{money(value as number)}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <SubTitle>📊 Relatório dos últimos 14 dias</SubTitle>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100 }}>
            {last.map((r: any) => (
              <View key={r.date} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: 100 }}>
                <View
                  style={{
                    width: 10,
                    height: Math.max(2, (r.total / max) * 80),
                    backgroundColor: colors.primary,
                    borderRadius: 3,
                  }}
                />
                <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2 }}>{r.date.slice(8, 10)}</Text>
              </View>
            ))}
          </View>
          <Text style={[u.muted, { marginTop: 8 }]}>Total no período: {money(totalLast)}</Text>
        </Card>

        <SubTitle>🧾 Histórico</SubTitle>
        {d.history.length === 0 ? (
          <Empty text="Ainda não há vendas." />
        ) : (
          d.history.map((o: any) => {
            const st = ORDER_STATUS[o.status];
            return (
              <Card key={o.id}>
                <View style={u.between}>
                  <Text style={u.strong}>#{o.id.slice(0, 6).toUpperCase()}</Text>
                  <Badge label={st?.label ?? o.status} color={st?.color ?? "#757575"} />
                </View>
                <Text style={u.muted}>
                  {formatDate(o.createdAt)} · {o.buyerName}
                </Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{money(o.total)}</Text>
                <Text style={u.muted}>{o.paid ? "Pago" : "Por pagar"}</Text>
              </Card>
            );
          })
        )}
      </Page>
    </MerchantLayout>
  );
}
