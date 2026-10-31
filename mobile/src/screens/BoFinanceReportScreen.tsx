import React, { useState } from "react";
import { View, Text, Share, Alert, Platform } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, SubTitle, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { getBoFinanceReport } from "../api/backoffice";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

const EMPTY = { report: null as any };
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

// Relatório financeiro em texto, pronto para partilhar
export default function BoFinanceReportScreen({ navigation }: any) {
  const [range, setRange] = useState({ from: "", to: "" });
  const loader = useLoader(async () => ({ report: await getBoFinanceReport({ from: range.from, to: range.to }) }), EMPTY, [range]);
  const r: any = loader.data.report;
  const m = r?.metrics;

  async function share() {
    if (!r) return;
    try {
      await Share.share({ message: r.text, title: "Relatório financeiro" });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível partilhar o relatório."));
    }
  }

  function tiles(list: [string, string][]) {
    return (
      <View style={u.grid}>
        {list.map(([label, value]) => (
          <View key={label} style={u.tile}>
            <View style={u.tileBox}>
              <Text style={[u.tileValue, { fontSize: 14 }]}>{value}</Text>
              <Text style={u.tileLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <AdminLayout active="BoFinance">
      <Page loader={loader}>
        <Title>📑 Relatório financeiro</Title>
        <Text style={u.muted}>Escolha o período. O relatório fica em texto, pronto para enviar por mensagem ou por e-mail. Sem nomes nem contactos de clientes.</Text>

        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} />

        {!m ? (
          <Empty text="A carregar..." />
        ) : (
          <>
            <Text style={[u.muted, { marginTop: 6 }]}>
              Período: {formatDate(r.from)} a {formatDate(r.to)}
            </Text>
            <Btn label="📤 Partilhar relatório" onPress={share} />

            <SubTitle>Vendas</SubTitle>
            {tiles([
              ["🧾 Encomendas concluídas", formatNumber(m.sales.count)],
              ["💰 Valor vendido", money(m.sales.total)],
              ["📊 Média", money(m.sales.average)],
              ["🚚 Transporte incluído", money(m.sales.shipping)],
              [`🏦 Comissão da plataforma (${m.sales.platformPercent}%)`, `≈ ${money(m.sales.platformEstimate)}`],
            ])}

            <SubTitle>Pagamentos</SubTitle>
            {tiles([
              [`✅ Confirmados (${m.payments.confirmedCount})`, money(m.payments.confirmed)],
              [`⏳ Por confirmar agora (${m.payments.pendingCount})`, money(m.payments.pending)],
            ])}

            <SubTitle>Reembolsos</SubTitle>
            {tiles([
              [`💸 Pagos (${m.refunds.paidCount})`, money(m.refunds.paid)],
              [`⏳ Em curso (${m.refunds.openCount})`, money(m.refunds.open)],
            ])}

            <SubTitle>Comissões de agentes</SubTitle>
            {tiles([
              [`💸 Pagas no período (${m.commissions.paidCount})`, money(m.commissions.paid)],
              [`⏳ Por pagar (${m.commissions.pendingCount})`, money(m.commissions.pending)],
            ])}

            <Card>
              <Text style={u.strong}>🚨 Alertas de transações por rever: {m.suspiciousOpen}</Text>
              {m.suspiciousOpen > 0 ? <Btn small kind="outline" label="Ver os alertas" onPress={() => navigation.navigate("BoFlags")} /> : null}
            </Card>

            <SubTitle>Pré-visualização</SubTitle>
            <Card>
              <Text selectable style={{ fontFamily: MONO, fontSize: 12, lineHeight: 18 }}>
                {r.text}
              </Text>
            </Card>
            <Text style={[u.muted, { marginTop: 8 }]}>Os valores são os registados pelos utilizadores e pela equipa: o app não movimenta dinheiro.</Text>

            <View style={u.row}>
              <Btn small kind="outline" label="📈 Vendas em detalhe" onPress={() => navigation.navigate("BoSales")} />
              <Btn small kind="outline" label="🧾 Transações" onPress={() => navigation.navigate("BoTransactions")} />
            </View>
          </>
        )}
      </Page>
    </AdminLayout>
  );
}
