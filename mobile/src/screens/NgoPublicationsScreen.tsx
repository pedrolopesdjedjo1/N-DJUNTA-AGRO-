import React, { useCallback, useRef, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import PublicationCard from "../components/ngo/PublicationCard";
import { listPublications, getMyPublications, updatePublication, deletePublication } from "../api/ngo";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { PUBLICATION_ICON } from "../constants/ngoContent";
import { getApiErrorMessage } from "../api/errorMessage";

export default function NgoPublicationsScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const [tab, setTab] = useState<"mine" | "feed">("mine");
  const [kind, setKind] = useState("");
  const [drafts, setDrafts] = useState(false);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const requestId = useRef(0);

  const key = JSON.stringify({ tab, kind, drafts, q });

  async function load(reset: boolean) {
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      if (tab === "mine") {
        const list = await getMyPublications({ kind, draft: drafts });
        if (mine !== requestId.current) return;
        setItems(list);
        setTotal(list.length);
        setPage(1);
      } else {
        const nextPage = reset ? 1 : page + 1;
        const result = await listPublications({ kind, q, page: nextPage });
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
      if (!p.isPublished) Alert.alert("Publicada", "As pessoas que seguem a organização foram avisadas.");
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

  return (
    <Page>
      <Title>📰 Publicações</Title>
      <Text style={u.muted}>Notícias, projetos, resultados, campanhas, eventos, fotografias, vídeos e histórias das comunidades.</Text>

      <Btn label="➕ Nova publicação" onPress={() => navigation.navigate("NgoPublicationForm")} />

      <View style={u.row}>
        <Chip label="As minhas" active={tab === "mine"} onPress={() => setTab("mine")} />
        <Chip label="Todas as publicações" active={tab === "feed"} onPress={() => setTab("feed")} />
      </View>

      {tab === "feed" ? (
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

      <ChipGroup
        label="Tipo"
        options={catalog.publicationKinds.map((k) => ({ ...k, icon: PUBLICATION_ICON[k.value] }))}
        value={kind}
        onChange={setKind}
        allowEmpty
        scroll
      />

      <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${total} publicação(ões)`}</Text>

      {error ? <Empty text={error} /> : null}
      {!busy && !error && items.length === 0 ? (
        <Empty
          text={
            tab === "mine"
              ? drafts
                ? "Não tem rascunhos."
                : "Ainda não publicou nada. Conte o que a sua organização faz."
              : "Ainda não há publicações."
          }
        />
      ) : null}

      {items.map((p) => (
        <View key={p.id}>
          <PublicationCard item={p} catalog={catalog} onPress={() => navigation.navigate("NgoPublication", { id: p.id })} />

          {p.isMine ? (
            <View style={u.row}>
              <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("NgoPublicationForm", { publication: p })} />
              <Btn
                small
                kind="outline"
                label={p.isPublished ? "Passar a rascunho" : "📣 Publicar"}
                onPress={() => togglePublished(p)}
                disabled={busyId === p.id}
              />
              <Btn small kind="danger" label="Apagar" onPress={() => remove(p)} />
            </View>
          ) : null}
        </View>
      ))}

      {tab === "feed" && items.length < total ? (
        <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} />
      ) : null}
    </Page>
  );
}
