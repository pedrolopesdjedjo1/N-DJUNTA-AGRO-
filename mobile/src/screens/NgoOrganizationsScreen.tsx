import React, { useEffect, useState } from "react";
import { View, Text, Image } from "react-native";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listOrganizations } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";

// Lista de organizações (ONGs e associações) registadas no app. Serve para qualquer perfil.
export default function NgoOrganizationsScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [area, setArea] = useState("");
  const [verified, setVerified] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);

  const loader = useLoader(() => listOrganizations({ q, region, area, verified }), [] as any[], [q, region, area, verified]);
  const items: any[] = loader.data;

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  return (
    <Page loader={loader}>
      <Title>🌍 Organizações</Title>
      <Text style={u.muted}>ONGs, associações e instituições que apoiam a agricultura, a pesca, o artesanato e as comunidades.</Text>

      <Field
        placeholder="Procurar pelo nome ou sigla"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />

      <ChipGroup label="Área de atuação" options={catalog.areas} value={area} onChange={setArea} allowEmpty scroll />
      {regions.length > 0 ? (
        <ChipGroup label="Região" options={regions.map((r) => ({ value: r, label: r }))} value={region} onChange={setRegion} allowEmpty scroll />
      ) : null}

      <View style={u.row}>
        <Chip label="✅ Só verificadas" active={verified} onPress={() => setVerified(!verified)} />
      </View>

      <Text style={[u.muted, { marginTop: 8 }]}>{loader.loading && items.length === 0 ? "A carregar..." : `${items.length} organização(ões)`}</Text>

      {items.length === 0 && !loader.loading ? (
        <Empty text="Nenhuma organização encontrada com estes filtros." />
      ) : (
        items.map((o) => (
          <Card key={o.ownerId}>
            <View style={[u.row, { alignItems: "center" }]}>
              {o.logoUrl ? (
                <Image source={{ uri: o.logoUrl }} style={[u.photo, { width: 56, height: 56, borderRadius: 28 }]} />
              ) : (
                <View style={[u.photo, { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ fontSize: 24 }}>🏢</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={u.strong}>
                  {o.name}
                  {o.acronym ? ` (${o.acronym})` : ""}
                </Text>
                {o.region ? <Text style={u.muted}>📍 {o.region}</Text> : null}
                <View style={{ marginTop: 4 }}>
                  <Badge label={o.isVerified ? "Verificada ✅" : "Não verificada"} color={o.isVerified ? "#2E7D32" : "#757575"} />
                </View>
              </View>
            </View>

            {o.areas?.length > 0 ? <Text style={u.muted}>{o.areas.map((a: string) => labelOf(catalog.areas, a)).join(", ")}</Text> : null}
            {o.description ? (
              <Text style={{ marginTop: 4 }} numberOfLines={2}>
                {o.description}
              </Text>
            ) : null}
            <Text style={u.muted}>📋 {o.projectsCount} projeto(s) público(s)</Text>

            <View style={u.row}>
              <Btn small label="Ver organização" onPress={() => navigation.navigate("NgoPublicOrganization", { id: o.ownerId })} />
              <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: o.ownerId, userName: o.name })} />
              <Btn
                small
                kind="outline"
                label="🙋 Pedir apoio"
                onPress={() => navigation.navigate("NgoRequestForm", { organizationId: o.ownerId, organizationName: o.name })}
              />
            </View>
          </Card>
        ))
      )}
    </Page>
  );
}
