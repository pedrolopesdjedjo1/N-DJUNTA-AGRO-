import React, { useEffect, useState } from "react";
import { View, Text, Image } from "react-native";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listInstitutions, getGovRegions } from "../api/gov";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { useGovCatalog } from "../utils/govCatalog";

// Instituições públicas (ministérios, direções, municípios...) registadas no app. Serve para qualquer perfil.
export default function GovInstitutionsScreen({ navigation }: any) {
  const ngo = useNgoCatalog();
  const gov = useGovCatalog();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [area, setArea] = useState("");
  const [verified, setVerified] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);

  const loader = useLoader(() => listInstitutions({ q, region, area, verified }), [] as any[], [q, region, area, verified]);
  const items: any[] = loader.data;

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  return (
    <Page loader={loader}>
      <Title>🏢 Instituições públicas</Title>
      <Text style={u.muted}>Ministérios, direções, delegacias, municípios e serviços do Estado ligados à agricultura, à pesca, ao ambiente, ao comércio e ao desenvolvimento.</Text>

      <Field
        placeholder="Procurar pelo nome ou sigla"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />

      <ChipGroup label="Área de atuação" options={ngo.areas} value={area} onChange={setArea} allowEmpty scroll />
      {regions.length > 0 ? (
        <ChipGroup label="Região" options={regions.map((r) => ({ value: r, label: r }))} value={region} onChange={setRegion} allowEmpty scroll />
      ) : null}
      <View style={u.row}>
        <Chip label="✅ Só verificadas" active={verified} onPress={() => setVerified(!verified)} />
      </View>

      <Text style={[u.muted, { marginTop: 8 }]}>{loader.loading && items.length === 0 ? "A carregar..." : `${items.length} instituição(ões)`}</Text>

      {items.length === 0 && !loader.loading ? (
        <Empty text="Nenhuma instituição encontrada com estes filtros." />
      ) : (
        items.map((o) => (
          <Card key={o.ownerId}>
            <View style={[u.row, { alignItems: "center" }]}>
              {o.logoUrl ? (
                <Image source={{ uri: o.logoUrl }} style={[u.photo, { width: 56, height: 56, borderRadius: 28 }]} />
              ) : (
                <View style={[u.photo, { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ fontSize: 24 }}>🏛️</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={u.strong}>
                  {o.name}
                  {o.acronym ? ` (${o.acronym})` : ""}
                </Text>
                {o.institutionType ? <Text style={u.muted}>{labelOf(gov.institutionTypes, o.institutionType)}</Text> : null}
                {o.parentInstitution ? <Text style={u.muted}>{o.parentInstitution}</Text> : null}
                {o.region ? <Text style={u.muted}>📍 {o.region}</Text> : null}
                <View style={{ marginTop: 4 }}>
                  <Badge label={o.isVerified ? "Verificada ✅" : "Não verificada"} color={o.isVerified ? "#2E7D32" : "#757575"} />
                </View>
              </View>
            </View>

            {o.areas?.length > 0 ? <Text style={u.muted}>{o.areas.map((a: string) => labelOf(ngo.areas, a)).join(", ")}</Text> : null}
            {o.description ? (
              <Text style={{ marginTop: 4 }} numberOfLines={2}>
                {o.description}
              </Text>
            ) : null}
            <Text style={u.muted}>📋 {o.projectsCount} projeto(s) público(s)</Text>

            <View style={u.row}>
              <Btn small label="Ver instituição" onPress={() => navigation.navigate("NgoPublicOrganization", { id: o.ownerId })} />
              <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: o.ownerId, userName: o.name })} />
              <Btn
                small
                kind="outline"
                label="📝 Enviar pedido"
                onPress={() => navigation.navigate("GovReportForm", { institutionId: o.ownerId, institutionName: o.name })}
              />
            </View>
          </Card>
        ))
      )}

      <View style={u.row}>
        <Btn small kind="outline" label="🏛️ Serviços públicos" onPress={() => navigation.navigate("GovServices")} />
        <Btn small kind="outline" label="📣 Programas públicos" onPress={() => navigation.navigate("GovPublicPrograms")} />
      </View>
    </Page>
  );
}
