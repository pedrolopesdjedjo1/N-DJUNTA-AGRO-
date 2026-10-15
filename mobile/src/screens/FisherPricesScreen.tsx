import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getFishPrices } from "../api/fisher";
import {
  pricesByRegion,
  comparePrices,
  priceHistory,
  priceMovers,
  mostWanted,
  checkPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
} from "../api/prices";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = {
  prices: [] as any[],
  movers: [] as any[],
  wanted: [] as any[],
  alerts: [] as any[],
};

export default function FisherPricesScreen() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regionText, setRegionText] = useState("");
  const [region, setRegion] = useState("");
  const [detail, setDetail] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [alertName, setAlertName] = useState("");
  const [alertDirection, setAlertDirection] = useState<"ACIMA" | "ABAIXO">("ACIMA");
  const [alertPrice, setAlertPrice] = useState("");
  const [alertRegion, setAlertRegion] = useState("");
  const [saving, setSaving] = useState(false);

  const loader = useLoader(
    async () => {
      const [prices, movers, wanted, alerts] = await Promise.all([
        getFishPrices({ q, region }),
        priceMovers("PESCA"),
        mostWanted("PESCA"),
        checkPriceAlerts(),
      ]);
      return { prices, movers, wanted, alerts };
    },
    EMPTY,
    [q, region]
  );
  const d: any = loader.data;

  async function openDetail(name: string) {
    setBusy(true);
    try {
      const [regions, history, compare] = await Promise.all([
        pricesByRegion(name),
        priceHistory(name, 12),
        comparePrices(name, region || undefined),
      ]);
      setDetail({ name, regions, history, compare });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível carregar os detalhes."));
    } finally {
      setBusy(false);
    }
  }

  function startAlert(name: string) {
    setAlertName(name);
    setFormOpen(true);
  }

  async function saveAlert() {
    const price = Number(alertPrice.replace(",", "."));
    if (!alertName.trim() || isNaN(price) || price <= 0) {
      Alert.alert("Atenção", "Escreva a espécie e um preço válido.");
      return;
    }
    setSaving(true);
    try {
      await createPriceAlert({
        productName: alertName.trim(),
        direction: alertDirection,
        targetPrice: price,
        region: alertRegion.trim() || undefined,
      });
      setFormOpen(false);
      setAlertName("");
      setAlertPrice("");
      setAlertRegion("");
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível criar o alerta."));
    } finally {
      setSaving(false);
    }
  }

  function removeAlert(a: any) {
    Alert.alert("Apagar alerta", `Apagar o alerta de "${a.productName}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePriceAlert(a.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  const history = detail?.history;
  const maxAvg = Math.max(1, ...(history?.points ?? []).map((p: any) => p.avg ?? 0));

  let verdict = "";
  if (detail && detail.compare.mine.count > 0 && detail.compare.market.count > 0) {
    const diff = ((detail.compare.mine.avg - detail.compare.market.avg) / Math.max(1, detail.compare.market.avg)) * 100;
    if (diff > 15) verdict = `O seu preço médio está ${Math.round(diff)}% acima do mercado. Pode perder vendas.`;
    else if (diff < -15) verdict = `O seu preço médio está ${Math.round(-diff)}% abaixo do mercado. Pode subir um pouco.`;
    else verdict = "O seu preço médio está em linha com o mercado.";
  }

  return (
    <Page loader={loader}>
      <Title>📈 Preços do pescado</Title>

      <Field
        placeholder="Procurar espécie (ex: bagre)"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />
      <Field
        placeholder="Região (ex: Bissau)"
        value={regionText}
        onChangeText={setRegionText}
        onSubmitEditing={() => setRegion(regionText.trim())}
        returnKeyType="search"
      />

      {busy ? <Text style={u.muted}>A carregar detalhes...</Text> : null}

      {detail ? (
        <Card>
          <View style={u.between}>
            <Text style={[u.strong, { flex: 1 }]}>{detail.name}</Text>
            <Btn small kind="outline" label="Fechar" onPress={() => setDetail(null)} />
          </View>

          <Text style={[u.strong, { marginTop: 10 }]}>⚖️ Comparar preços</Text>
          <Text style={u.muted}>
            Mercado ({detail.compare.market.count}): média {money(detail.compare.market.avg)} · de {money(detail.compare.market.min)} a {money(detail.compare.market.max)}
          </Text>
          <Text style={u.muted}>
            Os meus ({detail.compare.mine.count}): {detail.compare.mine.count ? money(detail.compare.mine.avg) : "ainda não vende esta espécie"}
          </Text>
          {verdict ? <Text style={{ marginTop: 6, color: colors.primary }}>{verdict}</Text> : null}

          <Text style={[u.strong, { marginTop: 12 }]}>📍 Preços por região</Text>
          {detail.regions.length === 0 ? (
            <Text style={u.muted}>Sem dados por região.</Text>
          ) : (
            detail.regions.map((r: any) => (
              <Text key={r.region} style={{ marginTop: 2 }}>
                {r.region}: {money(r.avg)} ({r.count})
              </Text>
            ))
          )}

          <Text style={[u.strong, { marginTop: 12 }]}>📊 Evolução (12 semanas)</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100, marginTop: 6 }}>
            {history.points.map((p: any) => (
              <View key={p.weeksAgo} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: 100 }}>
                <View
                  style={{
                    width: 12,
                    height: p.avg ? Math.max(3, (p.avg / maxAvg) * 80) : 2,
                    backgroundColor: p.avg ? colors.primary : "#BDBDBD",
                    borderRadius: 3,
                  }}
                />
                <Text style={{ fontSize: 8, color: colors.textSecondary, marginTop: 2 }}>
                  {p.weeksAgo === 0 ? "agora" : `-${p.weeksAgo}`}
                </Text>
              </View>
            ))}
          </View>
          {history.change !== null ? (
            <Text style={{ marginTop: 6, color: history.change > 0 ? "#C62828" : history.change < 0 ? "#2E7D32" : colors.textSecondary }}>
              {history.change > 0 ? "▲" : history.change < 0 ? "▼" : "•"} {history.change}% desde o início do período
            </Text>
          ) : (
            <Text style={u.muted}>Ainda há poucos dados para mostrar a evolução.</Text>
          )}

          <Btn small label="🔔 Criar alerta para esta espécie" onPress={() => startAlert(detail.name)} />
        </Card>
      ) : null}

      <SubTitle>Preços por espécie</SubTitle>
      {d.prices.length === 0 ? (
        <Empty text="Nenhum pescado encontrado." />
      ) : (
        d.prices.map((p: any) => (
          <Card key={`${p.name}-${p.unit}`}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.name}</Text>
              <Badge label={`${p.count} anúncio(s)`} color="#00838F" />
            </View>
            <Text style={u.muted}>
              Média {money(p.avg)} / {p.unit} · de {money(p.min)} a {money(p.max)}
            </Text>
            <Btn small kind="outline" label="Ver região, evolução e comparação" onPress={() => openDetail(p.name)} />
          </Card>
        ))
      )}

      <SubTitle>🔥 Mais procurados (30 dias)</SubTitle>
      {d.wanted.length === 0 ? (
        <Empty text="Ainda não há vendas suficientes para mostrar." />
      ) : (
        d.wanted.map((w: any, index: number) => (
          <Card key={w.name}>
            <Text style={u.strong}>
              {index + 1}. {w.name}
            </Text>
            <Text style={u.muted}>{w.sold} vendido(s)</Text>
          </Card>
        ))
      )}

      <SubTitle>📊 Subidas e quedas de preços</SubTitle>
      {d.movers.length === 0 ? (
        <Empty text="Ainda não há dados suficientes para comparar." />
      ) : (
        d.movers.map((m: any) => (
          <Card key={m.name}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{m.name}</Text>
              <Text style={{ fontWeight: "bold", color: m.change > 0 ? "#C62828" : "#2E7D32" }}>
                {m.change > 0 ? "▲" : "▼"} {Math.abs(m.change)}%
              </Text>
            </View>
            <Text style={u.muted}>
              {money(m.previous)} → {money(m.recent)}
            </Text>
          </Card>
        ))
      )}

      <SubTitle>🔔 Alertas de aumento ou queda</SubTitle>
      <Btn kind="outline" label={formOpen ? "Fechar formulário" : "➕ Novo alerta"} onPress={() => setFormOpen(!formOpen)} />

      {formOpen && (
        <Card>
          <Field label="Espécie" value={alertName} onChangeText={setAlertName} placeholder="Ex: bagre" />
          <Text style={u.label}>Avisar quando o preço médio estiver</Text>
          <View style={u.row}>
            <Chip label="Acima de" active={alertDirection === "ACIMA"} onPress={() => setAlertDirection("ACIMA")} />
            <Chip label="Abaixo de" active={alertDirection === "ABAIXO"} onPress={() => setAlertDirection("ABAIXO")} />
          </View>
          <Field label="Preço (FCFA)" value={alertPrice} onChangeText={setAlertPrice} keyboardType="numeric" />
          <Field label="Região (opcional)" value={alertRegion} onChangeText={setAlertRegion} placeholder="Ex: Bissau" />
          <Btn label={saving ? "A guardar..." : "Criar alerta"} onPress={saveAlert} disabled={saving} />
        </Card>
      )}

      {d.alerts.length === 0 ? (
        <Empty text="Ainda não tem alertas de preço." />
      ) : (
        d.alerts.map((a: any) => (
          <Card key={a.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{a.productName}</Text>
              {a.met ? <Badge label="Atingido" color="#2E7D32" /> : <Badge label="À espera" color="#757575" />}
            </View>
            <Text style={u.muted}>
              Avisar quando estiver {a.direction === "ACIMA" ? "acima" : "abaixo"} de {money(a.targetPrice)}
              {a.region ? ` · ${a.region}` : ""}
            </Text>
            <Text style={u.muted}>
              Preço médio agora: {a.currentAvg !== null && a.currentAvg !== undefined ? money(a.currentAvg) : "sem dados"}
            </Text>
            <Btn small kind="danger" label="Apagar" onPress={() => removeAlert(a)} />
          </Card>
        ))
      )}
    </Page>
  );
}
