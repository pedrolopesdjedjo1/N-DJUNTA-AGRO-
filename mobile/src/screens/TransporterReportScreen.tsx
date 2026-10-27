import React, { useState } from "react";
import { View, Text, Share, Alert, Platform } from "react-native";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getTransporterReport } from "../api/transporter";
import { periodStarts } from "../constants/agentWork";
import { stars } from "../constants/transporter";
import { formatNumber } from "../utils/format";
import { isDateText, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";

const EMPTY = { report: null as any };
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

// Relatório do transportador em texto, pronto para partilhar
export default function TransporterReportScreen({ navigation }: any) {
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });

  const loader = useLoader(async () => ({ report: await getTransporterReport({ from: range.from, to: range.to }) }), EMPTY, [range]);
  const r: any = loader.data.report;
  const m = r?.metrics;

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

  async function share() {
    if (!r) return;
    try {
      await Share.share({ message: r.text, title: "Relatório do transportador" });
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
              <Text style={[u.tileValue, { fontSize: 16 }]}>{value}</Text>
              <Text style={u.tileLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <Page loader={loader}>
      <Title>📑 Relatório do transportador</Title>
      <Text style={u.muted}>Escolha o período. O relatório fica em texto, pronto para enviar por mensagem ou por e-mail.</Text>

      <View style={u.row}>
        <Chip label="Últimos 30 dias" active={!range.from && !range.to} onPress={() => setQuick("", "")} />
        <Chip label="Esta semana" active={range.from === todayText(-6) && !range.to} onPress={() => setQuick(todayText(-6), "")} />
        <Chip label="Este mês" active={range.from === starts.month && !range.to} onPress={() => setQuick(starts.month, "")} />
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

      {!m ? (
        <Empty text="A carregar..." />
      ) : (
        <>
          <Btn label="📤 Partilhar relatório" onPress={share} />

          <SubTitle>Entregas</SubTitle>
          {tiles([
            ["✅ Entregas concluídas", formatNumber(m.deliveries)],
            ["📏 Quilómetros (estimados)", formatNumber(m.km)],
            ["⚖️ Carga (kg conhecidos)", formatNumber(m.weightKg)],
            ["↩️ Devolvidas", formatNumber(m.released)],
            ["⚠️ Problemas comunicados", formatNumber(m.problems)],
          ])}
          {m.destinations.length > 0 ? <Text style={u.muted}>🏁 Regiões servidas: {m.destinations.join(", ")}</Text> : null}

          <SubTitle>Ganhos</SubTitle>
          {tiles([
            ["💰 Total do transporte", money(m.amount)],
            ["📊 Média por entrega", money(m.average)],
          ])}
          {m.withoutValue > 0 ? <Text style={{ color: "#EF6C00" }}>⚠️ {m.withoutValue} entrega(s) sem valor indicado.</Text> : null}

          <SubTitle>Avaliações</SubTitle>
          <Card>
            {m.rating !== null ? (
              <Text style={u.strong}>
                {stars(m.rating)} {m.rating} · {m.reviews} avaliação(ões) no período
              </Text>
            ) : (
              <Text style={u.muted}>Sem avaliações no período.</Text>
            )}
          </Card>

          <SubTitle>Pré-visualização</SubTitle>
          <Card>
            <Text selectable style={{ fontFamily: MONO, fontSize: 12, lineHeight: 18 }}>
              {r.text}
            </Text>
          </Card>
          <Text style={[u.muted, { marginTop: 8 }]}>Os valores são os do transporte indicado nas encomendas. O relatório não inclui nomes nem contactos de clientes.</Text>

          <View style={u.row}>
            <Btn small kind="outline" label="💰 Ganhos" onPress={() => navigation.navigate("TransporterEarnings")} />
            <Btn small kind="outline" label="⭐ Avaliações" onPress={() => navigation.navigate("TransporterRatings")} />
          </View>
        </>
      )}
    </Page>
  );
}
