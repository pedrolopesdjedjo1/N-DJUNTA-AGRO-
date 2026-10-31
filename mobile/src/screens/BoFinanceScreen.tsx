import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { ColumnBars } from "../components/ngo/Charts";
import { getBoFinanceOverview } from "../api/backoffice";
import { adminCan } from "../utils/adminSession";
import { FINANCE_MENU } from "../constants/backofficeFinance";
import { dayLabel } from "../constants/agentWork";
import { formatNumber } from "../utils/format";
import { money } from "../constants/market";

const ZERO = { count: 0, amount: 0 };

const EMPTY = {
  sales: { today: ZERO, week: ZERO, month: ZERO },
  platform: { percent: 0, estimated30: 0 },
  payments: { pending: 0, pendingValue: 0, pendingOver3Days: 0 },
  refunds: { toDecide: 0, toPay: 0, toPayValue: 0, toCreate: 0 },
  commissions: { pending: 0, entries: 0 },
  suspicious: { open: 0, high: 0 },
  trend: [] as any[],
};

export default function BoFinanceScreen({ navigation }: any) {
  const loader = useLoader(getBoFinanceOverview, EMPTY);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const attention: { key: string; level: string; text: string; route: string; params?: Record<string, any> }[] = [
    d.suspicious.high > 0 && { key: "flags", level: "ALTA", text: `${d.suspicious.high} alerta(s) de transações suspeitas de gravidade alta`, route: "BoFlags" },
    d.payments.pendingOver3Days > 0 && { key: "late", level: "ALTA", text: `${d.payments.pendingOver3Days} pagamento(s) por confirmar há mais de 3 dias`, route: "BoPayments", params: { state: "PENDENTE" } },
    d.refunds.toDecide > 0 && { key: "decide", level: "MEDIA", text: `${d.refunds.toDecide} reembolso(s) por decidir`, route: "BoRefunds", params: { tab: "PENDENTE" } },
    d.refunds.toPay > 0 && { key: "pay", level: "MEDIA", text: `${d.refunds.toPay} reembolso(s) aprovado(s) por pagar (${money(d.refunds.toPayValue)})`, route: "BoRefunds", params: { tab: "APROVADO" } },
    d.refunds.toCreate > 0 && { key: "create", level: "MEDIA", text: `${d.refunds.toCreate} disputa(s) decidida(s) com devolução, sem pedido de reembolso`, route: "BoRefunds", params: { tab: "CANDIDATES" } },
    d.commissions.entries > 0 && { key: "comm", level: "INFO", text: `${d.commissions.entries} comissão(ões) de agentes por pagar (${money(d.commissions.pending)})`, route: "BoCommissions" },
  ].filter(Boolean) as any[];

  const chart = (d.trend as any[]).map((x) => ({ label: dayLabel(x.date), value: x.amount }));

  const periods: [string, any][] = [
    ["Hoje", d.sales.today],
    ["Últimos 7 dias", d.sales.week],
    ["Últimos 30 dias", d.sales.month],
  ];

  return (
    <AdminLayout active="BoFinance">
      <Page loader={loader}>
        <Title>💰 Financeiro</Title>
        <Text style={u.muted}>Vendas, pagamentos, comissões e reembolsos. O app não movimenta dinheiro: a equipa regista o que decide e o que paga fora do app.</Text>

        <SubTitle>⚠️ Precisa de atenção</SubTitle>
        {attention.length === 0 ? (
          <Text style={u.muted}>Tudo em dia. Nada à espera da equipa.</Text>
        ) : (
          attention.map((a) => (
            <TouchableOpacity key={a.key} activeOpacity={0.85} onPress={() => navigation.navigate(a.route, a.params)}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{a.text}</Text>
                  <Badge label={a.level === "ALTA" ? "Urgente" : a.level === "MEDIA" ? "Atenção" : "Info"} color={a.level === "ALTA" ? "#C62828" : a.level === "MEDIA" ? "#EF6C00" : "#757575"} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <SubTitle>Vendas concluídas</SubTitle>
        <View style={u.grid}>
          {periods.map(([label, r]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{money(r.amount)}</Text>
                <Text style={u.tileLabel}>
                  {label} · {formatNumber(r.count)} encomenda(s)
                </Text>
              </View>
            </View>
          ))}
        </View>

        <SubTitle>Vendas (14 dias)</SubTitle>
        <Card>{chart.some((c) => c.value > 0) ? <ColumnBars data={chart} /> : <Empty text="Sem vendas concluídas nestes dias." />}</Card>

        <SubTitle>Resumo</SubTitle>
        <View style={u.grid}>
          {(
            [
              ["⏳ Pagamentos por confirmar", `${formatNumber(d.payments.pending)} · ${money(d.payments.pendingValue)}`],
              ["↩️ Reembolsos por decidir", formatNumber(d.refunds.toDecide)],
              ["💸 Reembolsos por pagar", `${formatNumber(d.refunds.toPay)} · ${money(d.refunds.toPayValue)}`],
              ["🤝 Comissões por pagar", money(d.commissions.pending)],
              ["🚨 Alertas por rever", formatNumber(d.suspicious.open)],
              [`🏦 Comissão da plataforma (${d.platform.percent}%)`, `≈ ${money(d.platform.estimated30)}`],
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
        <Text style={u.muted}>A comissão da plataforma é uma estimativa sobre as vendas dos últimos 30 dias, sem o transporte. A percentagem muda-se nas configurações.</Text>

        <SubTitle>Gestão</SubTitle>
        <View style={u.grid}>
          {FINANCE_MENU.filter(([, , , , perms]) => adminCan(...perms)).map(([icon, label, route, params]) => (
            <TouchableOpacity key={route} style={u.tile} onPress={() => navigation.navigate(route, params)}>
              <View style={u.tileBox}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {adminCan("stats.view") ? <Btn small kind="outline" label="📊 Relatórios e estatísticas da plataforma" onPress={() => navigation.navigate("BoStats")} /> : null}
      </Page>
    </AdminLayout>
  );
}
