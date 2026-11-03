import React, { useState } from "react";
import { View, Text, Share, Alert, Platform } from "react-native";
import TrLayout from "../components/transporter/TrLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, SubTitle, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { HBars } from "../components/ngo/Charts";
import { getTrFinanceReport } from "../api/transporterV2";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

const EMPTY = { report: null as any };
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

// Relatório financeiro do transportador, em texto pronto para partilhar
export default function TrFinanceReportScreen({ route }: any) {
  const [range, setRange] = useState({ from: route?.params?.from ?? "", to: route?.params?.to ?? "" });
  const loader = useLoader(async () => ({ report: await getTrFinanceReport({ from: range.from, to: range.to }) }), EMPTY, [range]);
  const r: any = loader.data.report;
  const m = r?.metrics;

  async function share() {
    if (!r) return;
    try {
      await Share.share({ message: r.text, title: "Relatório financeiro do transportador" });
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
    <TrLayout active="TrEarnings">
      <Page loader={loader}>
        <Title>📑 Relatório financeiro</Title>
        <Text style={u.muted}>Escolha o período. O relatório fica em texto, pronto para enviar por mensagem ou guardar. Por defeito, os últimos 30 dias.</Text>

        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} />

        {!m ? (
          <Empty text="A carregar..." />
        ) : (
          <>
            <Text style={[u.muted, { marginTop: 6 }]}>
              Período: {formatDate(r.from)} a {formatDate(r.to)}
            </Text>
            <Btn label="📤 Partilhar relatório" onPress={share} />

            <SubTitle>Ganhos</SubTitle>
            {tiles([
              ["🚚 Entregas", formatNumber(m.deliveries)],
              ["💰 Valor dos transportes", money(m.gross)],
              ["🏦 Comissão retida", money(m.commission)],
              ["✅ Ganho líquido", money(m.net)],
            ])}

            <SubTitle>Pagamentos</SubTitle>
            {tiles([
              [`✅ Recebido (${m.received.count})`, money(m.received.net)],
              [`⏳ Por receber (${m.pending.count})`, money(m.pending.net)],
              [`⚠️ Reclamado (${m.contested.count})`, money(m.contested.net)],
            ])}

            <SubTitle>Despesas do veículo</SubTitle>
            <Card>
              <Text style={[u.strong, { color: "#C62828" }]}>− {money(m.expenses)}</Text>
              {m.expensesByKind.length > 0 ? (
                <HBars data={m.expensesByKind.map((k: any) => ({ label: k.label, value: k.amount }))} color="#C62828" />
              ) : (
                <Text style={u.muted}>Sem despesas registadas neste período.</Text>
              )}
            </Card>

            <Card>
              <View style={u.between}>
                <Text style={u.strong}>Resultado do período</Text>
                <Text style={{ fontWeight: "bold", fontSize: 18, color: m.profit >= 0 ? "#2E7D32" : "#C62828" }}>{money(m.profit)}</Text>
              </View>
              <Text style={u.muted}>Ganho líquido menos despesas.</Text>
            </Card>

            <SubTitle>Pré-visualização</SubTitle>
            <Card>
              <Text selectable style={{ fontFamily: MONO, fontSize: 12, lineHeight: 18 }}>
                {r.text}
              </Text>
            </Card>
            <Text style={[u.muted, { marginTop: 8 }]}>Os valores são os registados no app, que não movimenta dinheiro.</Text>
          </>
        )}
      </Page>
    </TrLayout>
  );
}
