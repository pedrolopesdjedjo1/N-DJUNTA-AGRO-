import React, { useState } from "react";
import { View, Text, Alert, ScrollView } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getMyCooperatives, listPosts, createPost, deletePost } from "../api/community";
import { getApiErrorMessage } from "../api/errorMessage";
import { POST_KINDS, formatDate } from "../constants/market";

export default function ArtisanCommunityScreen({ navigation }: any) {
  const [kind, setKind] = useState("");
  const [coopId, setCoopId] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(
    async () => {
      const [cooperatives, posts] = await Promise.all([
        getMyCooperatives(),
        listPosts({ kind, cooperativeId: coopId, q }),
      ]);
      return { cooperatives, posts };
    },
    { cooperatives: [] as any[], posts: [] as any[] },
    [kind, coopId, q]
  );

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ kind: "CONHECIMENTO", cooperativeId: "", title: "", content: "" });
  const [saving, setSaving] = useState(false);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert("Atenção", "Preencha o título e o texto.");
      return;
    }
    if (form.kind !== "CONHECIMENTO" && !form.cooperativeId) {
      Alert.alert("Atenção", "Escolha a cooperativa para este tipo de publicação.");
      return;
    }

    setSaving(true);
    try {
      await createPost({
        kind: form.kind,
        cooperativeId: form.cooperativeId || undefined,
        title: form.title.trim(),
        content: form.content.trim(),
      });
      setCreating(false);
      setForm({ ...form, title: "", content: "" });
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível publicar."));
    } finally {
      setSaving(false);
    }
  }

  function remove(post: any) {
    Alert.alert("Apagar publicação", `Apagar "${post.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(post.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  const cooperatives: any[] = loader.data.cooperatives;
  const posts: any[] = loader.data.posts;

  return (
    <Page loader={loader}>
      <Title>🤝 Cooperativas e comunidades</Title>

      <View style={u.row}>
        <Btn small label="🔎 Procurar e entrar em cooperativa" onPress={() => navigation.navigate("Cooperatives")} />
        <Btn small kind="outline" label="🎪 Eventos da comunidade" onPress={() => navigation.navigate("Events")} />
      </View>

      <SubTitle>As minhas cooperativas</SubTitle>
      {cooperatives.length === 0 ? (
        <Empty text="Ainda não participa de nenhuma cooperativa." />
      ) : (
        cooperatives.map((c) => (
          <Card key={c.id}>
            <Text style={u.strong}>{c.name}</Text>
            {c.region ? <Text style={u.muted}>📍 {c.region}</Text> : null}
          </Card>
        ))
      )}

      <SubTitle>Publicações</SubTitle>
      <Field
        placeholder="Procurar publicações"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <Chip label="Tudo" active={kind === ""} onPress={() => setKind("")} />
        {POST_KINDS.map((k) => (
          <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
        ))}
      </ScrollView>

      {cooperatives.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="Todas as cooperativas" active={coopId === ""} onPress={() => setCoopId("")} />
          {cooperatives.map((c) => (
            <Chip key={c.id} label={c.name} active={coopId === c.id} onPress={() => setCoopId(c.id)} />
          ))}
        </ScrollView>
      )}

      <Btn kind="outline" label={creating ? "Fechar formulário" : "➕ Nova publicação"} onPress={() => setCreating(!creating)} />

      {creating && (
        <Card>
          <View style={u.row}>
            {POST_KINDS.map((k) => (
              <Chip key={k.value} label={k.label} active={form.kind === k.value} onPress={() => setField("kind", k.value)} />
            ))}
          </View>

          {cooperatives.length > 0 && (
            <>
              <Text style={u.label}>Cooperativa {form.kind === "CONHECIMENTO" ? "(opcional)" : ""}</Text>
              <View style={u.row}>
                {form.kind === "CONHECIMENTO" && (
                  <Chip label="Para todos" active={form.cooperativeId === ""} onPress={() => setField("cooperativeId", "")} />
                )}
                {cooperatives.map((c) => (
                  <Chip key={c.id} label={c.name} active={form.cooperativeId === c.id} onPress={() => setField("cooperativeId", c.id)} />
                ))}
              </View>
            </>
          )}

          <Field label="Título" value={form.title} onChangeText={(v) => setField("title", v)} />
          <Field label="Texto" value={form.content} onChangeText={(v) => setField("content", v)} multiline />
          <Btn label={saving ? "A publicar..." : "Publicar"} onPress={save} disabled={saving} />
        </Card>
      )}

      {posts.length === 0 ? (
        <Empty text="Nenhuma publicação ainda." />
      ) : (
        posts.map((p) => {
          const label = POST_KINDS.find((k) => k.value === p.kind)?.label ?? p.kind;
          return (
            <Card key={p.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.title}</Text>
                <Badge label={label} color="#6A1B9A" />
              </View>
              <Text style={u.muted}>
                {p.authorName} · {formatDate(p.createdAt)}
                {p.cooperative ? ` · ${p.cooperative.name}` : ""}
              </Text>
              <Text style={{ marginTop: 6, lineHeight: 21 }}>{p.content}</Text>
              <View style={u.row}>
                {!p.isMine && (
                  <Btn small kind="outline" label="💬 Responder" onPress={() => navigation.navigate("Chat", { userId: p.authorId, userName: p.authorName })} />
                )}
                {p.isMine && <Btn small kind="danger" label="Apagar" onPress={() => remove(p)} />}
              </View>
            </Card>
          );
        })
      )}
    </Page>
  );
}
