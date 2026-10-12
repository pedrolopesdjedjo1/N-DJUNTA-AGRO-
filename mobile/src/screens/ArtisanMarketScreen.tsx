import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getMarket, compareMarket } from "../api/artisan";
import { getApiErrorMessage } from "../api/errorMessage";
import { departmentOf, money, DELIVERY_STATUS } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = {
  mostWanted: [] as any[],
  prices: [] as any[],
  trends: [] as any[],
  featured: [] as any[],
  opportunities: [] as any[],
};

export default function ArtisanMarketScreen({ navigation }: any) {
  const loader = useLoader(getMarket, EMPTY);
  const d: any = loader.data;

  const [q, setQ] = useState("");
  const [sub, setSub] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const subcategories = departmentOf("ARTESANATO")?.subcategories ?? [];
  const maxUnits = Math.max(1, ...d.trends.map((t: any) => t.units));

  async function compare() {
    setBusy(true);
    try {
      setResult(await compareMarket({ q: q.trim(), subcategory: sub }));
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível comparar."));
    } finally {
      setBusy(false);
    }
  }

  let verdict = "";
  if (result && result.mine.count > 0 && result.market.count > 0) {
    const diff = ((result.mine.avg - result.market.avg) / Math.max(1, result.market.avg)) * 100;
    if (diff > 15) verdict = `O seu preço médio está ${Math.round(diff)}% acima do mercado. Pode perder vendas.`;
    else if (diff < -15) verdict = `O seu preço médio está ${Math.round(-diff)}% abaixo do mercado. Pode subir um pouco.`;
    else verdict = "O seu preço médio está em linha com o mercado.";
  }

  return (
    <Page loader={loader}>
      <Title>📈 Mercado</Title>

      <SubTitle>🔥 Artesanatos mais procurados (30 dias)</SubTitle>
      {d.mostWanted.length === 0 ? (
        <Empty text="Ainda não há vendas suficientes para mostrar." />
      ) : (
        d.mostWanted.map((p: any, index: number) => (
          <Card key={p.id}>
            <Text style={u.strong}>
              {index + 1}. {p.title}
            </Text>
            <Text style={u.muted}>
              {p.subcategory ? `${p.subcategory} · ` : ""}
              {p.sold} vendido(s)
            </Text>
          </Card>
        ))
      )}

      <SubTitle>💲 Preços de mercado</SubTitle>
      {d.prices.length === 0 ? (
        <Empty text="Ainda não há artesanatos publicados." />
      ) : (
        d.prices.map((p: any) => (
          <Card key={p.subcategory}>
            <Text style={u.strong}>{p.subcategory}</Text>
            <Text style={u.muted}>
              Média {money(p.avg)} · de {money(p.min)} a {money(p.max)} · {p.count} produto(s)
            </Text>
          </Card>
        ))
      )}

      <SubTitle>📊 Tendências (unidades vendidas por semana)</SubTitle>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100 }}>
          {d.trends.map((t: any) => (
            <View key={t.weeksAgo} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: 100 }}>
              <View
                style={{
                  width: 14,
                  height: Math.max(2, (t.units / maxUnits) * 80),
                  backgroundColor: colors.primary,
                  borderRadius: 3,
                }}
              />
              <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2 }}>
                {t.weeksAgo === 0 ? "agora" : `-${t.weeksAgo}s`}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <SubTitle>⭐ Produtos em destaque</SubTitle>
      {d.featured.length === 0 ? (
        <Empty text="Nenhum destaque por agora." />
      ) : (
        d.featured.map((f: any) => (
          <Card key={f.id}>
            <Text style={u.strong}>{f.title}</Text>
            <Text style={u.muted}>{f.discountPercent ? `-${f.discountPercent}%` : "Oferta especial"}</Text>
          </Card>
        ))
      )}

      <SubTitle>💡 Oportunidades de venda</SubTitle>
      {d.opportunities.length === 0 ? (
        <Empty text="Sem dados suficientes por agora." />
      ) : (
        d.opportunities.map((o: any) => (
          <Card key={o.subcategory}>
            <Text style={u.strong}>{o.subcategory}</Text>
            <Text style={u.muted}>
              Procura: {o.demand} vendido(s) · Oferta: {o.supply} produto(s)
            </Text>
            <Text style={u.muted}>{o.supply === 0 ? "Ninguém está a vender isto. Boa oportunidade!" : "Há procura, pense em publicar mais."}</Text>
          </Card>
        ))
      )}

      <SubTitle>⚖️ Comparação de preços</SubTitle>
      <Field label="Produto" value={q} onChangeText={setQ} placeholder="Ex: cesto" />
      <View style={[u.row, { marginTop: 8 }]}>
        <Chip label="Todas" active={sub === ""} onPress={() => setSub("")} />
        {subcategories.map((s) => (
          <Chip key={s} label={s} active={sub === s} onPress={() => setSub(s)} />
        ))}
      </View>
      <Btn label={busy ? "A comparar..." : "Comparar"} onPress={compare} disabled={busy} />

      {result ? (
        <Card>
          <Text style={u.strong}>No mercado ({result.market.count} produtos)</Text>
          <Text style={u.muted}>
            Média {money(result.market.avg)} · de {money(result.market.min)} a {money(result.market.max)}
          </Text>
          <Text style={[u.strong, { marginTop: 8 }]}>Os meus ({result.mine.count} produtos)</Text>
          <Text style={u.muted}>Média {result.mine.count ? money(result.mine.avg) : "—"}</Text>
          {verdict ? <Text style={{ marginTop: 8, color: colors.primary }}>{verdict}</Text> : null}
          {result.items.slice(0, 8).map((i: any) => (
            <Text key={i.id} style={{ marginTop: 4 }}>
              {i.title} — {money(i.price)}
            </Text>
          ))}
        </Card>
      ) : null}

      <SubTitle>🎪 Feiras e mercados</SubTitle>
      <Btn kind="outline" label="Ver feiras e eventos" onPress={() => navigation.navigate("Events")} />
    </Page>
  );
}
