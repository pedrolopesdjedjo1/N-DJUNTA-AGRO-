import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import GovProgramCard from "../components/gov/ProgramCard";
import NgoProjectCard from "../components/NgoProjectCard";
import AlertCard from "../components/gov/AlertCard";
import { listPrograms, listAlerts } from "../api/gov";
import { listNgoProjects } from "../api/ngo";
import { useNgoCatalog, iconOf, labelOf } from "../utils/ngoCatalog";
import { useGovCatalog } from "../utils/govCatalog";
import { AREA_INTRO } from "../constants/ngo";

interface Quick {
  label: string;
  route: string;
  params?: Record<string, any>;
}

interface Config {
  title: string;
  alertKind: string | null;
  alertLabel: string;
  quick: Quick[];
}

const CONFIG: Record<string, Config> = {
  AGRICULTURA: {
    title: "Agricultura",
    alertKind: "AGRICOLA",
    alertLabel: "Alertas agrícolas",
    quick: [
      { label: "👨‍🌾 Apoio aos agricultores", route: "NgoBeneficiaries", params: { sector: "AGRICULTURA" } },
      { label: "📚 Formação", route: "NgoTrainings" },
      { label: "🌾 Produção agrícola (dados)", route: "GovData" },
      { label: "🤝 Cooperativas", route: "NgoDiscover" },
      { label: "🌦️ Clima e alertas", route: "GovWeather" },
    ],
  },
  PESCA: {
    title: "Pesca",
    alertKind: "MARITIMO",
    alertLabel: "Alertas marítimos",
    quick: [
      { label: "🎣 Apoio aos pescadores", route: "NgoBeneficiaries", params: { sector: "PESCA" } },
      { label: "🆘 Segurança marítima (SOS)", route: "RescueSos" },
      { label: "🐟 Produção pesqueira (dados)", route: "GovData" },
      { label: "🏘️ Comunidades pesqueiras", route: "NgoCommunities" },
      { label: "📚 Guias e formação", route: "Learning" },
    ],
  },
  ARTESANATO: {
    title: "Artesanato e pequenos negócios",
    alertKind: null,
    alertLabel: "",
    quick: [
      { label: "📚 Formação", route: "NgoTrainings" },
      { label: "💰 Financiamento", route: "NgoOpportunities", params: { kind: "FINANCIAMENTO" } },
      { label: "🎪 Feiras", route: "Events" },
      { label: "🧑 Apoio a jovens", route: "NgoBeneficiaries", params: { youth: true } },
      { label: "👩 Apoio às mulheres", route: "NgoBeneficiaries", params: { gender: "F" } },
      { label: "🛒 Mercados", route: "GovPlaces", params: { kind: "MERCADO" } },
    ],
  },
};

const EMPTY = { programs: [] as any[], projects: [] as any[], alerts: [] as any[] };

export default function GovAreaScreen({ navigation, route }: any) {
  const area: string = route?.params?.area ?? "AGRICULTURA";
  const cfg = CONFIG[area] ?? CONFIG.AGRICULTURA;
  const ngo = useNgoCatalog();
  const gov = useGovCatalog();
  const [focus, setFocus] = useState("");

  const loader = useLoader(
    async () => {
      const [programs, projects, alerts] = await Promise.all([
        listPrograms({ area }),
        listNgoProjects({ area }),
        cfg.alertKind ? listAlerts({ kind: cfg.alertKind, all: true }) : Promise.resolve({ items: [] as any[] }),
      ]);
      return { programs: programs.programs, projects: projects.projects, alerts: alerts.items };
    },
    EMPTY,
    [area]
  );
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [area])
  );

  const focusOptions = ngo.focus[area] ?? [];
  const projects: any[] = focus ? d.projects.filter((p: any) => p.focus === focus) : d.projects;
  const countOf = (value: string) => d.projects.filter((p: any) => p.focus === value).length;

  return (
    <Page loader={loader}>
      <Title>
        {iconOf(ngo.areas, area)} {cfg.title}
      </Title>
      {AREA_INTRO[area] ? <Text style={u.muted}>{AREA_INTRO[area]}</Text> : null}

      <View style={u.row}>
        <Btn small label="➕ Criar programa" onPress={() => navigation.navigate("GovProgramForm", { area })} />
        <Btn small kind="outline" label="➕ Criar projeto" onPress={() => navigation.navigate("NgoProjectForm", { area, focus: focus || undefined })} />
      </View>

      {cfg.alertKind && d.alerts.length > 0 ? (
        <>
          <SubTitle>🚨 {cfg.alertLabel} ativos</SubTitle>
          {d.alerts.slice(0, 3).map((a: any) => (
            <AlertCard key={a.id} alert={a} catalog={gov} onPress={() => navigation.navigate("GovAlert", { id: a.id })} />
          ))}
        </>
      ) : null}

      <View style={u.row}>
        {cfg.alertKind ? (
          <Btn small kind="outline" label={`🚨 ${cfg.alertLabel}`} onPress={() => navigation.navigate("GovAlerts", { kind: cfg.alertKind })} />
        ) : null}
        {cfg.alertKind ? <Btn small kind="outline" label="➕ Criar alerta" onPress={() => navigation.navigate("GovAlertForm", { kind: cfg.alertKind })} /> : null}
      </View>

      <SubTitle>Programas ({d.programs.length})</SubTitle>
      {d.programs.length === 0 ? (
        <Empty text="Ainda não criou programas nesta área." />
      ) : (
        d.programs.map((p: any) => (
          <GovProgramCard key={p.id} program={p} catalog={ngo} onPress={() => navigation.navigate("GovProgram", { id: p.id })} />
        ))
      )}

      <SubTitle>Tipos de apoio</SubTitle>
      <View style={u.row}>
        <Chip label={`Todos (${d.projects.length})`} active={focus === ""} onPress={() => setFocus("")} />
        {focusOptions.map((f) => (
          <Chip key={f.value} label={`${f.label} (${countOf(f.value)})`} active={focus === f.value} onPress={() => setFocus(focus === f.value ? "" : f.value)} />
        ))}
      </View>

      {focus ? (
        <Card>
          <Text style={u.strong}>{labelOf(focusOptions, focus)}</Text>
          <Text style={u.muted}>{countOf(focus) === 0 ? "Ainda não tem projetos deste tipo." : `${countOf(focus)} projeto(s) deste tipo.`}</Text>
          <Btn small label="➕ Criar projeto deste tipo" onPress={() => navigation.navigate("NgoProjectForm", { area, focus })} />
        </Card>
      ) : null}

      <SubTitle>Projetos ({projects.length})</SubTitle>
      {projects.length === 0 ? (
        <Empty text="Nenhum projeto por agora." />
      ) : (
        projects.map((p: any) => (
          <NgoProjectCard key={p.id} project={p} catalog={ngo} onPress={() => navigation.navigate("NgoProject", { id: p.id })} />
        ))
      )}

      <SubTitle>Outras ferramentas</SubTitle>
      <View style={u.row}>
        {cfg.quick.map((q) => (
          <Btn key={q.label} small kind="outline" label={q.label} onPress={() => navigation.navigate(q.route, q.params)} />
        ))}
      </View>
    </Page>
  );
}
