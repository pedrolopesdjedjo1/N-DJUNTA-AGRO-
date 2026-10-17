import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import NgoProjectCard from "../components/NgoProjectCard";
import { listNgoProjects } from "../api/ngo";
import { useNgoCatalog, iconOf, labelOf } from "../utils/ngoCatalog";
import { AREA_INTRO } from "../constants/ngo";

const EMPTY = { counts: {}, total: 0, projects: [] as any[] };

// Projetos agrícolas, de pesca e de artesanato e empreendedorismo
export default function NgoAreaProjectsScreen({ navigation, route }: any) {
  const area: string = route?.params?.area ?? "AGRICULTURA";
  const catalog = useNgoCatalog();
  const [focus, setFocus] = useState("");

  const loader = useLoader(() => listNgoProjects({ area }), EMPTY, [area]);
  const projects: any[] = loader.data.projects;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [area])
  );

  const focusOptions = catalog.focus[area] ?? [];
  const countOf = (value: string) => projects.filter((p) => p.focus === value).length;
  const shown = focus ? projects.filter((p) => p.focus === focus) : projects;

  return (
    <Page loader={loader}>
      <Title>
        {iconOf(catalog.areas, area)} {labelOf(catalog.areas, area)}
      </Title>
      {AREA_INTRO[area] ? <Text style={u.muted}>{AREA_INTRO[area]}</Text> : null}

      <Btn
        label="➕ Criar projeto desta área"
        onPress={() => navigation.navigate("NgoProjectForm", { area, focus: focus || undefined })}
      />

      <SubTitle>Tipos de apoio</SubTitle>
      <View style={u.row}>
        <Chip label={`Todos (${projects.length})`} active={focus === ""} onPress={() => setFocus("")} />
        {focusOptions.map((f) => (
          <Chip
            key={f.value}
            label={`${f.label} (${countOf(f.value)})`}
            active={focus === f.value}
            onPress={() => setFocus(focus === f.value ? "" : f.value)}
          />
        ))}
      </View>

      {focus ? (
        <Card>
          <Text style={u.strong}>{labelOf(focusOptions, focus)}</Text>
          <Text style={u.muted}>
            {countOf(focus) === 0 ? "Ainda não tem projetos deste tipo." : `${countOf(focus)} projeto(s) deste tipo.`}
          </Text>
          <Btn small label="➕ Criar projeto deste tipo" onPress={() => navigation.navigate("NgoProjectForm", { area, focus })} />
        </Card>
      ) : null}

      <SubTitle>Os meus projetos</SubTitle>
      {shown.length === 0 ? (
        <Empty text="Nenhum projeto por agora." />
      ) : (
        shown.map((p) => (
          <NgoProjectCard key={p.id} project={p} catalog={catalog} onPress={() => navigation.navigate("NgoProject", { id: p.id })} />
        ))
      )}

      <SubTitle>Outras ferramentas</SubTitle>
      <View style={u.row}>
        <Btn small kind="outline" label="📚 Formações" onPress={() => navigation.navigate("NgoTrainings")} />
        <Btn small kind="outline" label="🙋 Pedidos de apoio" onPress={() => navigation.navigate("NgoRequests")} />
        <Btn small kind="outline" label="📍 Necessidades" onPress={() => navigation.navigate("NgoNeeds")} />
        <Btn small kind="outline" label="📢 Oportunidades" onPress={() => navigation.navigate("NgoOpportunities")} />
      </View>
    </Page>
  );
}
