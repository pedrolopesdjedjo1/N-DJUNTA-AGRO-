import React, { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listAgentCooperatives } from "../api/agent";
import { getGovRegions } from "../api/gov";
import { formatNumber } from "../utils/format";

const EMPTY = { total: 0, items: [] as any[] };

// Cooperativas da plataforma, com o líder e o número de membros
export default function AgentCooperativesScreen({ navigation, route }: any) {
  const [region, setRegion] = useState<string>(route?.params?.region ?? "");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);

  const loader = useLoader(() => listAgentCooperatives({ region, q }), EMPTY, [region, q]);
  const d: any = loader.data;

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (route?.params?.region !== undefined) setRegion(route.params.region ?? "");
  }, [route?.params?.region]);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <Page loader={loader}>
      <Title>🤝 Cooperativas</Title>
      <Text style={u.muted}>As cooperativas de agricultores, pescadores e artesãos. Fale com o líder para ajudar os seus membros.</Text>

      <Field
        placeholder="Procurar cooperativa"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />
      {regions.length > 0 ? (
        <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
      ) : null}

      <Text style={[u.muted, { marginTop: 8 }]}>{loader.loading && d.items.length === 0 ? "A carregar..." : `${d.total} cooperativa(s)`}</Text>

      {d.items.length === 0 && !loader.loading ? (
        <Empty text="Nenhuma cooperativa encontrada." />
      ) : (
        d.items.map((c: any) => (
          <Card key={c.id}>
            <Text style={u.strong}>🤝 {c.name}</Text>
            {c.region ? <Text style={u.muted}>📍 {c.region}</Text> : null}
            <Text style={u.muted}>👥 {formatNumber(c.members)} membro(s)</Text>
            {c.description ? (
              <Text style={{ marginTop: 4 }} numberOfLines={3}>
                {c.description}
              </Text>
            ) : null}
            {c.leader ? <Text style={[u.muted, { marginTop: 4 }]}>Líder: {c.leader.name}</Text> : null}

            <View style={u.row}>
              {c.leader ? (
                <Btn small kind="outline" label="💬 Falar com o líder" onPress={() => navigation.navigate("Chat", { userId: c.leader.id, userName: c.leader.name })} />
              ) : null}
              <Btn small kind="outline" label="📍 Registar necessidade" onPress={() => navigation.navigate("AgentNeedForm", { locality: c.region ?? undefined, regionKey: c.regionKey ?? undefined })} />
            </View>
          </Card>
        ))
      )}

      <View style={u.row}>
        <Btn small kind="outline" label="🌱 Produtores" onPress={() => navigation.navigate("AgentProducers", { region: region || undefined })} />
        <Btn small kind="outline" label="📢 Oportunidades" onPress={() => navigation.navigate("AgentOpportunities")} />
      </View>
    </Page>
  );
}
