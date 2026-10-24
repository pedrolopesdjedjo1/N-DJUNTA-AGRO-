import React, { useCallback, useRef, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { ColumnBars } from "../components/ngo/Charts";
import { listAgentCommissions } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { COMMISSION_COLOR, COMMISSION_ICON, monthLabel, periodStarts } from "../constants/agentWork";
import { shortId } from "../constants/agentOps";
import { isDateText, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

const EMPTY_SUMMARY = { entries: 0, amount: 0, sales: 0, pending: 0, paid: 0, voided: 0 };

// Histórico financeiro: todas as comissões, por período, estado e motivo
export default function AgentCommissionsScreen({ navigation }: any) {
  const catalog = useAgentCatalog();

  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [byMonth, setByMonth] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const key = JSON.stringify({ status, reason, range });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listAgentCommissions({ status, reason, from: range.from, to: range.to, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setSummary(r.summary);
      setByMonth(r.byMonth);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar o histórico."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
  );

  const starts = periodStarts();

  function setQuick(from: string, to: string) {
    setFromText(from);
    setToText(to);
    setRange({ from, to });
  }

  function applyRange() {
    if ((fromText.trim() && !isDateText(fromText.trim())) || (toText.trim() && !isDateText(toText.trim()))) {
      Alert.alert("Atenção", "Escreva as datas assim: AAAA-MM-DD (ex: 2026-10-01).");
      return;
    }
    setRange({ from: fromText.trim(), to: toText.trim() });
  }

  const chart = [...byMonth]
    .reverse()
    .slice(-12)
    .map((m) => ({ label: monthLabel(m.month), value: m.amount }));

  return (
    <Page>
      <Title>🧾 Histórico financeiro</Title>
      <Text style={u.muted}>As comissões das encomendas concluídas. Os valores são previstos: o pagamento é feito pela equipa do NÔDJUNTA AGRO.</Text>

      <View style={u.grid}>
        {(
          [
            ["💰 Total do período", money(summary.amount)],
            ["⏳ A receber", money(summary.pending)],
            ["✅ Pago", money(summary.paid)],
            ["🛒 Vendas que geraram comissão", money(summary.sales)],
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

      <SubTitle>Período</SubTitle>
      <View style={u.row}>
        <Chip label="Tudo" active={!range.from && !range.to} onPress={() => setQuick("", "")} />
        <Chip label="Este mês" active={range.from === starts.month && !range.to} onPress={() => setQuick(starts.month, "")} />
        <Chip label="Últimos 3 meses" active={range.from === todayText(-90) && !range.to} onPress={() => setQuick(todayText(-90), "")} />
        <Chip label="Este ano" active={range.from === starts.year && !range.to} onPress={() => setQuick(starts.year, "")} />
      </View>
      <View style={u.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Field label="De (AAAA-MM-DD)" value={fromText} onChangeText={setFromText} placeholder="2026-10-01" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Até (AAAA-MM-DD)" value={toText} onChangeText={setToText} placeholder="2026-10-31" />
        </View>
      </View>
      <Btn small kind="outline" label="Aplicar datas" onPress={applyRange} />

      <ChipGroup label="Estado" options={catalog.commissionStatus} value={status} onChange={setStatus} allowEmpty scroll />
      <ChipGroup label="Motivo" options={catalog.commissionReasons} value={reason} onChange={setReason} allowEmpty scroll />

      {chart.some((c) => c.value > 0) ? (
        <>
          <SubTitle>Por mês</SubTitle>
          <Card>
            <ColumnBars data={chart} />
          </Card>
        </>
      ) : null}

      <SubTitle>Comissões</SubTitle>
      <Text style={u.muted}>{busy && items.length === 0 ? "A carregar..." : `${total} registo(s)`}</Text>

      {error ? <Empty text={error} /> : null}
      {!busy && !error && items.length === 0 ? <Empty text="Nenhuma comissão neste período." /> : null}

      {items.map((c) => (
        <Card key={c.id}>
          <View style={u.between}>
            <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 16 }]}>+ {money(c.amount)}</Text>
            <Badge label={labelOf(catalog.commissionStatus, c.status) || c.status} color={COMMISSION_COLOR[c.status] ?? "#757575"} />
          </View>
          <Text style={u.muted}>
            {money(c.base)} × {c.rate}%
          </Text>
          <Text style={u.muted}>
            {COMMISSION_ICON[c.reason] ?? "•"} {labelOf(catalog.commissionReasons, c.reason) || c.reason}
          </Text>
          <Text style={u.muted}>
            Encomenda {shortId(c.orderId)} · concluída em {formatDate(c.orderCompletedAt)}
          </Text>
          {c.order ? (
            <Text style={u.muted}>
              🛒 {c.order.buyerName ?? "Comprador"} → 🏪 {c.order.sellerName ?? "Vendedor"}
            </Text>
          ) : null}
          {c.status === "PAGO" && c.paidAt ? <Text style={{ color: "#2E7D32", marginTop: 2 }}>Pago em {formatDate(c.paidAt)}</Text> : null}
          {c.note ? <Text style={[u.muted, { marginTop: 2 }]}>📝 {c.note}</Text> : null}
          <Btn small kind="outline" label="Abrir a encomenda" onPress={() => navigation.navigate("AgentOrder", { id: c.orderId })} />
        </Card>
      ))}

      {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}

      <Btn kind="outline" label="📑 Gerar relatório" onPress={() => navigation.navigate("AgentReport")} />
    </Page>
  );
}
