import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AgentLayout } from "../components/AgentTabs";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listAgentNeeds, setAgentNeedServed, forwardAgentNeed, deleteAgentNeed, getAgentClient } from "../api/agent";
import { getGovRegions, listInstitutions } from "../api/gov";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { NEED_ICON, NEED_PRIORITY_COLOR, NEED_STATUS_COLOR } from "../constants/agentTasks";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY = {
  counts: { IDENTIFICADA: 0, ENCAMINHADA: 0, ATENDIDA: 0, total: 0 } as Record<string, number>,
  items: [] as any[],
};

// Necessidades de pessoas e comunidades: identificar, encaminhar a uma instituição e acompanhar
export default function AgentNeedsScreen({ navigation, route }: any) {
  const catalog = useAgentCatalog();

  const [linkId, setLinkId] = useState<string>(route?.params?.linkId ?? "");
  const [clientName, setClientName] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState<string>(route?.params?.region ?? "");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);

  const [forwardId, setForwardId] = useState("");
  const [institution, setInstitution] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
    listInstitutions({})
      .then((list: any[]) => setInstitutions(list))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    if (p.linkId !== undefined) setLinkId(p.linkId ?? "");
    if (p.region !== undefined) setRegion(p.region ?? "");
  }, [route?.params]);

  useEffect(() => {
    setClientName("");
    if (linkId) {
      getAgentClient(linkId)
        .then((r: any) => setClientName(r.client?.name ?? ""))
        .catch(() => {});
    }
  }, [linkId]);

  const loader = useLoader(() => listAgentNeeds({ status, category, region, linkId, q }), EMPTY, [status, category, region, linkId, q]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function openForward(id: string) {
    setForwardId(forwardId === id ? "" : id);
    setInstitution("");
  }

  async function forward(need: any) {
    setBusy(true);
    try {
      const r = await forwardAgentNeed(need.id, { institutionId: institution || undefined });
      setForwardId("");
      loader.reload();
      Alert.alert(
        "Necessidade encaminhada",
        `Ficou registada com o protocolo ${r.protocol}. Pode acompanhar o estado a qualquer momento.`,
        [
          { text: "Acompanhar agora", onPress: () => navigation.navigate("GovTrack", { protocol: r.protocol }) },
          { text: "OK" },
        ]
      );
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível encaminhar a necessidade."));
    } finally {
      setBusy(false);
    }
  }

  async function setServed(need: any, served: boolean) {
    setBusy(true);
    try {
      await setAgentNeedServed(need.id, served);
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar o estado."));
    } finally {
      setBusy(false);
    }
  }

  function remove(need: any) {
    Alert.alert("Apagar necessidade", "Apagar esta necessidade?", [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAgentNeed(need.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  const c = d.counts;

  return (
    <AgentLayout active="AgentHome">
      <Page loader={loader}>
        <Title>📍 Necessidades</Title>
        <Text style={u.muted}>O que falta às pessoas e às comunidades que acompanha. Encaminhe a uma instituição pública para pedir apoio.</Text>

        <Btn label="➕ Registar necessidade" onPress={() => navigation.navigate("AgentNeedForm", { linkId: linkId || undefined, clientName: clientName || undefined, regionKey: region || undefined })} />

        {linkId ? (
          <Card>
            <Text style={u.strong}>👤 Necessidades de {clientName || "um cliente"}</Text>
            <View style={u.row}>
              <Btn small kind="outline" label="Ver todas" onPress={() => { setLinkId(""); navigation.setParams({ linkId: undefined }); }} />
              <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: linkId })} />
            </View>
          </Card>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["🆕 Identificadas", c.IDENTIFICADA ?? 0],
              ["➡️ Encaminhadas", c.ENCAMINHADA ?? 0],
              ["✅ Atendidas", c.ATENDIDA ?? 0],
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

        <Field
          placeholder="Procurar necessidade ou localidade"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <ChipGroup
          label="Estado"
          options={catalog.needStatus.map((s) => ({ value: s.value, label: `${s.label} (${c[s.value] ?? 0})` }))}
          value={status}
          onChange={setStatus}
          allowEmpty
          emptyLabel={`Todas (${c.total ?? 0})`}
          scroll
        />
        <ChipGroup
          label="Tipo"
          options={catalog.needCategories.map((k) => ({ ...k, icon: NEED_ICON[k.value] }))}
          value={category}
          onChange={setCategory}
          allowEmpty
          scroll
        />
        {regions.length > 0 ? (
          <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
        ) : null}

        {d.items.length === 0 && !loader.loading ? (
          <Empty text={c.total === 0 ? "Ainda não registou necessidades." : "Nenhuma necessidade com estes filtros."} />
        ) : (
          d.items.map((n: any) => {
            const open = n.status === "IDENTIFICADA";
            return (
              <Card key={n.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                    {NEED_ICON[n.category] ?? "📍"} {labelOf(catalog.needCategories, n.category)}
                  </Text>
                  <Badge label={labelOf(catalog.needPriority, n.priority) || n.priority} color={NEED_PRIORITY_COLOR[n.priority] ?? "#757575"} />
                </View>

                <View style={[u.row, { marginTop: 4 }]}>
                  <Badge label={labelOf(catalog.needStatus, n.status) || n.status} color={NEED_STATUS_COLOR[n.status] ?? "#757575"} />
                </View>

                <Text style={{ marginTop: 6, lineHeight: 20 }}>{n.description}</Text>
                {n.locality || n.regionName ? <Text style={[u.muted, { marginTop: 4 }]}>📍 {[n.locality, n.regionName].filter(Boolean).join(", ")}</Text> : null}
                {n.clientName ? <Text style={u.muted}>👤 {n.clientName}</Text> : null}
                {n.peopleAffected ? <Text style={u.muted}>👥 {n.peopleAffected} pessoa(s) afetada(s)</Text> : null}
                <Text style={u.muted}>Registada em {formatDate(n.createdAt)}</Text>
                {n.protocol ? (
                  <Text style={[u.muted, { marginTop: 2 }]}>
                    📨 Protocolo {n.protocol}
                    {n.forwardedAt ? ` · encaminhada em ${formatDate(n.forwardedAt)}` : ""}
                  </Text>
                ) : null}

                <View style={u.row}>
                  {open ? <Btn small label={forwardId === n.id ? "Fechar" : "➡️ Encaminhar"} onPress={() => openForward(n.id)} /> : null}
                  {n.protocol ? <Btn small kind="outline" label="🔎 Acompanhar pedido" onPress={() => navigation.navigate("GovTrack", { protocol: n.protocol })} /> : null}
                  {n.status !== "ATENDIDA" ? (
                    <Btn small kind="outline" label="✅ Atendida" onPress={() => setServed(n, true)} disabled={busy} />
                  ) : (
                    <Btn small kind="outline" label="Reabrir" onPress={() => setServed(n, false)} disabled={busy} />
                  )}
                </View>
                <View style={u.row}>
                  {n.status !== "ATENDIDA" ? <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("AgentNeedForm", { need: n })} /> : null}
                  {n.linkId ? <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: n.linkId })} /> : null}
                  <Btn small kind="danger" label="Apagar" onPress={() => remove(n)} />
                </View>

                {forwardId === n.id ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={u.strong}>Encaminhar a que instituição?</Text>
                    <View style={u.row}>
                      <Chip label="Qualquer instituição" active={institution === ""} onPress={() => setInstitution("")} />
                      {institutions.map((i) => (
                        <Chip
                          key={i.ownerId}
                          label={i.acronym || i.name}
                          active={institution === i.ownerId}
                          onPress={() => setInstitution(institution === i.ownerId ? "" : i.ownerId)}
                        />
                      ))}
                    </View>
                    <Text style={u.muted}>
                      {institution === ""
                        ? "Fica aberto a todas as instituições. A primeira que o assumir responde."
                        : "Só a instituição escolhida recebe o pedido."}
                    </Text>
                    <Btn label={busy ? "A encaminhar..." : "Encaminhar agora"} onPress={() => forward(n)} disabled={busy} />
                  </View>
                ) : null}
              </Card>
            );
          })
        )}

        <View style={u.row}>
          <Btn small kind="outline" label="🌱 Comunidades" onPress={() => navigation.navigate("AgentCommunities")} />
          <Btn small kind="outline" label="📝 Os meus pedidos" onPress={() => navigation.navigate("GovMyReports")} />
        </View>
      </Page>
    </AgentLayout>
  );
}
