import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NgoLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getSupportOverview, listCommunities } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { formatNumber } from "../utils/format";

const EMPTY = {
  overview: {
    beneficiaries: 0,
    registrations: 0,
    segments: { farmers: 0, fishers: 0, artisans: 0, cooperatives: 0, youth: 0, women: 0 },
    communities: { total: 0, rural: 0, coastal: 0, urban: 0 },
    needs: { open: 0, urgent: 0, high: 0, served: 0, byCategory: [] as any[] },
  },
  communities: [] as any[],
};

const GROUPS: [string, string][] = [
  ["", "Todas"],
  ["RURAL", "Rurais"],
  ["COSTEIRA", "Costeiras e ilhas"],
  ["URBANA", "Urbanas"],
];

function inGroup(community: any, group: string) {
  if (!group) return true;
  if (group === "COSTEIRA") return community.type === "COSTEIRA" || community.type === "ILHA";
  return community.type === group;
}

export default function NgoCommunitiesScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const [group, setGroup] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(
    async () => {
      const [overview, communities] = await Promise.all([getSupportOverview(), listCommunities({ q })]);
      return { overview, communities };
    },
    EMPTY,
    [q]
  );

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const o: any = loader.data.overview;
  const communities: any[] = (loader.data.communities as any[]).filter((c) => inGroup(c, group));

  const segments: [string, number, Record<string, any>][] = [
    ["🌾 Agricultores", o.segments.farmers, { sector: "AGRICULTURA" }],
    ["🎣 Pescadores", o.segments.fishers, { sector: "PESCA" }],
    ["🧺 Artesãos", o.segments.artisans, { sector: "ARTESANATO" }],
    ["🤝 Cooperativas", o.segments.cooperatives, { sector: "COOPERATIVA" }],
    ["🧑 Jovens", o.segments.youth, { youth: true }],
    ["👩 Mulheres", o.segments.women, { gender: "F" }],
  ];

  return (
    <NgoLayout active="NgoCommunities">
      <Page loader={loader}>
        <Title>🤝 Apoio às comunidades</Title>

        <Card>
          <Text style={u.muted}>Pessoas apoiadas pela sua organização</Text>
          <Text style={{ fontSize: 28, fontWeight: "bold" }}>{formatNumber(o.beneficiaries)}</Text>
          <Text style={u.muted}>Uma pessoa apoiada em vários projetos conta uma só vez.</Text>
        </Card>

        <View style={u.row}>
          <Btn small label="👥 Registar beneficiários" onPress={() => navigation.navigate("NgoBeneficiaryForm")} />
          <Btn small kind="outline" label="🔎 Procurar pessoas no app" onPress={() => navigation.navigate("NgoDiscover")} />
        </View>

        <SubTitle>Quem apoiamos</SubTitle>
        <View style={u.grid}>
          {segments.map(([label, value, params]) => (
            <TouchableOpacity key={label} style={u.tile} onPress={() => navigation.navigate("NgoBeneficiaries", params)}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <SubTitle>Necessidades</SubTitle>
        <Card>
          <View style={u.between}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={u.strong}>{o.needs.open} em aberto</Text>
              <Text style={u.muted}>
                {o.needs.urgent} urgente(s) · {o.needs.high} de prioridade alta · {o.needs.served} atendida(s)
              </Text>
            </View>
            {o.needs.urgent > 0 ? <Badge label="Urgente" color="#C62828" /> : null}
          </View>

          {o.needs.byCategory.slice(0, 5).map((c: any) => (
            <View key={c.category} style={[u.between, { marginTop: 6 }]}>
              <Text style={{ flex: 1, marginRight: 8 }}>{labelOf(catalog.needCategories, c.category)}</Text>
              <Text style={{ fontWeight: "bold" }}>{c.count}</Text>
            </View>
          ))}

          <View style={u.row}>
            <Btn small label="📍 Identificar necessidade" onPress={() => navigation.navigate("NgoNeedForm")} />
            <Btn small kind="outline" label="Ver necessidades" onPress={() => navigation.navigate("NgoNeeds")} />
          </View>
        </Card>

        <View style={u.row}>
          <Btn small kind="outline" label="🙋 Pedidos de apoio" onPress={() => navigation.navigate("NgoRequests")} />
          <Btn small kind="outline" label="📋 Todos os beneficiários" onPress={() => navigation.navigate("NgoBeneficiaries")} />
        </View>

        <SubTitle>Comunidades ({o.communities.total})</SubTitle>
        <View style={u.row}>
          <Chip label={`Rurais (${o.communities.rural})`} active={group === "RURAL"} onPress={() => setGroup(group === "RURAL" ? "" : "RURAL")} />
          <Chip
            label={`Costeiras e ilhas (${o.communities.coastal})`}
            active={group === "COSTEIRA"}
            onPress={() => setGroup(group === "COSTEIRA" ? "" : "COSTEIRA")}
          />
          <Chip label={`Urbanas (${o.communities.urban})`} active={group === "URBANA"} onPress={() => setGroup(group === "URBANA" ? "" : "URBANA")} />
          {group ? <Chip label="Todas" active={false} onPress={() => setGroup("")} /> : null}
        </View>

        <Btn label="➕ Registar comunidade" onPress={() => navigation.navigate("NgoCommunityForm")} />

        <Field
          placeholder="Procurar comunidade"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        {communities.length === 0 ? (
          <Empty
            text={
              o.communities.total === 0
                ? "Ainda não registou comunidades. Registe as comunidades onde trabalha para acompanhar as suas necessidades."
                : "Nenhuma comunidade com estes filtros."
            }
          />
        ) : (
          communities.map((c) => (
            <TouchableOpacity key={c.id} activeOpacity={0.85} onPress={() => navigation.navigate("NgoCommunity", { id: c.id })}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{c.name}</Text>
                  {c.openNeeds > 0 ? <Badge label={`${c.openNeeds} necessidade(s)`} color="#EF6C00" /> : null}
                </View>
                <Text style={u.muted}>
                  {labelOf(catalog.communityTypes, c.type)} · 📍 {c.region}
                </Text>
                <Text style={u.muted}>
                  👥 {c.beneficiaries} beneficiário(s)
                  {c.population ? ` · ${formatNumber(c.population)} habitantes` : ""}
                </Text>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </Page>
    </NgoLayout>
  );
}
