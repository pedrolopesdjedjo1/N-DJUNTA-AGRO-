import React, { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AgentLayout } from "../components/AgentTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import OpportunityCard from "../components/ngo/OpportunityCard";
import GovProgramCard from "../components/gov/ProgramCard";
import ReferPanel from "../components/agent/ReferPanel";
import { listAgentOpportunities, listAgentReferrals, getAgentClient } from "../api/agent";
import { listTrainings } from "../api/ngo";
import { listPublicPrograms, getGovRegions } from "../api/gov";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { OPPORTUNITY_ICON } from "../constants/ngoContent";
import { TRAINING_STATE, trainingState, whenText } from "../constants/training";
import { daysUntil } from "../constants/agentTasks";
import { formatDate } from "../constants/market";

type Tab = "OPORTUNIDADE" | "FORMACAO" | "PROGRAMA" | "HISTORICO";

const EMPTY = { items: [] as any[], total: 0 };

// Oportunidades, formações e programas públicos que o agente pode indicar aos seus clientes
export default function AgentOpportunitiesScreen({ navigation, route }: any) {
  const catalog = useNgoCatalog();

  const [linkId, setLinkId] = useState<string>(route?.params?.linkId ?? "");
  const [clientName, setClientName] = useState("");
  const [tab, setTab] = useState<Tab>("OPORTUNIDADE");
  const [kind, setKind] = useState<string>(route?.params?.kind ?? "");
  const [area, setArea] = useState("");
  const [region, setRegion] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [target, setTarget] = useState<string>("");

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (route?.params?.linkId !== undefined) setLinkId(route.params.linkId ?? "");
  }, [route?.params?.linkId]);

  useEffect(() => {
    setClientName("");
    if (linkId) {
      getAgentClient(linkId)
        .then((r: any) => setClientName(r.client?.name ?? ""))
        .catch(() => {});
    }
  }, [linkId]);

  const loader = useLoader(
    async () => {
      if (tab === "OPORTUNIDADE") {
        const r = await listAgentOpportunities({ kind, area, region, q, linkId });
        return { items: r.items as any[], total: r.total as number };
      }
      if (tab === "FORMACAO") {
        const items: any[] = await listTrainings({ area, region, q, when: "upcoming" });
        return { items, total: items.length };
      }
      if (tab === "PROGRAMA") {
        const items: any[] = await listPublicPrograms({ area, region, q });
        return { items, total: items.length };
      }
      const items: any[] = await listAgentReferrals();
      return { items, total: items.length };
    },
    EMPTY,
    [tab, kind, area, region, q, linkId]
  );
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const firstName = clientName.split(" ")[0] || "o cliente";
  const filtersOn = tab !== "HISTORICO";

  function referButton(id: string, label?: string) {
    return (
      <Btn
        small
        label={target === id ? "Fechar" : label ?? (linkId ? `📢 Indicar a ${firstName}` : "📢 Indicar a clientes")}
        onPress={() => setTarget(target === id ? "" : id)}
      />
    );
  }

  function panel(type: "OPORTUNIDADE" | "FORMACAO" | "PROGRAMA", id: string, title: string) {
    if (target !== id) return null;
    return (
      <ReferPanel
        type={type}
        refId={id}
        title={title}
        presetLinkId={linkId || undefined}
        onCancel={() => setTarget("")}
        onDone={() => {
          setTarget("");
          loader.reload();
        }}
      />
    );
  }

  return (
    <AgentLayout active="AgentHome">
      <Page loader={loader}>
        <Title>📢 Oportunidades</Title>
        <Text style={u.muted}>
          Empregos, projetos, formação, bolsas, financiamento, concursos e programas de apoio. Indique aos clientes e produtores o que lhes serve.
        </Text>

        {linkId ? (
          <Card>
            <Text style={u.strong}>👤 A procurar para {clientName || "um cliente"}</Text>
            <Text style={u.muted}>As oportunidades que servem o perfil e a região dele(a) aparecem primeiro.</Text>
            <View style={u.row}>
              <Btn small kind="outline" label="Ver para todos" onPress={() => { setLinkId(""); navigation.setParams({ linkId: undefined }); }} />
              <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: linkId })} />
            </View>
          </Card>
        ) : null}

        <View style={u.row}>
          <Chip label="Oportunidades" active={tab === "OPORTUNIDADE"} onPress={() => { setTab("OPORTUNIDADE"); setTarget(""); }} />
          <Chip label="Formações" active={tab === "FORMACAO"} onPress={() => { setTab("FORMACAO"); setTarget(""); }} />
          <Chip label="Programas" active={tab === "PROGRAMA"} onPress={() => { setTab("PROGRAMA"); setTarget(""); }} />
          <Chip label="Já indicadas" active={tab === "HISTORICO"} onPress={() => { setTab("HISTORICO"); setTarget(""); }} />
        </View>

        {filtersOn ? (
          <>
            <Field
              placeholder="Procurar"
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => setQ(text.trim())}
              returnKeyType="search"
            />
            {tab === "OPORTUNIDADE" ? (
              <ChipGroup
                label="Tipo"
                options={catalog.opportunityKinds.map((k) => ({ ...k, icon: OPPORTUNITY_ICON[k.value] }))}
                value={kind}
                onChange={setKind}
                allowEmpty
                scroll
              />
            ) : null}
            <ChipGroup label="Área" options={catalog.areas} value={area} onChange={setArea} allowEmpty scroll />
            {regions.length > 0 ? (
              <ChipGroup label="Região" options={regions.map((r) => ({ value: r, label: r }))} value={region} onChange={setRegion} allowEmpty scroll />
            ) : null}
            <Text style={[u.muted, { marginTop: 8 }]}>{loader.loading && d.items.length === 0 ? "A carregar..." : `${d.total} resultado(s)`}</Text>
          </>
        ) : null}

        {d.items.length === 0 && !loader.loading ? (
          <Empty
            text={
              tab === "HISTORICO"
                ? "Ainda não indicou nada aos seus clientes."
                : tab === "FORMACAO"
                ? "Não há formações marcadas com estes filtros."
                : "Nada encontrado com estes filtros."
            }
          />
        ) : null}

        {tab === "OPORTUNIDADE"
          ? d.items.map((o: any) => (
              <View key={o.id}>
                <OpportunityCard
                  item={{ ...o, daysLeft: daysUntil(o.deadline) }}
                  catalog={catalog}
                  onPress={() => navigation.navigate("NgoOpportunity", { id: o.id })}
                />
                <View style={[u.row, { marginTop: 4 }]}>
                  {o.relevant ? <Badge label="✅ Serve ao perfil dele(a)" color="#2E7D32" /> : null}
                  {o.referred ? (
                    <View style={{ marginLeft: o.relevant ? 8 : 0 }}>
                      <Badge label="Já indicada" color="#757575" />
                    </View>
                  ) : null}
                </View>
                <View style={u.row}>
                  {referButton(o.id)}
                  <Btn small kind="outline" label="Detalhes" onPress={() => navigation.navigate("NgoOpportunity", { id: o.id })} />
                </View>
                {panel("OPORTUNIDADE", o.id, o.title)}
              </View>
            ))
          : null}

        {tab === "FORMACAO"
          ? d.items.map((t: any) => {
              const state = TRAINING_STATE[trainingState(t)];
              return (
                <View key={t.id}>
                  <Card>
                    <View style={u.between}>
                      <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>📚 {t.title}</Text>
                      <Badge label={state.label} color={state.color} />
                    </View>
                    <Text style={u.muted}>
                      {labelOf(catalog.trainingKinds, t.kind)}
                      {t.area ? ` · ${labelOf(catalog.areas, t.area)}` : ""}
                      {t.hours ? ` · ${t.hours} h` : ""}
                    </Text>
                    <Text style={u.muted}>
                      🏢 {t.organization?.name ?? "Organização"} {t.organization?.isVerified ? "✅" : ""}
                    </Text>
                    <Text style={u.muted}>🕒 {whenText(t)}</Text>
                    <Text style={u.muted}>{t.isOnline ? "💻 Online" : `📍 ${t.location ?? "—"}${t.region ? `, ${t.region}` : ""}`}</Text>
                    {t.spotsLeft !== null && t.spotsLeft !== undefined ? (
                      <Text style={u.muted}>{t.spotsLeft === 0 ? "Sem vagas" : `${t.spotsLeft} vaga(s)`}</Text>
                    ) : null}
                    <View style={u.row}>
                      {referButton(t.id)}
                      <Btn small kind="outline" label="Detalhes" onPress={() => navigation.navigate("NgoTrainingPublic", { id: t.id })} />
                    </View>
                  </Card>
                  {panel("FORMACAO", t.id, t.title)}
                </View>
              );
            })
          : null}

        {tab === "PROGRAMA"
          ? d.items.map((p: any) => (
              <View key={p.id}>
                <GovProgramCard program={p} catalog={catalog} showOrg onPress={() => navigation.navigate("GovPublicProgram", { id: p.id })} />
                <View style={u.row}>{referButton(p.id)}</View>
                {panel("PROGRAMA", p.id, p.name)}
              </View>
            ))
          : null}

        {tab === "HISTORICO"
          ? d.items.map((g: any) => (
              <Card key={g.refId}>
                <Text style={u.strong}>{g.title}</Text>
                <Text style={u.muted}>Última indicação em {formatDate(g.lastAt)}</Text>
                <Text style={[u.muted, { marginTop: 4 }]}>
                  👥 {g.clients.length} pessoa(s): {g.clients.slice(0, 6).join(", ")}
                  {g.clients.length > 6 ? ` e mais ${g.clients.length - 6}` : ""}
                </Text>
              </Card>
            ))
          : null}

        {tab !== "HISTORICO" ? (
          <>
            <SubTitle>Mais</SubTitle>
            <View style={u.row}>
              <Btn small kind="outline" label="🏛️ Programas públicos" onPress={() => navigation.navigate("GovPublicPrograms")} />
              <Btn small kind="outline" label="📚 Formações" onPress={() => navigation.navigate("NgoTrainingBrowse")} />
              <Btn small kind="outline" label="🏛️ Serviços públicos" onPress={() => navigation.navigate("GovServices")} />
            </View>
          </>
        ) : null}
      </Page>
    </AgentLayout>
  );
}
