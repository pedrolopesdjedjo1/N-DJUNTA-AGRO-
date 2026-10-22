import React, { useCallback, useState } from "react";
import { View, Text, Alert, Switch, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import ProgressBar from "../components/ProgressBar";
import { getProgram, updateProgram, deleteProgram, linkProgramProject, unlinkProgramProject } from "../api/gov";
import { useNgoCatalog, iconOf, labelOf } from "../utils/ngoCatalog";
import { PROJECT_STATUS_COLOR, colorOf } from "../constants/ngo";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate, formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

type TabKey = "overview" | "projects" | "results" | "updates";

export default function GovProgramScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useNgoCatalog();
  const loader = useLoader(() => getProgram(id), null as any, [id]);
  const bundle: any = loader.data;

  const [tab, setTab] = useState<TabKey>("overview");
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!bundle) {
    return (
      <Page loader={loader}>
        <Title>Programa</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const p = bundle.program;
  const onBundle = (b: any) => loader.setData(b);
  const hasTarget = !!p.targetBeneficiaries && p.targetBeneficiaries > 0;
  const targetPercent = hasTarget ? Math.min(100, Math.round(((p.beneficiaries ?? 0) / p.targetBeneficiaries) * 100)) : null;

  const tabs: [TabKey, string][] = [
    ["overview", "Resumo"],
    ["projects", `Projetos (${bundle.projects.length})`],
    ["results", `Resultados (${bundle.results.length})`],
    ["updates", `Atualizações (${bundle.updates.length})`],
  ];

  async function change(body: Record<string, any>, fail: string) {
    setBusy(true);
    try {
      onBundle(await updateProgram(id, body));
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function changeStatus(next: string) {
    if (next === p.status) return;
    const label = labelOf(catalog.projectStatus, next);
    if (next === "CONCLUIDO" || next === "CANCELADO") {
      Alert.alert("Mudar o estado", `Marcar o programa como "${label}"?`, [
        { text: "Não", style: "cancel" },
        { text: "Sim", onPress: () => change({ status: next }, "Não foi possível mudar o estado.") },
      ]);
    } else {
      change({ status: next }, "Não foi possível mudar o estado.");
    }
  }

  function remove() {
    Alert.alert("Apagar programa", "Os projetos ficam guardados, mas deixam de fazer parte do programa. Apagar?", [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProgram(id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar o programa."));
          }
        },
      },
    ]);
  }

  async function link() {
    if (!pick) {
      Alert.alert("Atenção", "Escolha o projeto.");
      return;
    }
    setBusy(true);
    try {
      onBundle(await linkProgramProject(id, pick));
      setPick("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível juntar o projeto."));
    } finally {
      setBusy(false);
    }
  }

  function unlink(project: any) {
    Alert.alert("Tirar do programa", `Tirar "${project.name}" deste programa? O projeto continua a existir.`, [
      { text: "Não", style: "cancel" },
      {
        text: "Tirar",
        style: "destructive",
        onPress: async () => {
          try {
            onBundle(await unlinkProgramProject(id, project.id));
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível tirar o projeto."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>{p.name}</Title>
        </View>
        <Badge label={labelOf(catalog.projectStatus, p.status)} color={colorOf(PROJECT_STATUS_COLOR, p.status)} />
      </View>
      <Text style={u.muted}>
        {iconOf(catalog.areas, p.area)} {labelOf(catalog.areas, p.area)}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
        {tabs.map(([key, label]) => (
          <Chip key={key} label={label} active={tab === key} onPress={() => setTab(key)} />
        ))}
      </ScrollView>

      {tab === "overview" ? (
        <View>
          <Card>
            <Text>📍 {p.regions && p.regions.length > 0 ? p.regions.join(", ") : "Todo o país"}</Text>
            {p.startDate || p.endDate ? (
              <Text style={u.muted}>
                🗓️ {p.startDate ? formatDate(p.startDate) : "—"} a {p.endDate ? formatDate(p.endDate) : "—"}
              </Text>
            ) : null}
            {p.overdue ? <Text style={{ color: "#C62828", marginTop: 4 }}>⚠️ Passou a data de término. Atualize o estado ou a data.</Text> : null}
            {!p.overdue && p.daysLeft !== null && p.daysLeft >= 0 && p.daysLeft <= 30 && ["EM_ANDAMENTO", "PLANEAMENTO"].includes(p.status) ? (
              <Text style={{ color: "#EF6C00", marginTop: 4 }}>⏳ Faltam {p.daysLeft} dia(s) para terminar</Text>
            ) : null}

            {p.budget !== null && p.budget !== undefined ? <Text style={[u.muted, { marginTop: 4 }]}>💰 Orçamento do programa: {money(p.budget)}</Text> : null}
            {p.projectsBudget ? <Text style={u.muted}>💼 Soma dos orçamentos dos projetos: {money(p.projectsBudget)}</Text> : null}

            <Text style={[u.muted, { marginTop: 8 }]}>
              📋 {p.projectsCount} projeto(s), {p.activeProjects} ativo(s)
            </Text>
            {hasTarget ? (
              <View style={{ marginTop: 6 }}>
                <Text style={u.muted}>
                  👥 Beneficiários: {formatNumber(p.beneficiaries)} de {formatNumber(p.targetBeneficiaries)} ({targetPercent}%)
                </Text>
                <ProgressBar percent={targetPercent ?? 0} />
              </View>
            ) : (
              <Text style={u.muted}>👥 {formatNumber(p.beneficiaries)} beneficiário(s). Defina uma meta ao editar o programa.</Text>
            )}
          </Card>

          {p.description ? (
            <>
              <SubTitle>Descrição</SubTitle>
              <Text style={{ lineHeight: 21 }}>{p.description}</Text>
            </>
          ) : null}
          {p.objectives ? (
            <>
              <SubTitle>Objetivos</SubTitle>
              <Text style={{ lineHeight: 21 }}>{p.objectives}</Text>
            </>
          ) : null}

          <SubTitle>Estado do programa</SubTitle>
          <ChipGroup options={catalog.projectStatus} value={p.status} onChange={changeStatus} />

          <Card>
            <View style={u.between}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={u.strong}>Programa público</Text>
                <Text style={u.muted}>{p.isPublic ? "Aparece aos cidadãos (sem o orçamento)." : "Só a sua instituição vê este programa."}</Text>
              </View>
              <Switch
                value={!!p.isPublic}
                disabled={busy}
                onValueChange={(v) => change({ isPublic: v }, "Não foi possível mudar a visibilidade.")}
                trackColor={{ true: colors.primary, false: "#BDBDBD" }}
              />
            </View>
          </Card>

          <SubTitle>Ações</SubTitle>
          <View style={u.row}>
            <Btn small label="✏️ Editar programa" onPress={() => navigation.navigate("GovProgramForm", { program: p })} />
            <Btn
              small
              kind="outline"
              label="📣 Publicar comunicado"
              onPress={() => navigation.navigate("NgoPublicationForm", { kind: "COMUNICADO", title: p.name })}
            />
            <Btn small kind="outline" label="📊 Dados" onPress={() => navigation.navigate("GovData")} />
          </View>
          <Btn small kind="danger" label="🗑️ Apagar programa" onPress={remove} />
        </View>
      ) : null}

      {tab === "projects" ? (
        <View>
          {bundle.projects.length === 0 ? (
            <Empty text="Este programa ainda não tem projetos. Junte projetos já criados ou crie um novo." />
          ) : (
            bundle.projects.map((pr: any) => (
              <Card key={pr.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{pr.name}</Text>
                  <Badge label={labelOf(catalog.projectStatus, pr.status)} color={colorOf(PROJECT_STATUS_COLOR, pr.status)} />
                </View>
                <Text style={u.muted}>
                  {labelOf(catalog.areas, pr.area)}
                  {pr.region ? ` · 📍 ${pr.region}` : ""}
                </Text>
                <Text style={u.muted}>
                  👥 {pr.beneficiaries} beneficiário(s){pr.targetBeneficiaries ? ` de ${pr.targetBeneficiaries}` : ""}
                  {pr.progress !== null && pr.progress !== undefined ? ` · execução ${pr.progress}%` : ""}
                </Text>
                {pr.progress !== null && pr.progress !== undefined ? <ProgressBar percent={pr.progress} color="#2E7D32" /> : null}
                <View style={u.row}>
                  <Btn small kind="outline" label="Abrir" onPress={() => navigation.navigate("NgoProject", { id: pr.id })} />
                  <Btn small kind="danger" label="Tirar do programa" onPress={() => unlink(pr)} />
                </View>
              </Card>
            ))
          )}

          <Card>
            <Text style={u.strong}>Juntar um projeto ao programa</Text>
            {bundle.availableProjects.length === 0 ? (
              <Text style={u.muted}>Não tem projetos livres. Um projeto só pode estar num programa.</Text>
            ) : (
              <>
                <View style={u.row}>
                  {bundle.availableProjects.map((pr: any) => (
                    <Chip key={pr.id} label={pr.name} active={pick === pr.id} onPress={() => setPick(pick === pr.id ? "" : pr.id)} />
                  ))}
                </View>
                <Btn label={busy ? "A juntar..." : "Juntar ao programa"} onPress={link} disabled={busy} />
              </>
            )}
            <Btn small kind="outline" label="➕ Criar projeto novo" onPress={() => navigation.navigate("NgoProjectForm", { area: p.area })} />
          </Card>
        </View>
      ) : null}

      {tab === "results" ? (
        <View>
          {bundle.results.length === 0 ? (
            <Empty text="Ainda não há resultados. Registe os resultados nos projetos do programa." />
          ) : (
            <Card>
              <Text style={u.strong}>Total alcançado pelos projetos</Text>
              {bundle.results.map((r: any) => (
                <View key={`${r.indicator}-${r.label}`} style={[u.between, { marginTop: 6 }]}>
                  <Text style={{ flex: 1, marginRight: 8 }}>{r.label}</Text>
                  <Text style={{ fontWeight: "bold", color: colors.primary }}>
                    {formatNumber(r.value)} {r.unit}
                  </Text>
                </View>
              ))}
            </Card>
          )}
          <Btn small kind="outline" label="📑 Gerar relatório de impacto" onPress={() => navigation.navigate("NgoReport")} />
        </View>
      ) : null}

      {tab === "updates" ? (
        <View>
          {bundle.updates.length === 0 ? (
            <Empty text="Ainda não há atualizações. Publique-as dentro de cada projeto." />
          ) : (
            bundle.updates.map((x: any) => (
              <Card key={x.id}>
                <Text style={u.strong}>{x.title}</Text>
                <Text style={u.muted}>
                  {x.projectName} · {formatDateTime(x.createdAt)}
                  {x.progress !== null && x.progress !== undefined ? ` · ${x.progress}%` : ""}
                </Text>
                <Btn small kind="outline" label="Abrir projeto" onPress={() => navigation.navigate("NgoProject", { id: x.projectId })} />
              </Card>
            ))
          )}
        </View>
      ) : null}
    </Page>
  );
}
