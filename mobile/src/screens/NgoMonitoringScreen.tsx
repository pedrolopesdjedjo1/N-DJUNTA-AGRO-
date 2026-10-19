import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ProgressBar from "../components/ProgressBar";
import { HBars, ColumnBars } from "../components/ngo/Charts";
import { getMonitoring, listNgoProjects } from "../api/ngo";
import { PROJECT_STATUS_COLOR, colorOf } from "../constants/ngo";
import { formatNumber } from "../utils/format";
import { isDateText, pad, todayText } from "../utils/dates";
import { formatDate } from "../constants/market";
import { colors } from "../theme/colors";

const ZERO = {
  beneficiaries: 0,
  registrations: 0,
  farmers: 0,
  fishers: 0,
  artisans: 0,
  cooperatives: 0,
  youth: 0,
  women: 0,
  communitiesReached: 0,
  regionsReached: 0,
  productionKg: 0,
  fishKg: 0,
  jobsCreated: 0,
  areaHa: 0,
  families: 0,
  equipment: 0,
  peopleTrained: 0,
  trainedInApp: 0,
  trainedManual: 0,
  trainings: 0,
  trainingParticipants: 0,
};

const EMPTY = {
  monitoring: {
    period: { from: null as string | null, to: null as string | null },
    scope: "ORGANIZATION",
    project: null as any,
    totals: ZERO,
    results: [] as any[],
    byRegion: [] as any[],
    timeline: [] as any[],
    projects: [] as any[],
    note: "",
  },
  projects: [] as any[],
};

type Tile = [string, number, Record<string, any>?];

function monthLabel(month: string) {
  return `${month.slice(5, 7)}/${month.slice(2, 4)}`;
}

export default function NgoMonitoringScreen({ navigation, route }: any) {
  const [projectId, setProjectId] = useState<string>(route?.params?.projectId ?? "");
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });

  const loader = useLoader(
    async () => {
      const [monitoring, projects] = await Promise.all([
        getMonitoring({ projectId, from: range.from, to: range.to }),
        listNgoProjects(),
      ]);
      return { monitoring, projects: (projects as any).projects };
    },
    EMPTY,
    [projectId, range]
  );

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const m: any = loader.data.monitoring;
  const projects: any[] = loader.data.projects;
  const t = m.totals;
  const project = m.project;

  function setQuick(from: string, to: string) {
    setFromText(from);
    setToText(to);
    setRange({ from, to });
  }

  function applyRange() {
    if ((fromText.trim() && !isDateText(fromText.trim())) || (toText.trim() && !isDateText(toText.trim()))) {
      Alert.alert("Atenção", "Escreva as datas assim: AAAA-MM-DD (ex: 2026-01-01).");
      return;
    }
    setRange({ from: fromText.trim(), to: toText.trim() });
  }

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const yearStart = `${now.getFullYear()}-01-01`;

  const withProject = projectId ? { projectId } : {};

  const people: Tile[] = [
    ["👥 Beneficiários", t.beneficiaries, withProject],
    ["🌾 Agricultores apoiados", t.farmers, { ...withProject, sector: "AGRICULTURA" }],
    ["🎣 Pescadores apoiados", t.fishers, { ...withProject, sector: "PESCA" }],
    ["🧺 Artesãos apoiados", t.artisans, { ...withProject, sector: "ARTESANATO" }],
    ["🤝 Cooperativas", t.cooperatives, { ...withProject, sector: "COOPERATIVA" }],
    ["🧑 Jovens beneficiados", t.youth, { ...withProject, youth: true }],
    ["👩 Mulheres beneficiadas", t.women, { ...withProject, gender: "F" }],
    ["🏘️ Comunidades alcançadas", t.communitiesReached],
    ["🗺️ Regiões alcançadas", t.regionsReached],
  ];

  const results: Tile[] = [
    ["🌾 Produção gerada (kg)", t.productionKg],
    ["🐟 Pescado capturado (kg)", t.fishKg],
    ["💼 Empregos criados", t.jobsCreated],
    ["📐 Área cultivada (ha)", t.areaHa],
    ["👨‍👩‍👧 Famílias apoiadas", t.families],
    ["🛠️ Equipamentos entregues", t.equipment],
    ["🎓 Pessoas formadas", t.peopleTrained],
    ["📚 Formações realizadas", t.trainings],
    ["🙋 Participantes em formações", t.trainingParticipants],
  ];

  function tiles(list: Tile[]) {
    return (
      <View style={u.grid}>
        {list.map(([label, value, params]) => {
          const box = (
            <View style={u.tileBox}>
              <Text style={u.tileValue}>{formatNumber(value)}</Text>
              <Text style={u.tileLabel}>{label}</Text>
            </View>
          );
          return params ? (
            <TouchableOpacity key={label} style={u.tile} onPress={() => navigation.navigate("NgoBeneficiaries", params)}>
              {box}
            </TouchableOpacity>
          ) : (
            <View key={label} style={u.tile}>
              {box}
            </View>
          );
        })}
      </View>
    );
  }

  const reportParams = { projectId: projectId || undefined, from: range.from || undefined, to: range.to || undefined };
  const periodText =
    range.from || range.to ? `${range.from ? formatDate(`${range.from}T12:00:00`) : "início"} a ${range.to ? formatDate(`${range.to}T12:00:00`) : "hoje"}` : "Desde o início";

  return (
    <Page loader={loader}>
      <Title>📊 Monitoramento e resultados</Title>
      <Text style={u.muted}>Veja o que a sua organização alcançou. Os números vêm dos registos feitos no app.</Text>

      <View style={u.row}>
        <Btn small label="📑 Gerar relatório" onPress={() => navigation.navigate("NgoReport", reportParams)} />
        <Btn small kind="outline" label="📍 Ver no mapa" onPress={() => navigation.navigate("NgoMap")} />
        <Btn small kind="outline" label="💰 Relatório financeiro" onPress={() => navigation.navigate("NgoFinanceReport", { projectId: projectId || undefined })} />
      </View>

      {projects.length > 0 ? (
        <View style={[u.row, { marginTop: 4 }]}>
          <Chip label="Todos os projetos" active={projectId === ""} onPress={() => setProjectId("")} />
          {projects.map((p) => (
            <Chip key={p.id} label={p.name} active={projectId === p.id} onPress={() => setProjectId(projectId === p.id ? "" : p.id)} />
          ))}
        </View>
      ) : null}

      <SubTitle>Período: {periodText}</SubTitle>
      <View style={u.row}>
        <Chip label="Tudo" active={!range.from && !range.to} onPress={() => setQuick("", "")} />
        <Chip label="Este mês" active={range.from === monthStart && !range.to} onPress={() => setQuick(monthStart, "")} />
        <Chip label="Últimos 3 meses" active={range.from === todayText(-90) && !range.to} onPress={() => setQuick(todayText(-90), "")} />
        <Chip label="Este ano" active={range.from === yearStart && !range.to} onPress={() => setQuick(yearStart, "")} />
      </View>
      <View style={u.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Field label="De (AAAA-MM-DD)" value={fromText} onChangeText={setFromText} placeholder="2026-01-01" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Até (AAAA-MM-DD)" value={toText} onChangeText={setToText} placeholder="2026-12-31" />
        </View>
      </View>
      <Btn small kind="outline" label="Aplicar datas" onPress={applyRange} />

      {project ? (
        <Card>
          <Text style={u.strong}>📋 {project.name}</Text>
          {project.target ? (
            <View style={{ marginTop: 6 }}>
              <Text style={u.muted}>
                Meta de beneficiários: {formatNumber(project.beneficiaries)} de {formatNumber(project.target)} ({project.targetPercent ?? 0}%)
              </Text>
              <ProgressBar percent={project.targetPercent ?? 0} />
            </View>
          ) : (
            <Text style={u.muted}>
              {formatNumber(project.beneficiaries)} beneficiário(s). Defina uma meta ao editar o projeto para ver o progresso.
            </Text>
          )}
          <View style={u.row}>
            <Btn small kind="outline" label="Abrir projeto" onPress={() => navigation.navigate("NgoProject", { id: project.id })} />
            <Btn small kind="outline" label="➕ Registar resultado" onPress={() => navigation.navigate("NgoProject", { id: project.id })} />
          </View>
        </Card>
      ) : null}

      <SubTitle>Beneficiários</SubTitle>
      {tiles(people)}
      <Text style={u.muted}>Jovens: 15 a 35 anos. Uma pessoa apoiada em vários projetos conta uma só vez. Toque num número para ver a lista.</Text>

      <SubTitle>Resultados</SubTitle>
      {tiles(results)}
      {t.peopleTrained > 0 ? (
        <Text style={u.muted}>
          Pessoas formadas: {formatNumber(t.trainedInApp)} com certificado do app e {formatNumber(t.trainedManual)} registadas à mão nos resultados.
        </Text>
      ) : null}

      {m.results.length > 0 ? (
        <>
          <SubTitle>Todos os resultados registados</SubTitle>
          <Card>
            {m.results.map((r: any) => (
              <View key={`${r.indicator}-${r.label}`} style={[u.between, { marginTop: 6 }]}>
                <Text style={{ flex: 1, marginRight: 8 }}>{r.label}</Text>
                <Text style={{ fontWeight: "bold", color: colors.primary }}>
                  {formatNumber(r.value)} {r.unit}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <Empty text={projectId ? "Ainda não registou resultados deste projeto." : "Ainda não registou resultados. Abra um projeto e vá a Resultados."} />
      )}

      <SubTitle>Evolução: beneficiários acumulados (12 meses)</SubTitle>
      {m.timeline.length === 0 || t.beneficiaries === 0 ? (
        <Empty text="Ainda não há beneficiários para mostrar a evolução." />
      ) : (
        <Card>
          <ColumnBars data={m.timeline.map((x: any) => ({ label: monthLabel(x.month), value: x.total }))} />
          <Text style={[u.muted, { marginTop: 6 }]}>
            Novos no último mês: {formatNumber(m.timeline[m.timeline.length - 1]?.added ?? 0)}
          </Text>
        </Card>
      )}

      <SubTitle>Beneficiários por região</SubTitle>
      {m.byRegion.length === 0 ? (
        <Empty text="Sem dados por região." />
      ) : (
        <Card>
          <HBars data={m.byRegion.map((r: any) => ({ label: r.region, value: r.beneficiaries }))} />
        </Card>
      )}

      {m.scope === "ORGANIZATION" ? (
        <>
          <SubTitle>Impacto por projeto</SubTitle>
          {m.projects.length === 0 ? (
            <Empty text="Ainda não criou projetos." />
          ) : (
            m.projects.map((p: any) => (
              <Card key={p.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.name}</Text>
                  <Badge label={p.statusLabel} color={colorOf(PROJECT_STATUS_COLOR, p.status)} />
                </View>
                <Text style={u.muted}>
                  {p.areaLabel}
                  {p.region ? ` · 📍 ${p.region}` : ""}
                </Text>

                <Text style={[u.muted, { marginTop: 6 }]}>
                  👥 {formatNumber(p.beneficiaries)} beneficiário(s){p.target ? ` de ${formatNumber(p.target)}` : ""}
                </Text>
                {p.targetPercent !== null && p.targetPercent !== undefined ? <ProgressBar percent={p.targetPercent} /> : null}

                {p.progress !== null && p.progress !== undefined ? <Text style={[u.muted, { marginTop: 4 }]}>Execução: {p.progress}%</Text> : null}
                <Text style={u.muted}>
                  📊 {p.resultsCount} resultado(s) · 📝 {p.updatesCount} atualização(ões)
                  {p.lastUpdate ? ` · última em ${formatDate(p.lastUpdate)}` : ""}
                </Text>

                <View style={u.row}>
                  <Btn small kind="outline" label="Abrir" onPress={() => navigation.navigate("NgoProject", { id: p.id })} />
                  <Btn small kind="outline" label="Só este projeto" onPress={() => setProjectId(p.id)} />
                </View>
              </Card>
            ))
          )}
        </>
      ) : null}

      {m.note ? <Text style={[u.muted, { marginTop: 12 }]}>{m.note}</Text> : null}
    </Page>
  );
}
