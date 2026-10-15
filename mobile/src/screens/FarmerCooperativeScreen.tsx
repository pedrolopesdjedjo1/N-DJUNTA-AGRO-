import React, { useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import BuyModal from "../components/BuyModal";
import { getFarmerCooperative } from "../api/farmer";
import { createPost, deletePost } from "../api/community";
import { getApiErrorMessage } from "../api/errorMessage";
import { POST_KINDS, money, formatDate } from "../constants/market";

export default function FarmerCooperativeScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const id: string = route?.params?.id;
  const loader = useLoader(() => getFarmerCooperative(id), null as any, [id]);
  const d: any = loader.data;

  const [buying, setBuying] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState("VENDA_COLETIVA");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const kinds = POST_KINDS.filter((k) => k.value !== "CONHECIMENTO");

  async function publish() {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Atenção", "Preencha o título e o texto.");
      return;
    }
    setSaving(true);
    try {
      await createPost({ kind, cooperativeId: id, title: title.trim(), content: content.trim() });
      setCreating(false);
      setTitle("");
      setContent("");
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

  function postCard(p: any) {
    const label = POST_KINDS.find((k) => k.value === p.kind)?.label ?? p.kind;
    return (
      <Card key={p.id}>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.title}</Text>
          <Badge label={label} color="#6A1B9A" />
        </View>
        <Text style={u.muted}>
          {p.authorName} · {formatDate(p.createdAt)}
        </Text>
        <Text style={{ marginTop: 6, lineHeight: 21 }}>{p.content}</Text>
        <View style={u.row}>
          {p.authorId !== user?.id ? (
            <Btn small kind="outline" label="💬 Responder" onPress={() => navigation.navigate("Chat", { userId: p.authorId, userName: p.authorName })} />
          ) : (
            <Btn small kind="danger" label="Apagar" onPress={() => remove(p)} />
          )}
        </View>
      </Card>
    );
  }

  return (
    <>
      <Page loader={loader}>
        {d ? (
          <>
            <Title>🤝 {d.cooperative.name}</Title>
            {d.cooperative.region ? <Text style={u.muted}>📍 {d.cooperative.region}</Text> : null}
            <Text style={u.muted}>👥 {d.members} membro(s)</Text>
            {d.cooperative.description ? <Text style={{ marginTop: 6 }}>{d.cooperative.description}</Text> : null}

            <SubTitle>Contactar cooperativa</SubTitle>
            {d.leader ? (
              <Card>
                <Text style={u.strong}>Líder: {d.leader.name}</Text>
                {d.leader.phone ? <Text style={u.muted}>📞 {d.leader.phone}</Text> : null}
                <View style={u.row}>
                  {d.leader.phone ? (
                    <Btn small label="Ligar" onPress={() => Linking.openURL(`tel:${d.leader.phone}`)} />
                  ) : null}
                  <Btn
                    small
                    kind="outline"
                    label="💬 Mensagem"
                    onPress={() => navigation.navigate("Chat", { userId: d.leader.id, userName: d.leader.name })}
                  />
                </View>
              </Card>
            ) : null}

            {!d.joined ? (
              <Card>
                <Text style={u.muted}>Entre na cooperativa para ver as notícias e participar nas compras e vendas coletivas.</Text>
                <Btn small label="Entrar em cooperativa" onPress={() => navigation.navigate("Cooperatives")} />
              </Card>
            ) : null}

            <SubTitle>🌾 Produtos da cooperativa</SubTitle>
            {d.products.length === 0 ? (
              <Empty text="Nenhum produto disponível." />
            ) : (
              d.products.map((p: any) => (
                <Card key={p.id}>
                  <Text style={u.strong}>{p.title}</Text>
                  <Text style={u.muted}>
                    {money(p.price)} / {p.unit} · {p.quantity} disponível(eis)
                  </Text>
                  <Text style={u.muted}>
                    {p.owner?.name ?? "Membro"}
                    {p.location ? ` · 📍 ${p.location}` : ""}
                  </Text>
                  {p.ownerId !== user?.id && (
                    <View style={u.row}>
                      {p.quantity > 0 && <Btn small label="🛒 Comprar" onPress={() => setBuying(p)} />}
                      <Btn
                        small
                        kind="outline"
                        label="💬 Mensagem"
                        onPress={() => navigation.navigate("Chat", { userId: p.ownerId, userName: p.owner?.name ?? "Membro" })}
                      />
                    </View>
                  )}
                </Card>
              ))
            )}

            {d.joined ? (
              <>
                <SubTitle>🛒 Compras e vendas coletivas</SubTitle>
                <Btn kind="outline" label={creating ? "Fechar formulário" : "➕ Nova publicação"} onPress={() => setCreating(!creating)} />

                {creating && (
                  <Card>
                    <View style={u.row}>
                      {kinds.map((k) => (
                        <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
                      ))}
                    </View>
                    <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: Venda coletiva de arroz" />
                    <Field label="Texto" value={content} onChangeText={setContent} multiline placeholder="Quantidades, preço, prazo..." />
                    <Btn label={saving ? "A publicar..." : "Publicar"} onPress={publish} disabled={saving} />
                  </Card>
                )}

                {d.collective.length === 0 ? <Empty text="Nenhuma compra ou venda coletiva por agora." /> : d.collective.map(postCard)}

                <SubTitle>📰 Notícias da cooperativa</SubTitle>
                {d.news.length === 0 ? <Empty text="Nenhuma notícia por agora." /> : d.news.map(postCard)}
              </>
            ) : null}
          </>
        ) : null}
      </Page>

      <BuyModal
        product={buying}
        onClose={() => setBuying(null)}
        onDone={() => {
          setBuying(null);
          loader.reload();
        }}
      />
    </>
  );
}
