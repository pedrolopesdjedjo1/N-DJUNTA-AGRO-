import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NgoLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import OpportunityCard from "../components/ngo/OpportunityCard";
import {
  listOpportunities,
  getMyOpportunities,
  getMyApplications,
  closeOpportunity,
  reopenOpportunity,
  deleteOpportunity,
} from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { APPLICATION_STATUS_COLOR, colorOf } from "../constants/ngo";
import { OPPORTUNITY_ICON, deadlineInfo } from "../constants/ngoContent";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

type Tab = "explore" | "mine" | "applied";

export default function NgoOpportunitiesScreen({ navigation, route }: any) {
  const catalog = useNgoCatalog();
  const [tab, setTab] = useState<Tab>("explore");
  const [kind, setKind] = useState<string>(route?.params?.kind ?? "");
  const [area, setArea] = useState("");
  const [when, setWhen] = useState<"open" | "closed">("open");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState("");

  // Vem de outra tela com um tipo escolhido (ex: Financiamentos disponíveis)
  useEffect(() => {
    const p = route?.params;
    if (p && p.kind !== undefined) {
      setKind(p.kind ?? "");
      setTab("explore");
    }
  }, [route?.params]);

  const loader = useLoader(
    async () => {
      if (tab === "mine") return getMyOpportunities();
      if (tab === "applied") return getMyApplications();
      return listOpportunities({ kind, area, q, when: when === "closed" ? "closed" : undefined });
    },
    [] as any[],
    [tab, kind, area, q, when]
  );
  const items: any[] = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function run(id: string, work: () => Promise<any>, fail: string) {
    setBusyId(id);
    try {
      await work();
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusyId("");
    }
  }

  function close(o: any) {
    Alert.alert("Fechar oportunidade", "As pessoas deixam de poder candidatar-se. Fechar?", [
      { text: "Não", style: "cancel" },
      { text: "Fechar", onPress: () => run(o.id, () => closeOpportunity(o.id), "Não foi possível fechar.") },
    ]);
  }

  function remove(o: any) {
    Alert.alert("Apagar oportunidade", `Apagar "${o.title}"?`, [
      { text: "Não", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => run(o.id, () => deleteOpportunity(o.id), "Não foi possível apagar.") },
    ]);
  }

  const pendingTotal = tab === "mine" ? items.reduce((s, o) => s + (o.pendingCount ?? 0), 0) : 0;
  const openTotal = tab === "mine" ? items.filter((o) => !o.closed).length : 0;
  const acceptedTotal = tab === "mine" ? items.reduce((s, o) => s + (o.acceptedCount ?? 0), 0) : 0;

  return (
    <NgoLayout active="NgoOpportunities">
      <Page loader={loader}>
        <Title>📢 Oportunidades</Title>
        <Text style={u.muted}>Bolsas, formação, empregos, concursos, projetos, financiamentos e programas de apoio.</Text>

        <Btn label="➕ Publicar oportunidade" onPress={() => navigation.navigate("NgoOpportunityForm")} />

        <View style={u.row}>
          <Chip label="Explorar" active={tab === "explore"} onPress={() => setTab("explore")} />
          <Chip label="As minhas" active={tab === "mine"} onPress={() => setTab("mine")} />
          <Chip label="Candidaturas enviadas" active={tab === "applied"} onPress={() => setTab("applied")} />
        </View>

        {tab === "explore" ? (
          <>
            <Field
              placeholder="Procurar oportunidade"
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => setQ(text.trim())}
              returnKeyType="search"
            />
            <ChipGroup
              label="Tipo"
              options={catalog.opportunityKinds.map((k) => ({ ...k, icon: OPPORTUNITY_ICON[k.value] }))}
              value={kind}
              onChange={setKind}
              allowEmpty
              scroll
            />
            <ChipGroup label="Área" options={catalog.areas} value={area} onChange={setArea} allowEmpty scroll />
            <View style={u.row}>
              <Chip label="Abertas" active={when === "open"} onPress={() => setWhen("open")} />
              <Chip label="Fechadas" active={when === "closed"} onPress={() => setWhen("closed")} />
            </View>
          </>
        ) : null}

        {tab === "mine" ? (
          <View style={u.grid}>
            {(
              [
                ["📢 Publicadas", items.length],
                ["🟢 Abertas", openTotal],
                ["📥 Por analisar", pendingTotal],
                ["✅ Aceites", acceptedTotal],
              ] as [string, number][]
            ).map(([label, value]) => (
              <View key={label} style={u.tile}>
                <View style={u.tileBox}>
                  <Text style={u.tileValue}>{value}</Text>
                  <Text style={u.tileLabel}>{label}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {tab === "applied" ? (
          <View style={u.row}>
            <Btn small kind="outline" label="📚 Inscrições em formações" onPress={() => navigation.navigate("NgoMyTrainings")} />
            <Btn small kind="outline" label="🔎 Formações disponíveis" onPress={() => navigation.navigate("NgoTrainingBrowse")} />
          </View>
        ) : null}

        {items.length === 0 ? (
          <Empty
            text={
              tab === "explore"
                ? when === "open"
                  ? "Não há oportunidades abertas com estes filtros."
                  : "Não há oportunidades fechadas."
                : tab === "mine"
                ? "Ainda não publicou oportunidades."
                : "Ainda não enviou candidaturas."
            }
          />
        ) : tab === "applied" ? (
          items.map((a) => {
            const deadline = deadlineInfo({ status: a.opportunity.closed ? "FECHADA" : "ABERTA", deadline: a.opportunity.deadline });
            return (
              <Card key={a.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                    {OPPORTUNITY_ICON[a.opportunity.kind] ?? "📢"} {a.opportunity.title}
                  </Text>
                  <Badge label={labelOf(catalog.applicationStatus, a.status)} color={colorOf(APPLICATION_STATUS_COLOR, a.status)} />
                </View>
                <Text style={u.muted}>
                  {a.organization?.name ?? "Organização"} {a.organization?.isVerified ? "✅" : ""}
                </Text>
                <Text style={u.muted}>
                  Enviada em {formatDate(a.createdAt)} · {deadline.label}
                </Text>
                {a.answer ? <Text style={{ marginTop: 6 }}>💬 {a.answer}</Text> : null}
                <Btn small kind="outline" label="Ver oportunidade" onPress={() => navigation.navigate("NgoOpportunity", { id: a.opportunity.id })} />
              </Card>
            );
          })
        ) : (
          items.map((o) => (
            <View key={o.id}>
              <OpportunityCard item={o} catalog={catalog} onPress={() => navigation.navigate("NgoOpportunity", { id: o.id })} />

              {tab === "mine" ? (
                <View style={u.row}>
                  <Btn small label={`📥 Candidaturas (${o.applicationsCount ?? 0})`} onPress={() => navigation.navigate("NgoApplicants", { id: o.id })} />
                  <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("NgoOpportunityForm", { opportunity: o })} />
                  {o.status === "ABERTA" ? (
                    <Btn small kind="outline" label="Fechar" onPress={() => close(o)} disabled={busyId === o.id} />
                  ) : (
                    <Btn
                      small
                      kind="outline"
                      label="Reabrir"
                      onPress={() => run(o.id, () => reopenOpportunity(o.id), "Não foi possível reabrir.")}
                      disabled={busyId === o.id}
                    />
                  )}
                  {(o.applicationsCount ?? 0) === 0 ? <Btn small kind="danger" label="Apagar" onPress={() => remove(o)} disabled={busyId === o.id} /> : null}
                </View>
              ) : null}
            </View>
          ))
        )}

        {tab === "explore" && kind === "FINANCIAMENTO" ? (
          <>
            <SubTitle>Os meus financiamentos</SubTitle>
            <Btn small kind="outline" label="💰 Ver os registos de financiamento" onPress={() => navigation.navigate("NgoFunding")} />
          </>
        ) : null}
      </Page>
    </NgoLayout>
  );
}
