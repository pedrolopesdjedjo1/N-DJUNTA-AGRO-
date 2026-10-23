import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { GovLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import PublicationCard from "../components/ngo/PublicationCard";
import { getMyPublications, updatePublication, deletePublication } from "../api/ngo";
import { listPublicationsFeed } from "../api/govPublications";
import { getGovRegions } from "../api/gov";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { useGovCatalog } from "../utils/govCatalog";
import { PUBLICATION_ICON } from "../constants/ngoContent";
import { getApiErrorMessage } from "../api/errorMessage";

type Tab = "official" | "all" | "mine";

const CREATE: [string, string][] = [
  ["COMUNICADO", "🏛️ Comunicado"],
  ["AVISO", "🚨 Aviso"],
  ["INFORMACAO", "ℹ️ Informação importante"],
  ["NOTICIA", "📰 Notícia"],
  ["CAMPANHA", "📣 Campanha pública"],
  ["EVENTO", "🎪 Evento"],
];

const MORE: [string, string, string, Record<string, any>?][] = [
  ["🚨", "Alertas oficiais", "GovAlerts"],
  ["📢", "Oportunidades e candidaturas", "NgoOpportunities"],
  ["🎪", "Eventos", "Events"],
  ["📚", "Guias, manuais e vídeos", "Learning"],
  ["🎓", "Cursos e certificados", "NgoTrainings"],
  ["🏛️", "Serviços públicos", "GovServices"],
  ["📝", "Pedidos e denúncias", "GovReports"],
  ["🏢", "Instituições públicas", "GovInstitutions"],
  ["💬", "Mensagens", "Conversations"],
  ["🔔", "Notificações", "Notifications"],
];

// Comunicação oficial: comunicados, avisos, notícias, campanhas, eventos e publicações por região
export default function GovCommunicationScreen({ navigation }: any) {
  const ngo = useNgoCatalog();
  const gov = useGovCatalog();

  const [tab, setTab] = useState<Tab>("official");
  const [kind, setKind] = useState("");
  const [region, setRegion] = useState("");
  const [drafts, setDrafts] = useState(false);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<string[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  const key = JSON.stringify({ tab, kind, region, drafts, q });

  async function load(reset: boolean) {
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      if (tab === "mine") {
        const list = await getMyPublications({ kind, draft: drafts });
        if (mine !== requestId.current) return;
        const filtered = region ? (list as any[]).filter((p) => (p.region ?? "").toLowerCase().includes(region.toLowerCase())) : list;
        setItems(filtered);
        setTotal(filtered.length);
        setPage(1);
      } else {
        const nextPage = reset ? 1 : page + 1;
        const result = await listPublicationsFeed({ kind, region, q, page: nextPage, official: tab === "official" });
        if (mine !== requestId.current) return;
        setItems((prev) => (reset ? result.items : [...prev, ...result.items]));
        setTotal(result.total);
        setPage(nextPage);
      }
    } catch (e) {
      if (mine === requestId.current) {
        setError(getApiErrorMessage(e, "Não foi possível carregar as publicações."));
      }
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

  async function togglePublished(p: any) {
    setBusyId(p.id);
    try {
      await updatePublication(p.id, { isPublished: !p.isPublished });
      await load(true);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar a publicação."));
    } finally {
      setBusyId("");
    }
  }

  function remove(p: any) {
    Alert.alert("Apagar publicação", `Apagar "${p.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePublication(p.id);
            load(true);
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  const kindOptions = (tab === "official" ? gov.govPublicationKinds : [...gov.govPublicationKinds, ...ngo.publicationKinds]).map((k) => ({
    ...k,
    icon: PUBLICATION_ICON[k.value],
  }));

  return (
    <GovLayout active="GovCommunication">
      <Page>
        <Title>📣 Comunicação oficial</Title>
        <Text style={u.muted}>Comunicados, avisos, notícias, campanhas públicas, eventos e informações importantes, por região.</Text>

        <SubTitle>Publicar</SubTitle>
        <View style={u.row}>
          {CREATE.map(([value, label]) => (
            <Btn key={value} small kind={value === "COMUNICADO" ? "primary" : "outline"} label={label} onPress={() => navigation.navigate("NgoPublicationForm", { kind: value })} />
          ))}
        </View>
        <View style={u.row}>
          <Btn small kind="outline" label="🚨 Criar alerta oficial" onPress={() => navigation.navigate("GovAlertForm")} />
          <Btn small kind="outline" label="➕ Publicar oportunidade" onPress={() => navigation.navigate("NgoOpportunityForm")} />
        </View>

        <SubTitle>Publicações</SubTitle>
        <View style={u.row}>
          <Chip label="Oficiais" active={tab === "official"} onPress={() => { setTab("official"); setKind(""); }} />
          <Chip label="Todas" active={tab === "all"} onPress={() => setTab("all")} />
          <Chip label="As minhas" active={tab === "mine"} onPress={() => setTab("mine")} />
        </View>

        {tab !== "mine" ? (
          <Field
            placeholder="Procurar publicações"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => setQ(text.trim())}
            returnKeyType="search"
          />
        ) : (
          <View style={u.row}>
            <Chip label="📝 Só rascunhos" active={drafts} onPress={() => setDrafts(!drafts)} />
          </View>
        )}

        <ChipGroup label="Tipo" options={kindOptions} value={kind} onChange={setKind} allowEmpty scroll />
        {regions.length > 0 ? (
          <ChipGroup label="Região" options={regions.map((r) => ({ value: r, label: r }))} value={region} onChange={setRegion} allowEmpty scroll />
        ) : null}

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${total} publicação(ões)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? (
          <Empty
            text={
              tab === "mine"
                ? drafts
                  ? "Não tem rascunhos."
                  : "Ainda não publicou nada. Comece por um comunicado."
                : "Não há publicações com estes filtros."
            }
          />
        ) : null}

        {items.map((p) => (
          <View key={p.id}>
            <PublicationCard item={p} catalog={ngo} onPress={() => navigation.navigate("NgoPublication", { id: p.id })} />
            {p.isMine ? (
              <View style={u.row}>
                <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("NgoPublicationForm", { publication: p })} />
                <Btn small kind="outline" label={p.isPublished ? "Passar a rascunho" : "📣 Publicar"} onPress={() => togglePublished(p)} disabled={busyId === p.id} />
                <Btn small kind="danger" label="Apagar" onPress={() => remove(p)} />
              </View>
            ) : null}
          </View>
        ))}

        {tab !== "mine" && items.length < total ? (
          <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} />
        ) : null}

        <SubTitle>Mais ferramentas</SubTitle>
        <View style={u.grid}>
          {MORE.map(([icon, label, route, routeParams]) => (
            <TouchableOpacity key={route} style={u.tile} onPress={() => navigation.navigate(route, routeParams)}>
              <View style={u.tileBox}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Page>
    </GovLayout>
  );
}
