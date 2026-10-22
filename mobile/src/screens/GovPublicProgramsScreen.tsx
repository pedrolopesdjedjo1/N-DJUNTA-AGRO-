import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { Page, Title, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import GovProgramCard from "../components/gov/ProgramCard";
import { listPublicPrograms, getGovRegions } from "../api/gov";
import { useNgoCatalog } from "../utils/ngoCatalog";

// Programas públicos das instituições do Governo. Serve para qualquer perfil.
export default function GovPublicProgramsScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const [area, setArea] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<string[]>([]);

  const loader = useLoader(() => listPublicPrograms({ area, region, status, q }), [] as any[], [area, region, status, q]);
  const items: any[] = loader.data;

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  return (
    <Page loader={loader}>
      <Title>📣 Programas públicos</Title>
      <Text style={u.muted}>Programas do Governo para a agricultura, a pesca, o artesanato e as comunidades.</Text>

      <Field
        placeholder="Procurar programa"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />

      <ChipGroup label="Área" options={catalog.areas} value={area} onChange={setArea} allowEmpty scroll />
      {regions.length > 0 ? (
        <ChipGroup label="Região" options={regions.map((r) => ({ value: r, label: r }))} value={region} onChange={setRegion} allowEmpty scroll />
      ) : null}
      <ChipGroup label="Estado" options={catalog.projectStatus} value={status} onChange={setStatus} allowEmpty scroll />

      {items.length === 0 ? (
        <Empty text="Nenhum programa público com estes filtros." />
      ) : (
        items.map((p) => (
          <GovProgramCard key={p.id} program={p} catalog={catalog} showOrg onPress={() => navigation.navigate("GovPublicProgram", { id: p.id })} />
        ))
      )}
    </Page>
  );
}
