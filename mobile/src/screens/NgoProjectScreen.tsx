import React, { useCallback, useState } from "react";
import { View, Text, Image, Alert, Switch, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import ProgressBar from "../components/ProgressBar";
import ProjectUpdatesTab from "../components/ngo/ProjectUpdatesTab";
import ProjectResultsTab from "../components/ngo/ProjectResultsTab";
import ProjectMediaTab from "../components/ngo/ProjectMediaTab";
import ProjectPartnersTab from "../components/ngo/ProjectPartnersTab";
import ProjectBeneficiariesTab from "../components/ngo/ProjectBeneficiariesTab";
import { getNgoProject, updateNgoProject, deleteNgoProject } from "../api/ngo";
import { useNgoCatalog, iconOf, labelOf } from "../utils/ngoCatalog";
import { PROJECT_STATUS_COLOR, colorOf } from "../constants/ngo";
import { money, formatDate } from "../constants/market";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

type TabKey = "overview" | "updates" | "results" | "media" | "partners" | "people";

export default function NgoProjectScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useNgoCatalog();
  const loader = useLoader(() => getNgoProject(id), null as any, [id]);
  const bundle: any = loader.data;
  const [tab, setTab] = useState<TabKey>("overview");
  const [busy, setBusy] = useState(false);

  // Atualiza quando volta da edição
  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!bundle) {
    return (
      <Page loader={loader}>
        <Title>Projeto</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const p = bundle.project;
  const onBundle = (b: any) => loader.setData(b);

  const hasTarget = !!p.targetBeneficiaries && p.targetBeneficiaries > 0;
  const targetPercent = hasTarget ? Math.min(100, Math.round(((p.beneficiaries ?? 0) / p.targetBeneficiaries) * 100)) : null;

  const tabs: [TabKey, string][] = [
    ["overview", "Resumo"],
    ["updates", `Atualizações (${bundle.updates.length})`],
    ["results", `Resultados (${bundle.results.length})`],
    ["media", `Fotos e vídeos (${bundle.media.length})`],
    ["partners", "Parceiros"],
    ["people", `Beneficiários (${p.beneficiaries ?? 0})`],
  ];

  async function applyChange(change: Record<string, any>, fail: string) {
    setBusy(true);
    try {
      onBundle(await updateNgoProject(id, change));
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
      Alert.alert("Mudar o estado", `Marcar o projeto como "${label}"?`, [
        { text: "Não", style: "cancel" },
        { text: "Sim", onPress: () => applyChange({ status: next }, "Não foi possível mudar o estado.") },
      ]);
    } else {
      applyChange({ status: next }, "Não foi possível mudar o estado.");
    }
  }

  function remove() {
    Alert.alert(
      "Apagar projeto",
      "As atualizações, os resultados, as fotos e os vídeos deste projeto são apagados. Os beneficiários, as formações e os financiamentos ficam guardados, mas sem ligação ao projeto. Apagar?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNgoProject(id);
              navigation.goBack();
            } catch (e) {
              Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar o projeto."));
            }
          },
        },
      ]
    );
  }

  return (
    <Page loader={loader}>
      {p.coverUrl ? <Image source={{ uri: p.coverUrl }} style={{ width: "100%", height: 170, borderRadius: 10 }} /> : null}

      <View style={[u.between, { marginTop: 8 }]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>{p.name}</Title>
        </View>
        <Badge label={labelOf(catalog.projectStatus, p.status)} color={colorOf(PROJECT_STATUS_COLOR, p.status)} />
      </View>

      <Text style={u.muted}>
        {iconOf(catalog.areas, p.area)} {labelOf(catalog.areas, p.area)}
        {p.focus ? ` · ${labelOf(catalog.focus[p.area] ?? [], p.focus)}` : ""}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
        {tabs.map(([key, label]) => (
          <Chip key={key} label={label} active={tab === key} onPress={() => setTab(key)} />
        ))}
      </ScrollView>

      {tab === "overview" ? (
        <View>
          <Card>
            {p.region ? <Text>📍 {p.region}</Text> : null}
            {p.communities?.length > 0 ? <Text style={u.muted}>🏘️ Comunidades: {p.communities.join(", ")}</Text> : null}
            {p.startDate || p.endDate ? (
              <Text style={u.muted}>
                🗓️ {p.startDate ? formatDate(p.startDate) : "—"} a {p.endDate ? formatDate(p.endDate) : "—"}
              </Text>
            ) : null}
            {p.overdue ? <Text style={{ color: "#C62828", marginTop: 4 }}>⚠️ Passou a data de término. Atualize o estado ou a data.</Text> : null}
            {!p.overdue && p.daysLeft !== null && p.daysLeft >= 0 && p.daysLeft <= 30 && ["EM_ANDAMENTO", "PLANEAMENTO"].includes(p.status) ? (
              <Text style={{ color: "#EF6C00", marginTop: 4 }}>⏳ Faltam {p.daysLeft} dia(s) para terminar</Text>
            ) : null}
            {p.budget !== null && p.budget !== undefined ? <Text style={[u.muted, { marginTop: 4 }]}>💰 Orçamento: {money(p.budget)}</Text> : null}

            {hasTarget ? (
              <View style={{ marginTop: 10 }}>
                <Text style={u.muted}>
                  👥 Beneficiários: {p.beneficiaries} de {p.targetBeneficiaries} ({targetPercent}%)
                </Text>
                <ProgressBar percent={targetPercent ?? 0} />
              </View>
            ) : (
              <Text style={[u.muted, { marginTop: 10 }]}>👥 {p.beneficiaries} beneficiário(s). Pode definir uma meta ao editar o projeto.</Text>
            )}

            {p.progress !== null && p.progress !== undefined ? (
              <View style={{ marginTop: 10 }}>
                <Text style={u.muted}>Progresso da execução: {p.progress}%</Text>
                <ProgressBar percent={p.progress} color="#2E7D32" />
              </View>
            ) : null}
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

          <SubTitle>Estado do projeto</SubTitle>
          <ChipGroup options={catalog.projectStatus} value={p.status} onChange={changeStatus} />

          <Card>
            <View style={u.between}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={u.strong}>Projeto público</Text>
                <Text style={u.muted}>
                  {p.isPublic ? "Aparece às outras pessoas no app (sem o orçamento)." : "Só a sua organização vê este projeto."}
                </Text>
              </View>
              <Switch
                value={!!p.isPublic}
                disabled={busy}
                onValueChange={(v) => applyChange({ isPublic: v }, "Não foi possível mudar a visibilidade.")}
                trackColor={{ true: colors.primary, false: "#BDBDBD" }}
              />
            </View>
          </Card>

          <SubTitle>Ações</SubTitle>
          <View style={u.row}>
            <Btn small label="✏️ Editar projeto" onPress={() => navigation.navigate("NgoProjectForm", { id })} />
            <Btn small kind="outline" label="📝 Publicar atualização" onPress={() => setTab("updates")} />
            <Btn small kind="outline" label="📰 Publicar novidade" onPress={() => navigation.navigate("NgoPublicationForm", { projectId: id })} />
          </View>
          <View style={u.row}>
            <Btn small kind="outline" label="💰 Financiamento" onPress={() => navigation.navigate("NgoFunding", { projectId: id })} />
            <Btn small kind="outline" label="📊 Resultados e relatório" onPress={() => navigation.navigate("NgoMonitoring", { projectId: id })} />
            <Btn small kind="outline" label="📚 Formações" onPress={() => navigation.navigate("NgoTrainings", { projectId: id })} />
          </View>
          <Btn small kind="danger" label="🗑️ Apagar projeto" onPress={remove} />
        </View>
      ) : null}

      {tab === "updates" ? <ProjectUpdatesTab projectId={id} updates={bundle.updates} onBundle={onBundle} /> : null}
      {tab === "results" ? <ProjectResultsTab projectId={id} results={bundle.results} onBundle={onBundle} /> : null}
      {tab === "media" ? <ProjectMediaTab projectId={id} media={bundle.media} onBundle={onBundle} /> : null}
      {tab === "partners" ? <ProjectPartnersTab projectId={id} navigation={navigation} /> : null}
      {tab === "people" ? <ProjectBeneficiariesTab projectId={id} target={p.targetBeneficiaries} navigation={navigation} /> : null}
    </Page>
  );
}
