import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, Image } from "react-native";
import { Page, Title, SubTitle, Card, Btn, Empty, u } from "../components/ui";
import { renewAssist, endAssist } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { getAssist, setAssist, clearAssist, useAssist, timeText } from "../utils/assistMode";
import { labelOf } from "../utils/ngoCatalog";
import { ROLE_ICON, ROLE_NAME, assistToolsFor } from "../constants/agent";
import { getApiErrorMessage } from "../api/errorMessage";

// Painel de uma sessão de ajuda: as ferramentas da conta do cliente, o tempo e o fim da sessão
export default function AgentAssistScreen({ navigation }: any) {
  const catalog = useAgentCatalog();
  const { session, remainingMs } = useAssist();
  const [busy, setBusy] = useState(false);

  if (!session) {
    return (
      <Page>
        <Title>🤝 Ajuda na conta</Title>
        <Empty text="Não há nenhuma sessão de ajuda aberta neste telemóvel. Abra a ficha de um cliente e inicie uma sessão." />
        <Btn label="Ver clientes" onPress={() => navigation.navigate("AgentClients")} />
        <Btn kind="outline" label="Sessões de ajuda" onPress={() => navigation.navigate("AgentSessions")} />
      </Page>
    );
  }

  const client = session.client;
  const tools = assistToolsFor(client.role);
  const low = remainingMs < 5 * 60000;

  async function renew() {
    const current = getAssist();
    if (!current) return;

    setBusy(true);
    try {
      const r = await renewAssist(current.sessionId);
      setAssist({ ...current, token: r.token, expiresAt: new Date(r.expiresAt).getTime() });
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível prolongar a sessão."));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    const current = getAssist();
    if (!current) return;

    setBusy(true);
    try {
      await endAssist(current.sessionId);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível terminar a sessão no servidor. Ela termina sozinha."));
    } finally {
      const linkId = current.linkId;
      clearAssist();
      setBusy(false);
      navigation.navigate("AgentClient", { id: linkId });
    }
  }

  return (
    <Page>
      <View style={{ marginTop: 28 }}>
        <Title>🤝 A ajudar {client.name}</Title>
      </View>

      <Card>
        <View style={[u.row, { alignItems: "center" }]}>
          {client.photoUrl ? (
            <Image source={{ uri: client.photoUrl }} style={[u.photo, { width: 52, height: 52, borderRadius: 26 }]} />
          ) : (
            <View style={[u.photo, { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 24 }}>{ROLE_ICON[client.role] ?? "👤"}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={u.strong}>{client.name}</Text>
            <Text style={u.muted}>{ROLE_NAME[client.role] ?? client.role}</Text>
            {client.location ? <Text style={u.muted}>📍 {client.location}</Text> : null}
          </View>
        </View>
        <Text style={[u.muted, { marginTop: 6 }]}>Motivo: {labelOf(catalog.assistReasons, session.reason) || session.reason}</Text>
        <Text style={{ fontSize: 28, fontWeight: "bold", marginTop: 6, color: low ? "#C62828" : "#EF6C00" }}>⏱️ {timeText(remainingMs)}</Text>
        <Text style={u.muted}>A sessão termina sozinha quando o tempo acabar.</Text>

        <View style={u.row}>
          <Btn small kind="outline" label={busy ? "A prolongar..." : "+ 30 minutos"} onPress={renew} disabled={busy} />
          <Btn small kind="danger" label={busy ? "A terminar..." : "Terminar sessão"} onPress={finish} disabled={busy} />
        </View>
      </Card>

      <SubTitle>O que quer fazer na conta?</SubTitle>
      <Text style={u.muted}>Estas telas mostram a conta de {client.name.split(" ")[0]}. A faixa laranja no topo lembra que está a ajudar.</Text>

      <View style={u.grid}>
        {tools.map(([icon, label, route]) => (
          <TouchableOpacity key={`${route}-${label}`} style={u.tile} onPress={() => navigation.navigate(route)}>
            <View style={u.tileBox}>
              <Text style={{ fontSize: 22 }}>{icon}</Text>
              <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Card>
        <Text style={u.strong}>🔒 O que não pode fazer</Text>
        <Text style={u.muted}>
          Mudar a palavra-passe, as configurações da conta ou a verificação de identidade. Isso só a própria pessoa faz.
        </Text>
      </Card>

      <View style={u.row}>
        <Btn small kind="outline" label="Ficha do cliente" onPress={() => navigation.navigate("AgentClient", { id: session.linkId })} />
        <Btn small kind="outline" label="Voltar ao início" onPress={() => navigation.navigate("AgentHome")} />
      </View>
    </Page>
  );
}
