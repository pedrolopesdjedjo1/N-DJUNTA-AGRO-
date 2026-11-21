import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Field, Empty, useLoader, u } from "../components/ui";
import { colors } from "../theme/colors";
import { getCooperatives, createCooperative, joinCooperative, leaveCooperative } from "../api/cooperatives";

function erro(e: any) {
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || "Ocorreu um erro. Tente novamente.";
}

export default function CooperativesScreen() {
  const [region, setRegion] = useState("");
  const loader = useLoader<any[]>(() => getCooperatives(region.trim() || undefined), [], []);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function criar() {
    if (name.trim().length < 3 || newRegion.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o nome e a região da cooperativa.");
      return;
    }
    setBusy(true);
    try {
      await createCooperative({ name: name.trim(), region: newRegion.trim(), description: description.trim() || undefined });
      setName("");
      setNewRegion("");
      setDescription("");
      setShowForm(false);
      loader.onRefresh();
      Alert.alert("Pronto", "Cooperativa criada.");
    } catch (e) {
      Alert.alert("Erro", erro(e));
    } finally {
      setBusy(false);
    }
  }

  async function entrar(id: string) {
    try {
      await joinCooperative(id);
      loader.onRefresh();
    } catch (e) {
      Alert.alert("Erro", erro(e));
    }
  }

  async function sair(id: string) {
    try {
      await leaveCooperative(id);
      loader.onRefresh();
    } catch (e) {
      Alert.alert("Erro", erro(e));
    }
  }

  const list: any[] = Array.isArray(loader.data) ? loader.data : [];

  return (
    <Page loader={loader}>
      <Title>Cooperativas</Title>

      <Field label="Filtrar por região" placeholder="Ex.: Oio, Bafatá, Gabú" value={region} onChangeText={setRegion} />
      <Btn label="🔎 Procurar" kind="outline" onPress={loader.onRefresh} />

      <View style={{ height: 10 }} />
      <Btn kind="gold" label={showForm ? "Fechar" : "➕ Criar cooperativa"} onPress={() => setShowForm(!showForm)} />

      {showForm ? (
        <Card>
          <Field label="Nome" value={name} onChangeText={setName} placeholder="Nome da cooperativa" />
          <Field label="Região" value={newRegion} onChangeText={setNewRegion} placeholder="Região" />
          <Field label="Descrição (opcional)" value={description} onChangeText={setDescription} multiline placeholder="O que a cooperativa faz" />
          <Btn label={busy ? "A criar..." : "Criar"} onPress={criar} disabled={busy} />
        </Card>
      ) : null}

      <SubTitle>Cooperativas disponíveis</SubTitle>
      {list.length === 0 && !loader.loading ? <Empty text="Nenhuma cooperativa encontrada." /> : null}

      {list.map((c: any) => {
        const joined = !!(c.isMember ?? c.joined ?? c.member);
        const count = c.membersCount ?? c._count?.members ?? c.members?.length;
        return (
          <Card key={c.id}>
            <View style={u.between}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text, flex: 1 }}>{c.name}</Text>
              {joined ? <Badge label="Membro" color={colors.primary} /> : null}
            </View>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>📍 {c.region || "—"}</Text>
            {c.description ? <Text style={{ color: colors.text, marginTop: 6 }}>{c.description}</Text> : null}
            {typeof count === "number" ? <Text style={{ color: colors.muted, marginTop: 6 }}>👥 {count} membro(s)</Text> : null}
            <View style={{ height: 10 }} />
            {joined ? (
              <Btn small kind="danger" label="Sair da cooperativa" onPress={() => sair(c.id)} />
            ) : (
              <Btn small label="Entrar" onPress={() => entrar(c.id)} />
            )}
          </Card>
        );
      })}
    </Page>
  );
}
