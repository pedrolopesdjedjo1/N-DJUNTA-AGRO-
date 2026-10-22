import React, { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { GovLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import GovProgramCard from "../components/gov/ProgramCard";
import NgoProjectCard from "../components/NgoProjectCard";
import { listPrograms } from "../api/gov";
import { listNgoProjects } from "../api/ngo";
import { useNgoCatalog } from "../utils/ngoCatalog";

type Tab = "programs" | "projects";

const EMPTY = { counts: {} as Record<string, number>, total: 0, items: [] as any[] };

export default function GovProjectsScreen({ navigation, route }: any) {
  const catalog = useNgoCatalog();
  const [tab, setTab] = useState<Tab>(route?.params?.tab === "projects" ? "projects" : "programs");
  const [status, setStatus] = useState("");
  const [area, setArea] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (route?.params?.tab) setTab(route.params.tab === "projects" ? "projects" : "programs");
  }, [route?.params?.tab]);

  const loader = useLoader(
    async () => {
      if (tab === "programs") {
        const r = await listPrograms({ status, area, q });
        return { counts: r.counts, total: r.total, items: r.programs };
      }
      const r = await listNgoProjects({ status, area, q });
      return { counts: r.counts, total: r.total, items: r.projects };
    },
    EMPTY,
    [tab, status, area, q]
  );
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const statusOptions = catalog.projectStatus.map((s) => ({ value: s.value, label: `${s.label} (${d.counts[s.value] ?? 0})` }));

  return (
    <GovLayout active="GovProjects">
      <Page loader={loader}>
        <Title>📋 Programas e projetos</Title>

        <View style={u.row}>
          <Btn small label="➕ Criar programa" onPress={() => navigation.navigate("GovProgramForm")} />
          <Btn small kind="outline" label="➕ Criar projeto" onPress={() => navigation.navigate("NgoProjectForm")} />
        </View>

        <View style={u.row}>
          <Chip label="Programas" active={tab === "programs"} onPress={() => setTab("programs")} />
          <Chip label="Projetos" active={tab === "projects"} onPress={() => setTab("projects")} />
        </View>

        <Field
          placeholder={tab === "programs" ? "Pesquisar programa" : "Pesquisar projeto"}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <ChipGroup label="Estado" options={statusOptions} value={status} onChange={setStatus} allowEmpty emptyLabel={`Todos (${d.total})`} scroll />
        <ChipGroup label="Área" options={catalog.areas} value={area} onChange={setArea} allowEmpty scroll />

        <View style={u.row}>
          <Btn small kind="outline" label="🌾 Agricultura" onPress={() => navigation.navigate("GovArea", { area: "AGRICULTURA" })} />
          <Btn small kind="outline" label="🎣 Pesca" onPress={() => navigation.navigate("GovArea", { area: "PESCA" })} />
          <Btn small kind="outline" label="🧺 Artesanato" onPress={() => navigation.navigate("GovArea", { area: "ARTESANATO" })} />
        </View>
        <View style={u.row}>
          <Btn small kind="outline" label="🏘️ Comunidades" onPress={() => navigation.navigate("NgoCommunities")} />
          <Btn small kind="outline" label="📍 Mapa" onPress={() => navigation.navigate("GovMap")} />
          <Btn small kind="outline" label="📣 Programas públicos" onPress={() => navigation.navigate("GovPublicPrograms")} />
        </View>

        {d.items.length === 0 ? (
          <Empty
            text={
              d.total === 0
                ? tab === "programs"
                  ? "Ainda não criou programas. Um programa junta vários projetos do mesmo objetivo."
                  : "Ainda não criou projetos."
                : "Nada com estes filtros."
            }
          />
        ) : tab === "programs" ? (
          d.items.map((p: any) => (
            <GovProgramCard key={p.id} program={p} catalog={catalog} onPress={() => navigation.navigate("GovProgram", { id: p.id })} />
          ))
        ) : (
          d.items.map((p: any) => (
            <NgoProjectCard key={p.id} project={p} catalog={catalog} onPress={() => navigation.navigate("NgoProject", { id: p.id })} />
          ))
        )}

        <Text style={[u.muted, { marginTop: 12 }]}>
          Os programas e projetos públicos aparecem aos cidadãos no app. O orçamento nunca aparece na vista pública.
        </Text>
      </Page>
    </GovLayout>
  );
}
