import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NgoLayout } from "../components/MerchantTabs";
import { Page, Title, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import NgoProjectCard from "../components/NgoProjectCard";
import { listNgoProjects } from "../api/ngo";
import { useNgoCatalog } from "../utils/ngoCatalog";

const EMPTY = { counts: {} as Record<string, number>, total: 0, projects: [] as any[] };

export default function NgoProjectsScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const [status, setStatus] = useState("");
  const [area, setArea] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(() => listNgoProjects({ status, area, q }), EMPTY, [status, area, q]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const statusOptions = catalog.projectStatus.map((s) => ({
    value: s.value,
    label: `${s.label} (${d.counts[s.value] ?? 0})`,
  }));

  return (
    <NgoLayout active="NgoProjects">
      <Page loader={loader}>
        <Title>📋 Meus projetos</Title>

        <Btn label="➕ Criar projeto" onPress={() => navigation.navigate("NgoProjectForm")} />

        <Field
          placeholder="Pesquisar projeto"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <ChipGroup
          label="Estado"
          options={statusOptions}
          value={status}
          onChange={setStatus}
          allowEmpty
          emptyLabel={`Todos (${d.total})`}
          scroll
        />
        <ChipGroup label="Área de atuação" options={catalog.areas} value={area} onChange={setArea} allowEmpty scroll />

        <View style={u.row}>
          <Btn small kind="outline" label="🌾 Agrícolas" onPress={() => navigation.navigate("NgoAreaProjects", { area: "AGRICULTURA" })} />
          <Btn small kind="outline" label="🎣 Pesca" onPress={() => navigation.navigate("NgoAreaProjects", { area: "PESCA" })} />
          <Btn small kind="outline" label="🧺 Artesanato" onPress={() => navigation.navigate("NgoAreaProjects", { area: "ARTESANATO" })} />
        </View>

        {d.projects.length === 0 ? (
          <Empty
            text={
              d.total === 0
                ? "Ainda não criou nenhum projeto. Toque em Criar projeto para começar."
                : "Nenhum projeto com estes filtros."
            }
          />
        ) : (
          d.projects.map((p: any) => (
            <NgoProjectCard key={p.id} project={p} catalog={catalog} onPress={() => navigation.navigate("NgoProject", { id: p.id })} />
          ))
        )}

        <Text style={[u.muted, { marginTop: 12 }]}>Os projetos públicos aparecem às outras pessoas no app. Pode torná-los privados ao editar.</Text>
      </Page>
    </NgoLayout>
  );
}
