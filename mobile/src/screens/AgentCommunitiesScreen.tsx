import React, { useCallback, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getAgentCommunities } from "../api/agent";
import { ROLE_ICON, ROLE_NAME } from "../constants/agent";
import { formatNumber } from "../utils/format";

const EMPTY = { regions: [] as any[], localities: [] as any[], unplacedClients: 0 };

// Produtores e comunidades: o que há em cada região e onde estão os clientes do agente
export default function AgentCommunitiesScreen({ navigation }: any) {
  const [region, setRegion] = useState("");

  const loader = useLoader(() => getAgentCommunities({ region }), EMPTY, [region]);
  const d: any = loader.data;
  const regions: any[] = d.regions;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const sum = (field: string) => regions.reduce((s, r) => s + (Number(r[field]) || 0), 0);
  const shown = region ? regions.filter((r) => r.key === region) : regions;

  return (
    <Page loader={loader}>
      <Title>🌱 Produtores e comunidades</Title>
      <Text style={u.muted}>Veja os agricultores, pescadores, artesãos, comerciantes e cooperativas de cada região, e as necessidades que identificou.</Text>

      <View style={u.row}>
        <Btn small label="🌱 Produtores" onPress={() => navigation.navigate("AgentProducers", { region: region || undefined })} />
        <Btn small kind="outline" label="🤝 Cooperativas" onPress={() => navigation.navigate("AgentCooperatives", { region: region || undefined })} />
        <Btn small kind="outline" label="📍 Necessidades" onPress={() => navigation.navigate("AgentNeeds", { region: region || undefined })} />
      </View>
      <View style={u.row}>
        <Btn small kind="outline" label="📢 Encaminhar oportunidades" onPress={() => navigation.navigate("AgentOpportunities")} />
        <Btn small kind="outline" label="🗺️ Mapa" onPress={() => navigation.navigate("AgentMap")} />
        <Btn small kind="outline" label="➕ Registar pessoa" onPress={() => navigation.navigate("AgentClientForm")} />
      </View>

      <View style={u.grid}>
        {(
          [
            ["🌾 Agricultores", sum("farmers")],
            ["🎣 Pescadores", sum("fishers")],
            ["🧺 Artesãos", sum("artisans")],
            ["🏪 Comerciantes", sum("merchants")],
            ["🤝 Cooperativas", sum("cooperatives")],
            ["📍 As suas necessidades abertas", sum("needs")],
          ] as [string, number][]
        ).map(([label, value]) => (
          <View key={label} style={u.tile}>
            <View style={u.tileBox}>
              <Text style={u.tileValue}>{formatNumber(value)}</Text>
              <Text style={u.tileLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={u.muted}>Números de todo o país, por região. Não mostram dados pessoais.</Text>

      <SubTitle>Região</SubTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip label="Todas" active={region === ""} onPress={() => setRegion("")} />
        {regions.map((r) => (
          <Chip key={r.key} label={`${r.mine ? "⭐ " : ""}${r.name}`} active={region === r.key} onPress={() => setRegion(region === r.key ? "" : r.key)} />
        ))}
      </ScrollView>

      {shown.length === 0 && !loader.loading ? (
        <Empty text="Sem dados por região." />
      ) : (
        shown.map((r) => (
          <Card key={r.key}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🗺️ {r.name}</Text>
              {r.mine ? <Badge label="A sua região" color="#00838F" /> : null}
            </View>

            <Text style={u.muted}>
              🌾 {r.farmers} · 🎣 {r.fishers} · 🧺 {r.artisans} · 🏪 {r.merchants}
            </Text>
            <Text style={u.muted}>
              🤝 {r.cooperatives} cooperativa(s) · 🛒 {r.markets} mercado(s)
            </Text>
            <Text style={u.muted}>
              👥 {r.clients} cliente(s) seu(s)
              {r.needs > 0 ? ` · 📍 ${r.needs} necessidade(s) aberta(s)` : ""}
            </Text>

            <View style={u.row}>
              <Btn small kind="outline" label="Produtores" onPress={() => navigation.navigate("AgentProducers", { region: r.key })} />
              <Btn small kind="outline" label="Cooperativas" onPress={() => navigation.navigate("AgentCooperatives", { region: r.key })} />
              <Btn small kind="outline" label="Necessidades" onPress={() => navigation.navigate("AgentNeeds", { region: r.key })} />
            </View>
          </Card>
        ))
      )}

      <SubTitle>As comunidades dos meus clientes</SubTitle>
      {d.localities.length === 0 ? (
        <Empty text="Ainda não tem clientes com localidade indicada." />
      ) : (
        d.localities.map((p: any) => (
          <Card key={`${p.name}-${p.regionKey}`}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>📍 {p.name}</Text>
              <Badge label={`${p.count} cliente(s)`} color="#2E7D32" />
            </View>
            <Text style={u.muted}>
              {Object.keys(p.kinds)
                .map((k) => `${ROLE_ICON[k] ?? ""} ${p.kinds[k]} ${ROLE_NAME[k] ?? k}`.trim())
                .join(" · ")}
            </Text>
            <View style={u.row}>
              <Btn small kind="outline" label="📍 Registar necessidade aqui" onPress={() => navigation.navigate("AgentNeedForm", { locality: p.name, regionKey: p.regionKey ?? undefined })} />
            </View>
          </Card>
        ))
      )}
      {d.unplacedClients > 0 ? (
        <Text style={u.muted}>{d.unplacedClients} cliente(s) sem localidade indicada. Peça-lhes que a escrevam no perfil.</Text>
      ) : null}
    </Page>
  );
}
