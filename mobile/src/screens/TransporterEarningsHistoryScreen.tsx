import React, { useCallback, useRef, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, Field, u } from "../components/ui";
import { ColumnBars } from "../components/ngo/Charts";
import { listTransporterEarnings } from "../api/transporter";
import { monthLabel, periodStarts } from "../constants/agentWork";
import { kmText, weightText } from "../constants/transporter";
import { isDateText, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY_SUMMARY = { count: 0, amount: 0, average: 0, withoutValue: 0 };

// Histórico financeiro: todas as entregas pagas, por período
export default function TransporterEarningsHistoryScreen({ navigation }: any) {
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

  const key = JSON.stringify(range);

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listTransporterEarnings({ from: range.from, to: range.to, page: nextPage });
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
      <Text style={u.muted}>As entregas concluídas e o valor do transporte de cada uma.</Text>

      <View style={u.grid}>
        {(
          [
            ["💰 Total do período", money(summary.amount)],
            ["✅ Entregas", String(summary.count)],
            ["📊 Média por entrega", money(summary.average)],
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
      {summary.withoutValue > 0 ? <Text style={{ color: "#EF6C00" }}>⚠️ {summary.withoutValue} entrega(s) sem valor indicado.</Text> : null}

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

      {chart.some((c) => c.value > 0) ? (
        <>
          <SubTitle>Por mês</SubTitle>
          <Card>
            <ColumnBars data={chart} />
          </Card>
        </>
      ) : null}

      <SubTitle>Entregas pagas</SubTitle>
      <Text style={u.muted}>{busy && items.length === 0 ? "A carregar..." : `${total} entrega(s)`}</Text>

      {error ? <Empty text={error} /> : null}
      {!busy && !error && items.length === 0 ? <Empty text="Nenhuma entrega concluída neste período." /> : null}

      {items.map((r) => {
        const km = kmText(r.distanceKm, r.distanceApprox);
        const weight = weightText(r.weightKg, false);
        return (
          <Card key={r.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 16, color: r.payout ? colors.primary : "#757575" }]}>
                {r.payout ? `+ ${money(r.payout)}` : "Sem valor indicado"}
              </Text>
              <Text style={u.muted}>{formatDate(r.deliveredAt)}</Text>
            </View>
            <Text style={u.muted}>Entrega {r.orderCode}</Text>
            <Text style={u.muted} numberOfLines={1}>
              📍 {r.pickup ?? "Recolha"} → 🏁 {r.destination ?? "Destino"}
            </Text>
            <Text style={u.muted}>
              {[km ? `📏 ${km}` : "", weight ? `⚖️ ${weight}` : ""].filter(Boolean).join(" · ")}
            </Text>
            {r.itemsPreview?.length > 0 ? (
              <Text style={u.muted} numberOfLines={1}>
                📦 {r.itemsPreview.join(", ")}
                {r.itemsCount > r.itemsPreview.length ? ` e mais ${r.itemsCount - r.itemsPreview.length}` : ""}
              </Text>
            ) : null}
            {r.buyerName ? <Text style={u.muted}>🛒 {r.buyerName}</Text> : null}
            <Btn small kind="outline" label="Abrir a entrega" onPress={() => navigation.navigate("TransporterDelivery", { id: r.id })} />
          </Card>
        );
      })}

      {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}

      <Btn kind="outline" label="📑 Gerar relatório" onPress={() => navigation.navigate("TransporterReport")} />
    </Page>
  );
}
