import React, { useState } from "react";
import { View, Text, Alert, Linking, ScrollView, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { listLearning, createLearning, deleteLearning } from "../api/community";
import { getApiErrorMessage } from "../api/errorMessage";
import { LEARNING_CATEGORIES } from "../constants/market";

const MANAGERS = ["ADMIN", "GOVERNO", "ONG"];
const AREAS = [
  { value: "GERAL", label: "Geral" },
  { value: "ARTESANATO", label: "Artesanato" },
  { value: "AGRICULTURA", label: "Agricultura" },
  { value: "PESCA", label: "Pesca" },
];

const ROLE_AREA: Record<string, string> = {
  ARTESAO: "ARTESANATO",
  AGRICULTOR: "AGRICULTURA",
  PESCADOR: "PESCA",
};

export default function LearningScreen() {
  const { user } = useAuth();
  const canCreate = MANAGERS.includes(user?.role ?? "");
  const area = ROLE_AREA[user?.role ?? ""];

  const [category, setCategory] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const loader = useLoader(() => listLearning({ area, category, q }), [] as any[], [category, q]);
  const items: any[] = loader.data;

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", category: "TECNICA", area: "GERAL", body: "", videoUrl: "" });
  const [saving, setSaving] = useState(false);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!form.title.trim()) {
      Alert.alert("Atenção", "Escreva o título.");
      return;
    }
    setSaving(true);
    try {
      await createLearning({
        title: form.title.trim(),
        category: form.category,
        area: form.area,
        body: form.body.trim() || undefined,
        videoUrl: form.videoUrl.trim() || undefined,
      });
      setCreating(false);
      setForm({ ...form, title: "", body: "", videoUrl: "" });
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível publicar."));
    } finally {
      setSaving(false);
    }
  }

  function remove(item: any) {
    Alert.alert("Apagar conteúdo", `Apagar "${item.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteLearning(item.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <Title>📚 Aprender</Title>

      <Field
        placeholder="Procurar"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <Chip label="Tudo" active={category === ""} onPress={() => setCategory("")} />
        {LEARNING_CATEGORIES.map((c) => (
          <Chip key={c.value} label={c.label} active={category === c.value} onPress={() => setCategory(c.value)} />
        ))}
      </ScrollView>

      {canCreate && (
        <>
          <Btn kind="outline" label={creating ? "Fechar formulário" : "➕ Publicar conteúdo"} onPress={() => setCreating(!creating)} />
          {creating && (
            <Card>
              <View style={u.row}>
                {LEARNING_CATEGORIES.map((c) => (
                  <Chip key={c.value} label={c.label} active={form.category === c.value} onPress={() => setField("category", c.value)} />
                ))}
              </View>
              <Field label="Título" value={form.title} onChangeText={(v) => setField("title", v)} />
              <Text style={u.label}>Para quem</Text>
              <View style={u.row}>
                {AREAS.map((a) => (
                  <Chip key={a.value} label={a.label} active={form.area === a.value} onPress={() => setField("area", a.value)} />
                ))}
              </View>
              <Field label="Texto" value={form.body} onChangeText={(v) => setField("body", v)} multiline />
              <Field label="Endereço do vídeo (opcional)" value={form.videoUrl} onChangeText={(v) => setField("videoUrl", v)} autoCapitalize="none" />
              <Btn label={saving ? "A guardar..." : "Publicar"} onPress={save} disabled={saving} />
            </Card>
          )}
        </>
      )}

      {items.length === 0 ? (
        <Empty text="Nenhum conteúdo encontrado." />
      ) : (
        items.map((item) => {
          const open = openId === item.id;
          const label = LEARNING_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category;
          return (
            <Card key={item.id}>
              <TouchableOpacity onPress={() => setOpenId(open ? null : item.id)}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{item.title}</Text>
                  <Badge label={label} color="#00838F" />
                </View>
                {!open && item.body ? (
                  <Text style={u.muted} numberOfLines={2}>
                    {item.body}
                  </Text>
                ) : null}
              </TouchableOpacity>

              {open && item.body ? <Text style={{ marginTop: 8, lineHeight: 21 }}>{item.body}</Text> : null}

              <View style={u.row}>
                {item.videoUrl ? <Btn small label="▶️ Ver vídeo" onPress={() => Linking.openURL(item.videoUrl)} /> : null}
                <Btn small kind="outline" label={open ? "Fechar" : "Ler mais"} onPress={() => setOpenId(open ? null : item.id)} />
                {(item.createdById === user?.id || user?.role === "ADMIN") && (
                  <Btn small kind="danger" label="Apagar" onPress={() => remove(item)} />
                )}
              </View>
            </Card>
          );
        })
      )}
    </Page>
  );
}
