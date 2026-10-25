import React, { useCallback, useState } from "react";
import { View, Text, Alert, Switch } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getAgentCase, addAgentCaseNote, setAgentCaseStatus, escalateAgentCase, deleteAgentCase } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { CASE_ICON, CASE_STATUS_COLOR } from "../constants/agentSupport";
import { shortId } from "../constants/agentOps";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

type Panel = "" | "note" | "resolve" | "escalate";

export default function AgentCaseScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useAgentCatalog();
  const loader = useLoader(() => getAgentCase(id), null as any, [id]);
  const d: any = loader.data;

  const [panel, setPanel] = useState<Panel>("");
  const [text, setText] = useState("");
  const [notifyClient, setNotifyClient] = useState(true);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

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
  const withTeam = c.status === "ESCALADO";

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setText("");
  }

  async function run(work: () => Promise<any>, fail: string) {
    setBusy(true);
    try {
      loader.setData(await work());
      setPanel("");
      setText("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function saveNote() {
    if (text.trim().length < 3) {
      Alert.alert("Atenção", "Escreva a nota.");
      return;
    }
    run(() => addAgentCaseNote(id, text.trim()), "Não foi possível guardar a nota.");
  }

  function resolve() {
    if (text.trim().length < 3) {
      Alert.alert("Atenção", "Escreva como o problema foi resolvido.");
      return;
    }
    run(
      () => setAgentCaseStatus(id, { status: "RESOLVIDO", resolution: text.trim(), notifyClient: !!c.clientId && notifyClient }),
      "Não foi possível resolver o chamado."
    );
  }

  function escalate() {
    if (text.trim().length < 10) {
      Alert.alert("Atenção", "Explique o que já tentou e o que precisa da equipa (pelo menos 10 letras).");
      return;
    }
    Alert.alert("Passar à equipa", "A equipa do NÔDJUNTA AGRO recebe o chamado e responde-lhe aqui. Passar?", [
      { text: "Não", style: "cancel" },
      { text: "Passar", onPress: () => run(() => escalateAgentCase(id, text.trim()), "Não foi possível passar o chamado à equipa.") },
    ]);
  }

  function remove() {
    Alert.alert("Apagar chamado", "Só se apaga um chamado que ainda não teve andamento. Apagar?", [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAgentCase(id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
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

      {withTeam ? (
        <Card>
          <Text style={u.strong}>🏢 Este chamado está com a equipa</Text>
          <Text style={u.muted}>Receberá um aviso quando a equipa responder. Entretanto pode juntar notas.</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={{ lineHeight: 21 }}>{c.description}</Text>
        {c.clientName ? <Text style={[u.muted, { marginTop: 6 }]}>👤 {c.clientName}</Text> : null}
        {c.orderId ? <Text style={u.muted}>📦 Encomenda {shortId(c.orderId)}</Text> : null}
        <Text style={u.muted}>Aberto em {formatDateTime(c.createdAt)}</Text>
        {c.escalatedAt ? <Text style={u.muted}>Passado à equipa em {formatDateTime(c.escalatedAt)}</Text> : null}
        {resolved && c.resolvedAt ? <Text style={{ color: "#2E7D32", marginTop: 4 }}>✅ Resolvido em {formatDateTime(c.resolvedAt)}</Text> : null}
        {resolved && c.resolution ? <Text style={{ marginTop: 4 }}>Resolução: {c.resolution}</Text> : null}

        <View style={u.row}>
          {c.orderId ? <Btn small kind="outline" label="Abrir a encomenda" onPress={() => navigation.navigate("AgentOrder", { id: c.orderId })} /> : null}
          {c.linkId ? <Btn small kind="outline" label="Ficha do cliente" onPress={() => navigation.navigate("AgentClient", { id: c.linkId })} /> : null}
        </View>
      </Card>

      <SubTitle>O que fazer</SubTitle>
      <View style={u.row}>
        {!resolved ? <Btn small kind="outline" label="📝 Juntar nota" onPress={() => open("note")} /> : null}
        {c.status === "ABERTO" ? (
          <Btn small kind="outline" label="▶️ Pôr em curso" onPress={() => run(() => setAgentCaseStatus(id, { status: "EM_CURSO" }), "Não foi possível mudar o estado.")} disabled={busy} />
        ) : null}
        {!resolved && !withTeam ? <Btn small label="✅ Resolvido" onPress={() => open("resolve")} /> : null}
        {!resolved && !withTeam ? <Btn small kind="outline" label="🏢 Passar à equipa" onPress={() => open("escalate")} /> : null}
        {resolved ? (
          <Btn small kind="outline" label="Reabrir" onPress={() => run(() => setAgentCaseStatus(id, { status: "EM_CURSO" }), "Não foi possível reabrir o chamado.")} disabled={busy} />
        ) : null}
        {c.status === "ABERTO" ? <Btn small kind="danger" label="Apagar" onPress={remove} /> : null}
      </View>

      {panel === "note" ? (
        <Card>
          <Field label="Nota" value={text} onChangeText={setText} multiline placeholder="Ex: Falei com o vendedor e vai enviar amanhã" />
          <View style={u.row}>
            <Btn label={busy ? "A guardar..." : "Guardar nota"} onPress={saveNote} disabled={busy} />
            <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
          </View>
        </Card>
      ) : null}

      {panel === "resolve" ? (
        <Card>
          <Text style={u.strong}>Como foi resolvido?</Text>
          <Field value={text} onChangeText={setText} multiline placeholder="Ex: O transportador entregou e o comprador confirmou" />
          {c.clientId ? (
            <View style={u.between}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={u.strong}>Avisar o cliente</Text>
                <Text style={u.muted}>{notifyClient ? `${c.clientName ?? "O cliente"} recebe uma notificação.` : "O cliente não é avisado."}</Text>
              </View>
              <Switch value={notifyClient} onValueChange={setNotifyClient} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
            </View>
          ) : null}
          <View style={u.row}>
            <Btn label={busy ? "A guardar..." : "Marcar como resolvido"} onPress={resolve} disabled={busy} />
            <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
          </View>
        </Card>
      ) : null}

      {panel === "escalate" ? (
        <Card>
          <Text style={u.strong}>Passar à equipa do NÔDJUNTA AGRO</Text>
          <Text style={u.muted}>Diga o que já tentou e o que precisa da equipa.</Text>
          <Field value={text} onChangeText={setText} multiline placeholder="Ex: O pagamento não aparece há 5 dias. Já falei com o comprador e o vendedor." />
          <View style={u.row}>
            <Btn label={busy ? "A enviar..." : "Passar à equipa"} onPress={escalate} disabled={busy} />
            <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
          </View>
        </Card>
      ) : null}

      <SubTitle>Andamento ({d.events.length})</SubTitle>
      {d.events.length === 0 ? (
        <Empty text="Ainda não há registos." />
      ) : (
        d.events.map((e: any) => (
          <Card key={e.id}>
            <View style={u.between}>
              <Text style={u.strong}>{e.authorName}</Text>
              {e.fromTeam ? <Badge label="Equipa" color="#6A1B9A" /> : null}
            </View>
            <Text style={{ marginTop: 4, lineHeight: 20 }}>{e.message}</Text>
            <Text style={u.muted}>{formatDateTime(e.createdAt)}</Text>
          </Card>
        ))
      )}
    </Page>
  );
}
