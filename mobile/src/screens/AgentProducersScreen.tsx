import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Alert, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listAgentProducers, inviteProducer } from "../api/agent";
import { getGovRegions } from "../api/gov";
import { useAgentCatalog } from "../utils/agentCatalog";
import { LINK_STATUS_COLOR, ROLE_ICON, ROLE_NAME } from "../constants/agent";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY_BY_KIND: Record<string, number> = {};

// Produtores e comerciantes da plataforma. Por privacidade, nunca mostra telefones.
export default function AgentProducersScreen({ navigation, route }: any) {
  const catalog = useAgentCatalog();

  const [kind, setKind] = useState<string>(route?.params?.kind ?? "");
  const [region, setRegion] = useState<string>(route?.params?.region ?? "");
  const [scope, setScope] = useState<"" | "mine" | "free">("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [byKind, setByKind] = useState(EMPTY_BY_KIND);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    setRegion(p.region ?? "");
    setKind(p.kind ?? "");
  }, [route?.params]);

  const key = JSON.stringify({ kind, region, scope, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listAgentProducers({ kind, region, scope, q, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setByKind(r.byKind);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os produtores."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
  );

  function invite(p: any) {
    Alert.alert("Convidar para a sua carteira", `${p.name} recebe um convite no app. Só depois de aceitar pode ajudar na conta dele(a).`, [
      { text: "Não", style: "cancel" },
      {
        text: "Convidar",
        onPress: async () => {
          setBusyId(p.id);
          try {
            await inviteProducer(p.id);
            Alert.alert("Convite enviado", `${p.name} recebeu o convite.`);
            load(true);
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar o convite."));
          } finally {
            setBusyId("");
          }
        },
      },
    ]);
  }

  const kindOptions = catalog.producerKinds
    .filter((k) => k.value !== "COOPERATIVA")
    .map((k) => ({ value: k.value, label: `${ROLE_ICON[k.value] ?? ""} ${k.label} (${byKind[k.value] ?? 0})`.trim() }));

  return (
    <Page>
      <Title>🌱 Produtores e comerciantes</Title>
      <Text style={u.muted}>As pessoas da plataforma que produzem e vendem. Convide-as para a sua carteira para as poder ajudar.</Text>

      <Field
        placeholder="Procurar por nome ou localidade"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />

      <ChipGroup label="Tipo" options={kindOptions} value={kind} onChange={setKind} allowEmpty scroll />
      {regions.length > 0 ? (
        <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
      ) : null}

      <View style={u.row}>
        <Chip label="Todos" active={scope === ""} onPress={() => setScope("")} />
        <Chip label="⭐ Os meus clientes" active={scope === "mine"} onPress={() => setScope(scope === "mine" ? "" : "mine")} />
        <Chip label="Ainda sem agente meu" active={scope === "free"} onPress={() => setScope(scope === "free" ? "" : "free")} />
      </View>

      <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${total} pessoa(s)`}</Text>

      {error ? <Empty text={error} /> : null}
      {!busy && !error && items.length === 0 ? <Empty text="Ninguém encontrado com estes filtros." /> : null}

      {items.map((p) => {
        const status = p.link?.status;
        const canInvite = !status || status === "REVOGADO" || status === "RECUSADO";
        return (
          <Card key={p.id}>
            <View style={[u.row, { alignItems: "center" }]}>
              {p.photoUrl ? (
                <Image source={{ uri: p.photoUrl }} style={[u.photo, { width: 44, height: 44, borderRadius: 22 }]} />
              ) : (
                <View style={[u.photo, { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ fontSize: 20 }}>{ROLE_ICON[p.role] ?? "👤"}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={u.strong}>
                  {p.name} {p.isVerified ? "✅" : ""}
                </Text>
                <Text style={u.muted}>{ROLE_NAME[p.role] ?? p.role}</Text>
              </View>
              {status === "ATIVO" ? <Badge label="Seu cliente" color={LINK_STATUS_COLOR.ATIVO} /> : null}
              {status === "PENDENTE_ACEITACAO" ? <Badge label="Convite enviado" color={LINK_STATUS_COLOR.PENDENTE_ACEITACAO} /> : null}
            </View>

            {p.location ? <Text style={[u.muted, { marginTop: 4 }]}>📍 {p.location}</Text> : null}
            <Text style={u.muted}>
              📦 {p.productsCount} produto(s) à venda · no app desde {formatDate(p.createdAt)}
            </Text>

            <View style={u.row}>
              <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: p.id, userName: p.name })} />
              {status === "ATIVO" ? <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: p.link.id })} /> : null}
              {canInvite ? (
                <Btn small label={busyId === p.id ? "A enviar..." : "✉️ Convidar"} onPress={() => invite(p)} disabled={busyId === p.id} />
              ) : null}
            </View>
          </Card>
        );
      })}

      {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}

      <View style={u.row}>
        <Btn small kind="outline" label="🤝 Cooperativas" onPress={() => navigation.navigate("AgentCooperatives", { region: region || undefined })} />
        <Btn small kind="outline" label="🌱 Comunidades" onPress={() => navigation.navigate("AgentCommunities")} />
      </View>
    </Page>
  );
}
