import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Share, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { GovLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { HBars, ColumnBars } from "../components/ngo/Charts";
import { getGovStats, getGovRegions } from "../api/gov";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { useGovCatalog } from "../utils/govCatalog";
import { REPORT_ICON } from "../constants/gov";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDateTime } from "../constants/market";

const EMPTY = {
  generatedAt: "",
  months: 12,
  region: null as any,
  people: { total: 0, farmers: 0, fishers: 0, artisans: 0, merchants: 0, buyers: 0, transporters: 0, verified: 0 },
  cooperatives: { total: 0, members: 0 },
  production: {
    agriculture: { productsListed: 0, soldKg: 0, soldOther: [] as any[], topCrops: [] as any[] },
    fishing: { productsListed: 0, catches: 0, catchKg: 0, soldKg: 0, soldOther: [] as any[], topSpecies: [] as any[] },
  },
  marketplace: { ordersCompleted: 0, ordersValue: 0 },
  projects: { total: 0, completed: 0, byStatus: {} as Record<string, number>, byArea: {} as Record<string, number>, programs: 0 },
  impact: { beneficiaries: 0, jobs: 0, trained: 0, productionKg: 0, certificates: null as number | null, trainings: 0 },
  reports: { total: 0, open: 0, byCategory: [] as any[] },
  byRegion: [] as any[],
  timeline: [] as any[],
  note: "",
};

const METRICS: [string, string][] = [
  ["farmers", "🌾 Agricultores"],
  ["fishers", "🎣 Pescadores"],
  ["artisans", "🧺 Artesãos"],
  ["cooperatives", "🤝 Cooperativas"],
  ["projects", "📋 Projetos públicos"],
  ["beneficiaries", "👥 Beneficiários"],
  ["catchKg", "🐟 Pesca registada (kg)"],
  ["agriSoldKg", "🌾 Vendas agrícolas (kg)"],
  ["jobs", "💼 Empregos criados"],
  ["reportsOpen", "📝 Pedidos em aberto"],
];

const SERIES: [string, string][] = [
  ["ordersCompleted", "🛒 Vendas concluídas"],
  ["newUsers", "👤 Novas pessoas no app"],
  ["catchKg", "🐟 Pesca registada (kg)"],
];

const PERIODS = [3, 6, 12, 24];

function weight(kg: number): string {
  const value = Number(kg) || 0;
  if (value >= 1000) return `${formatNumber(Math.round(value / 100) / 10)} t`;
  return `${formatNumber(Math.round(value))} kg`;
}

function monthLabel(month: string) {
  return `${month.slice(5, 7)}/${month.slice(2, 4)}`;
}

export default function GovDataScreen({ navigation, route }: any) {
  const ngo = useNgoCatalog();
  const gov = useGovCatalog();

  const [region, setRegion] = useState<string>(route?.params?.region ?? "");
  const [months, setMonths] = useState(12);
  const [metric, setMetric] = useState("farmers");
  const [series, setSeries] = useState("ordersCompleted");
  const [regionList, setRegionList] = useState<{ key: string; name: string }[]>([]);

  useEffect(() => {
    if (route?.params?.region !== undefined) setRegion(route.params.region ?? "");
  }, [route?.params?.region]);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegionList(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  const loader = useLoader(() => getGovStats({ region, months }), EMPTY, [region, months]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const scope = d.region?.name ?? "Todo o país";
  const agri = d.production.agriculture;
  const fish = d.production.fishing;
  const maxCrop = Math.max(1, ...agri.topCrops.map((c: any) => c.quantity));

  const regionBars = (d.byRegion as any[])
    .map((r) => ({ key: r.key, label: r.name, value: Number(r[metric]) || 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const rows = (d.byRegion as any[])
    .filter((r) => r.users > 0 || r.projects > 0 || r.cooperatives > 0)
    .sort((a, b) => b.users - a.users)
    .slice(0, 14);

  const hasSeries = (d.timeline as any[]).some((t) => (Number(t[series]) || 0) > 0);

  async function share() {
    const lines = [
      "DADOS E ESTATÍSTICAS · NÔDJUNTA AGRO",
      `Território: ${scope}`,
      `Período: últimos ${d.months} meses`,
      "",
      `Pessoas no app: ${formatNumber(d.people.total)}`,
      `- Agricultores: ${formatNumber(d.people.farmers)}`,
      `- Pescadores: ${formatNumber(d.people.fishers)}`,
      `- Artesãos: ${formatNumber(d.people.artisans)}`,
      `- Comerciantes: ${formatNumber(d.people.merchants)}`,
      `Cooperativas: ${formatNumber(d.cooperatives.total)} (${formatNumber(d.cooperatives.members)} membros)`,
      "",
      `Produção agrícola vendida no app: ${weight(agri.soldKg)}`,
      `Pesca registada: ${weight(fish.catchKg)} em ${formatNumber(fish.catches)} saída(s)`,
      `Vendas concluídas: ${formatNumber(d.marketplace.ordersCompleted)} (${money(d.marketplace.ordersValue)})`,
      "",
      `Projetos públicos: ${formatNumber(d.projects.total)} (${formatNumber(d.projects.completed)} concluídos)`,
      `Programas públicos: ${formatNumber(d.projects.programs)}`,
      `Beneficiários registados: ${formatNumber(d.impact.beneficiaries)}`,
      `Empregos criados: ${formatNumber(d.impact.jobs)}`,
      `Pessoas formadas: ${formatNumber(d.impact.trained)}`,
      "",
      `Pedidos dos cidadãos: ${formatNumber(d.reports.total)} (${formatNumber(d.reports.open)} em aberto)`,
      "",
      "Números do que está registado no app. Não são o total nacional.",
    ];
    try {
      await Share.share({ message: lines.join("\n") });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível partilhar."));
    }
  }

  function tiles(list: [string, string][]) {
    return (
      <View style={u.grid}>
        {list.map(([label, value]) => (
          <View key={label} style={u.tile}>
            <View style={u.tileBox}>
              <Text style={[u.tileValue, { fontSize: 18 }]}>{value}</Text>
              <Text style={u.tileLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <GovLayout active="GovData">
      <Page loader={loader}>
        <Title>📊 Dados e estatísticas</Title>
        <Text style={u.muted}>O que as pessoas e as organizações registam no NÔDJUNTA AGRO, por região.</Text>

        <View style={u.row}>
          <Btn small label="📤 Partilhar resumo" onPress={share} />
          <Btn small kind="outline" label="📑 Relatório de impacto" onPress={() => navigation.navigate("NgoReport")} />
          <Btn small kind="outline" label="📍 Mapa" onPress={() => navigation.navigate("GovMap")} />
        </View>

        <SubTitle>Território</SubTitle>
        <View style={u.row}>
          <Chip label="Todo o país" active={region === ""} onPress={() => setRegion("")} />
          {regionList.map((r) => (
            <Chip key={r.key} label={r.name} active={region === r.key} onPress={() => setRegion(region === r.key ? "" : r.key)} />
          ))}
        </View>

        <SubTitle>Período</SubTitle>
        <View style={u.row}>
          {PERIODS.map((m) => (
            <Chip key={m} label={`${m} meses`} active={months === m} onPress={() => setMonths(m)} />
          ))}
        </View>

        <Text style={[u.strong, { marginTop: 8 }]}>A mostrar: {scope}</Text>
        {d.generatedAt ? <Text style={u.muted}>Atualizado em {formatDateTime(d.generatedAt)}. Os números atualizam a cada 10 minutos.</Text> : null}

        <SubTitle>👥 Pessoas no app</SubTitle>
        {tiles([
          ["Total de pessoas", formatNumber(d.people.total)],
          ["🌾 Agricultores", formatNumber(d.people.farmers)],
          ["🎣 Pescadores", formatNumber(d.people.fishers)],
          ["🧺 Artesãos", formatNumber(d.people.artisans)],
          ["🏪 Comerciantes", formatNumber(d.people.merchants)],
          ["🛒 Compradores", formatNumber(d.people.buyers)],
          ["🚚 Transportadores", formatNumber(d.people.transporters)],
          ["✅ Contas verificadas", formatNumber(d.people.verified)],
        ])}

        <SubTitle>🤝 Cooperativas</SubTitle>
        {tiles([
          ["Cooperativas", formatNumber(d.cooperatives.total)],
          ["Membros", formatNumber(d.cooperatives.members)],
        ])}

        <SubTitle>🌾 Produção agrícola</SubTitle>
        {tiles([
          ["Produtos à venda", formatNumber(agri.productsListed)],
          ["Vendido no app", weight(agri.soldKg)],
        ])}
        {agri.soldOther.length > 0 ? (
          <Text style={u.muted}>
            Vendas noutras unidades: {agri.soldOther.map((o: any) => `${formatNumber(o.quantity)} ${o.unit}`).join(" · ")}
          </Text>
        ) : null}
        {agri.topCrops.length > 0 ? (
          <Card>
            <Text style={u.strong}>Produtos mais vendidos</Text>
            <HBars data={agri.topCrops.map((c: any) => ({ label: `${c.name} (${c.unit})`, value: c.quantity }))} color="#2E7D32" />
          </Card>
        ) : (
          <Empty text="Ainda não há vendas agrícolas concluídas neste período." />
        )}

        <SubTitle>🎣 Produção pesqueira</SubTitle>
        {tiles([
          ["Pesca registada", weight(fish.catchKg)],
          ["Saídas registadas", formatNumber(fish.catches)],
          ["Pescado vendido no app", weight(fish.soldKg)],
          ["Produtos à venda", formatNumber(fish.productsListed)],
        ])}
        {fish.soldOther.length > 0 ? (
          <Text style={u.muted}>
            Vendas noutras unidades: {fish.soldOther.map((o: any) => `${formatNumber(o.quantity)} ${o.unit}`).join(" · ")}
          </Text>
        ) : null}
        {fish.topSpecies.length > 0 ? (
          <Card>
            <Text style={u.strong}>Espécies mais capturadas (kg)</Text>
            <HBars data={fish.topSpecies.map((s: any) => ({ label: s.species, value: s.kg }))} color="#1565C0" />
          </Card>
        ) : (
          <Empty text="Ainda não há pescas registadas neste período." />
        )}

        <SubTitle>🛒 Mercado do app</SubTitle>
        {tiles([
          ["Vendas concluídas", formatNumber(d.marketplace.ordersCompleted)],
          ["Valor vendido", money(d.marketplace.ordersValue)],
        ])}

        <SubTitle>📋 Projetos realizados</SubTitle>
        {tiles([
          ["Projetos públicos", formatNumber(d.projects.total)],
          ["Concluídos", formatNumber(d.projects.completed)],
          ["Programas públicos", formatNumber(d.projects.programs)],
        ])}
        {d.projects.total > 0 ? (
          <Card>
            <Text style={u.strong}>Por estado</Text>
            {ngo.projectStatus.map((s) => (
              <View key={s.value} style={[u.between, { marginTop: 4 }]}>
                <Text>{s.label}</Text>
                <Text style={{ fontWeight: "bold" }}>{d.projects.byStatus[s.value] ?? 0}</Text>
              </View>
            ))}
            <Text style={[u.strong, { marginTop: 10 }]}>Por área</Text>
            {Object.keys(d.projects.byArea).map((area) => (
              <View key={area} style={[u.between, { marginTop: 4 }]}>
                <Text>{labelOf(ngo.areas, area)}</Text>
                <Text style={{ fontWeight: "bold" }}>{d.projects.byArea[area]}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <SubTitle>🎯 Impacto</SubTitle>
        {tiles([
          ["👥 Beneficiários registados", formatNumber(d.impact.beneficiaries)],
          ["💼 Empregos criados", formatNumber(d.impact.jobs)],
          ["🎓 Pessoas formadas", formatNumber(d.impact.trained)],
          ["🌾 Produção dos projetos", weight(d.impact.productionKg)],
          ["📚 Formações", formatNumber(d.impact.trainings)],
          ...(d.impact.certificates !== null ? ([["🏅 Certificados emitidos", formatNumber(d.impact.certificates)]] as [string, string][]) : []),
        ])}
        <Text style={u.muted}>
          Os beneficiários, os empregos e a formação vêm dos projetos públicos. Uma pessoa apoiada em vários projetos pode contar mais de uma vez.
        </Text>

        <SubTitle>📝 Pedidos dos cidadãos</SubTitle>
        {tiles([
          ["Pedidos recebidos", formatNumber(d.reports.total)],
          ["Ainda em aberto", formatNumber(d.reports.open)],
        ])}
        {d.reports.byCategory.length > 0 ? (
          <Card>
            <HBars
              data={d.reports.byCategory.map((c: any) => ({
                label: `${REPORT_ICON[c.category] ?? "📝"} ${labelOf(gov.reportCategories, c.category)}`,
                value: c.count,
              }))}
              color="#F9A825"
            />
          </Card>
        ) : null}
        <Btn small kind="outline" label="Ver pedidos e denúncias" onPress={() => navigation.navigate("GovReports")} />

        <SubTitle>📈 Evolução mês a mês</SubTitle>
        <View style={u.row}>
          {SERIES.map(([key, label]) => (
            <Chip key={key} label={label} active={series === key} onPress={() => setSeries(key)} />
          ))}
        </View>
        {hasSeries ? (
          <Card>
            <ColumnBars data={(d.timeline as any[]).map((t) => ({ label: monthLabel(t.month), value: Number(t[series]) || 0 }))} />
          </Card>
        ) : (
          <Empty text="Ainda não há dados para mostrar a evolução." />
        )}

        <SubTitle>🗺️ Indicadores por região</SubTitle>
        <View style={u.row}>
          {METRICS.map(([key, label]) => (
            <Chip key={key} label={label} active={metric === key} onPress={() => setMetric(key)} />
          ))}
        </View>
        {regionBars.length === 0 ? (
          <Empty text="Sem dados por região para este indicador." />
        ) : (
          <Card>
            <HBars data={regionBars.map((r) => ({ label: r.label, value: r.value }))} />
          </Card>
        )}

        {region === "" && rows.length > 0 ? (
          <>
            <SubTitle>Resumo de cada região</SubTitle>
            {rows.map((r) => (
              <Card key={r.key}>
                <Text style={u.strong}>{r.name}</Text>
                <Text style={u.muted}>
                  🌾 {r.farmers} · 🎣 {r.fishers} · 🧺 {r.artisans} · 🤝 {r.cooperatives}
                </Text>
                <Text style={u.muted}>
                  📋 {r.projects} projeto(s) · 👥 {formatNumber(r.beneficiaries)} beneficiário(s) · 📝 {r.reportsOpen} pedido(s) em aberto
                </Text>
                {r.key !== "NONE" ? (
                  <View style={u.row}>
                    <Btn small kind="outline" label="Ver só esta região" onPress={() => setRegion(r.key)} />
                    <Btn small kind="outline" label="📍 No mapa" onPress={() => navigation.navigate("GovMap")} />
                  </View>
                ) : (
                  <Text style={u.muted}>Pessoas e projetos sem região reconhecida. Peça-lhes que escrevam a região no perfil.</Text>
                )}
              </Card>
            ))}
          </>
        ) : null}

        {d.note ? <Text style={[u.muted, { marginTop: 12 }]}>{d.note}</Text> : null}
      </Page>
    </GovLayout>
  );
}
