import React, { useState } from "react";
import { View, Text, Alert, Linking, ScrollView } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { listEvents, getMyEvents, toggleEventRegistration, createEvent, deleteEvent } from "../api/community";
import { getApiErrorMessage } from "../api/errorMessage";
import { EVENT_KINDS, formatDateTime } from "../constants/market";

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

export default function EventsScreen() {
  const { user } = useAuth();
  const canCreate = MANAGERS.includes(user?.role ?? "");
  const area = ROLE_AREA[user?.role ?? ""];

  const [tab, setTab] = useState<"all" | "mine">("all");
  const [kind, setKind] = useState("");
  const [when, setWhen] = useState("upcoming");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(
    async () => (tab === "mine" ? getMyEvents() : listEvents({ kind, area, when, q })),
    [] as any[],
    [tab, kind, when, q]
  );
  const events: any[] = loader.data;

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    kind: "FEIRA",
    title: "",
    location: "",
    date: "",
    time: "",
    description: "",
    organizerName: "",
    organizerContact: "",
    area: "GERAL",
  });
  const [saving, setSaving] = useState(false);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function toggle(e: any) {
    try {
      const result = await toggleEventRegistration(e.id);
      Alert.alert(result.registered ? "Inscrição feita" : "Inscrição cancelada", e.title);
      loader.reload();
    } catch (err) {
      Alert.alert("Erro", getApiErrorMessage(err, "Não foi possível atualizar a inscrição."));
    }
  }

  function remove(e: any) {
    Alert.alert("Apagar evento", `Apagar "${e.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent(e.id);
            loader.reload();
          } catch (err) {
            Alert.alert("Erro", getApiErrorMessage(err, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  async function save() {
    if (!form.title.trim() || !form.location.trim() || !form.date.trim()) {
      Alert.alert("Atenção", "Preencha título, local e data.");
      return;
    }
    const startsAt = new Date(`${form.date.trim()}T${form.time.trim() || "08:00"}:00`);
    if (isNaN(startsAt.getTime())) {
      Alert.alert("Atenção", "Use a data AAAA-MM-DD e a hora HH:MM.");
      return;
    }

    setSaving(true);
    try {
      await createEvent({
        kind: form.kind,
        title: form.title.trim(),
        location: form.location.trim(),
        description: form.description.trim() || undefined,
        startsAt: startsAt.toISOString(),
        organizerName: form.organizerName.trim() || undefined,
        organizerContact: form.organizerContact.trim() || undefined,
        area: form.area,
      });
      setCreating(false);
      setForm({ ...form, title: "", location: "", date: "", time: "", description: "" });
      loader.reload();
    } catch (err) {
      Alert.alert("Erro", getApiErrorMessage(err, "Não foi possível criar o evento."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>🎪 Feiras e eventos</Title>

      <View style={u.row}>
        <Chip label="Todos os eventos" active={tab === "all"} onPress={() => setTab("all")} />
        <Chip label="As minhas inscrições" active={tab === "mine"} onPress={() => setTab("mine")} />
      </View>

      {tab === "all" && (
        <>
          <Field
            placeholder="Procurar por nome ou local"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => setQ(text.trim())}
            returnKeyType="search"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <Chip label="Todos" active={kind === ""} onPress={() => setKind("")} />
            {EVENT_KINDS.map((k) => (
              <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
            ))}
          </ScrollView>
          <View style={u.row}>
            <Chip label="Próximos" active={when === "upcoming"} onPress={() => setWhen("upcoming")} />
            <Chip label="Já realizados" active={when === "past"} onPress={() => setWhen("past")} />
          </View>
        </>
      )}

      {canCreate && (
        <>
          <Btn kind="outline" label={creating ? "Fechar formulário" : "➕ Criar evento"} onPress={() => setCreating(!creating)} />
          {creating && (
            <Card>
              <View style={u.row}>
                {EVENT_KINDS.map((k) => (
                  <Chip key={k.value} label={k.label} active={form.kind === k.value} onPress={() => setField("kind", k.value)} />
                ))}
              </View>
              <Field label="Título" value={form.title} onChangeText={(v) => setField("title", v)} />
              <Field label="Local" value={form.location} onChangeText={(v) => setField("location", v)} />
              <Field label="Data (AAAA-MM-DD)" value={form.date} onChangeText={(v) => setField("date", v)} placeholder="2026-11-15" />
              <Field label="Hora (HH:MM)" value={form.time} onChangeText={(v) => setField("time", v)} placeholder="09:00" />
              <Field label="Descrição" value={form.description} onChangeText={(v) => setField("description", v)} multiline />
              <Field label="Organizador" value={form.organizerName} onChangeText={(v) => setField("organizerName", v)} />
              <Field label="Contacto do organizador" value={form.organizerContact} onChangeText={(v) => setField("organizerContact", v)} keyboardType="phone-pad" />
              <Text style={u.label}>Para quem</Text>
              <View style={u.row}>
                {AREAS.map((a) => (
                  <Chip key={a.value} label={a.label} active={form.area === a.value} onPress={() => setField("area", a.value)} />
                ))}
              </View>
              <Btn label={saving ? "A guardar..." : "Publicar evento"} onPress={save} disabled={saving} />
            </Card>
          )}
        </>
      )}

      <SubTitle>{tab === "mine" ? "Inscrições" : "Eventos"}</SubTitle>
      {events.length === 0 ? (
        <Empty text="Nenhum evento encontrado." />
      ) : (
        events.map((e) => {
          const kindLabel = EVENT_KINDS.find((k) => k.value === e.kind)?.label ?? e.kind;
          const finished = new Date(e.endsAt ?? e.startsAt).getTime() < Date.now();
          return (
            <Card key={e.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{e.title}</Text>
                <Badge label={kindLabel} color="#6A1B9A" />
              </View>
              <Text style={u.muted}>🕒 {formatDateTime(e.startsAt)}</Text>
              <Text style={u.muted}>📍 {e.location}</Text>
              {e.description ? <Text style={{ marginTop: 4 }}>{e.description}</Text> : null}
              {e.organizerName ? <Text style={u.muted}>Organização: {e.organizerName}</Text> : null}
              {typeof e.registrations === "number" ? <Text style={u.muted}>{e.registrations} inscrito(s)</Text> : null}

              <View style={u.row}>
                {!finished && (
                  <Btn small kind={e.registered ? "outline" : "primary"} label={e.registered ? "Cancelar inscrição" : "Inscrever-me"} onPress={() => toggle(e)} />
                )}
                {e.organizerContact ? (
                  <Btn small kind="outline" label="📞 Contacto" onPress={() => Linking.openURL(`tel:${e.organizerContact}`)} />
                ) : null}
                {(e.createdById === user?.id || user?.role === "ADMIN") && (
                  <Btn small kind="danger" label="Apagar" onPress={() => remove(e)} />
                )}
              </View>
            </Card>
          );
        })
      )}
    </Page>
  );
}
