import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { adminGetAgentCase, adminRespondAgentCase } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { CASE_ICON, CASE_STATUS_COLOR } from "../constants/agentSupport";
import { shortId } from "../constants/agentOps";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

export default function AdminAgentCaseScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const { user } = useAuth();
  const catalog = useAgentCatalog();
  const allowed = user?.role === "ADMIN";

  const loader = useLoader(() => (allowed ? adminGetAgentCase(id) : Promise.resolve(null as any)), null as any, [allowed, id]);
  const d: any = loader.data;

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (allowed) loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed, id])
  );

  if (!allowed) {
    return (
      <Page>
        <Title>Chamado</Title>
        <Empty text="Acesso restrito à equipa do NÔDJUNTA AGRO." />
      </Page>
    );
  }

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>Chamado</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const c = d.case;
  const resolved = c.status === "RESOLVIDO";

  async function send(resolve: boolean) {
    if (message.trim().length < 3) {
      Alert.alert("Atenção", "Escreva a resposta ao agente.");
      return;
    }

    setBusy(true);
    try {
      loader.setData(await adminRespondAgentCase(id, { message: message.trim(), status: resolve ? "RESOLVIDO" : undefined }));
      setMessage("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível responder."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>
            {CASE_ICON[c.category] ?? "⚠️"} {c.title}
          </Title>
        </View>
        <Badge label={labelOf(catalog.caseStatus, c.status) || c.status} color={CASE_STATUS_COLOR[c.status] ?? "#757575"} />
      </View>
      <Text style={u.muted}>{labelOf(catalog.caseCategories, c.category)}</Text>

      <Card>
        <Text style={{ lineHeight: 21 }}>{c.description}</Text>
        <Text style={[u.muted, { marginTop: 6 }]}>🤝 Agente: {c.agent?.name ?? "—"}</Text>
        {c.clientName ? <Text style={u.muted}>👤 Cliente: {c.clientName}</Text> : null}
        {c.orderId ? <Text style={u.muted}>📦 Encomenda {shortId(c.orderId)}</Text> : null}
        <Text style={u.muted}>Aberto em {formatDateTime(c.createdAt)}</Text>
        {c.escalatedAt ? <Text style={u.muted}>Passado à equipa em {formatDateTime(c.escalatedAt)}</Text> : null}
        {resolved && c.resolution ? <Text style={{ color: "#2E7D32", marginTop: 4 }}>✅ Resolução: {c.resolution}</Text> : null}

        <View style={u.row}>
          {c.agent ? <Btn small kind="outline" label="💬 Falar com o agente" onPress={() => navigation.navigate("Chat", { userId: c.agent.id, userName: c.agent.name })} /> : null}
          {c.agent?.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${c.agent.phone}`)} /> : null}
          {c.agent ? <Btn small kind="outline" label="Abrir o agente" onPress={() => navigation.navigate("AdminAgent", { userId: c.agent.id })} /> : null}
        </View>
      </Card>

      <SubTitle>Andamento ({d.events.length})</SubTitle>
      {d.events.map((e: any) => (
        <Card key={e.id}>
          <View style={u.between}>
            <Text style={u.strong}>{e.authorName}</Text>
            {e.fromTeam ? <Badge label="Equipa" color="#6A1B9A" /> : null}
          </View>
          <Text style={{ marginTop: 4, lineHeight: 20 }}>{e.message}</Text>
          <Text style={u.muted}>{formatDateTime(e.createdAt)}</Text>
        </Card>
      ))}

      {!resolved ? (
        <>
          <SubTitle>Responder ao agente</SubTitle>
          <Card>
            <Field label="Resposta" value={message} onChangeText={setMessage} multiline placeholder="Ex: Já confirmámos o pagamento. O vendedor vai entregar amanhã." />
            <View style={u.row}>
              <Btn label={busy ? "A enviar..." : "Enviar resposta"} onPress={() => send(false)} disabled={busy} />
              <Btn kind="outline" label="✅ Enviar e resolver" onPress={() => send(true)} disabled={busy} />
            </View>
            <Text style={u.muted}>"Enviar resposta" devolve o chamado ao agente. "Enviar e resolver" fecha-o.</Text>
          </Card>
        </>
      ) : null}
    </Page>
  );
}
