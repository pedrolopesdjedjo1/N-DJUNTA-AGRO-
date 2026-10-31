import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getBoEvent, cancelBoEvent, restoreBoEvent, notifyBoEvent, saveBoHighlight } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { EVENT_GROUP_ICON } from "../constants/backofficeOrgs";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate, formatDateTime } from "../constants/market";

type Panel = "" | "cancel" | "restore" | "notify" | "feature";

const DAYS = [7, 14, 30];

export default function BoEventScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoEvent(id), null as any, [id]);
  const d: any = loader.data;
  const canManage = adminCan("events.manage");
  const canFeature = adminCan("content.manage", "events.manage");

  const [panel, setPanel] = useState<Panel>("");
  const [text, setText] = useState("");
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!d) {
    return (
      <AdminLayout active="BoSystem">
        <Page loader={loader}>
          <Title>Evento</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const e = d.event;

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setText("");
    setDays(14);
  }

  async function run(work: () => Promise<any>, fail: string, done?: string) {
    setBusy(true);
    try {
      const r = await work();
      if (r?.event) loader.setData(r);
      else loader.reload();
      setPanel("");
      setText("");
      if (done) Alert.alert("Pronto", done);
    } catch (err) {
      Alert.alert("Atenção", getApiErrorMessage(err, fail));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const note = text.trim();

    if (panel === "feature") return run(() => saveBoHighlight({ kind: "EVENTO", refId: id, days }), "Não foi possível pôr em destaque.", "O evento está em destaque.");

    if (panel === "notify") {
      if (note.length < 5) return Alert.alert("Atenção", "Escreva a mensagem (pelo menos 5 letras).");
      return run(() => notifyBoEvent(id, note), "Não foi possível enviar o aviso.", `${d.participants.length} participante(s) receberam o aviso.`);
    }

    if (note.length < 5) return Alert.alert("Atenção", "Explique o motivo (pelo menos 5 letras). Os participantes e o organizador veem.");
    if (panel === "cancel") {
      return Alert.alert("Cancelar o evento", `Todos os ${d.participants.length} inscritos são avisados. Continuar?`, [
        { text: "Não", style: "cancel" },
        { text: "Cancelar o evento", style: "destructive", onPress: () => run(() => cancelBoEvent(id, note), "Não foi possível cancelar o evento.") },
      ]);
    }
    return run(() => restoreBoEvent(id, note), "Não foi possível repor o evento.");
  }

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>
              {EVENT_GROUP_ICON[e.group] ?? "📌"} {e.title}
            </Title>
          </View>
          <Badge label={e.hidden ? "Cancelado" : "Ativo"} color={e.hidden ? "#C62828" : "#2E7D32"} />
        </View>
        <Text style={u.muted}>{labelOf(catalog.eventGroups, e.group)}</Text>

        {e.hidden && e.hiddenReason ? (
          <Card>
            <Text style={{ color: "#C62828", fontWeight: "bold" }}>🙈 Cancelado pela equipa</Text>
            <Text style={{ marginTop: 4 }}>{e.hiddenReason}</Text>
          </Card>
        ) : null}

        <Card>
          <Text>{e.date ? `📅 ${formatDateTime(e.date)}` : "Sem data indicada"}</Text>
          {e.location ? <Text style={u.muted}>📍 {e.location}</Text> : null}
          {e.region ? <Text style={u.muted}>Região: {e.region}</Text> : null}
          <Text style={u.muted}>
            👥 {d.participants.length}
            {e.capacity ? ` de ${e.capacity}` : ""} inscrito(s)
          </Text>
          {d.organizer ? (
            <>
              <Text style={[u.muted, { marginTop: 4 }]}>Organizador: {d.organizer.name}</Text>
              <View style={u.row}>
                <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: d.organizer.id })} />
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: d.organizer.id, userName: d.organizer.name })} />
              </View>
            </>
          ) : null}
        </Card>

        {e.description ? (
          <>
            <SubTitle>Descrição</SubTitle>
            <Text style={{ lineHeight: 21 }}>{e.description}</Text>
          </>
        ) : null}

        {canManage || canFeature ? (
          <>
            <SubTitle>Ações</SubTitle>
            <View style={u.row}>
              {canManage && !e.hidden ? <Btn small kind="danger" label="⛔ Cancelar o evento" onPress={() => open("cancel")} /> : null}
              {canManage && e.hidden ? <Btn small label="↩️ Repor o evento" onPress={() => open("restore")} /> : null}
              {canManage && d.participants.length > 0 ? <Btn small kind="outline" label="📣 Avisar os participantes" onPress={() => open("notify")} /> : null}
              {canFeature && !e.hidden ? <Btn small kind="outline" label="⭐ Pôr em destaque" onPress={() => open("feature")} /> : null}
            </View>
          </>
        ) : null}

        {panel ? (
          <Card>
            <Text style={u.strong}>
              {panel === "cancel" ? "Cancelar o evento" : panel === "restore" ? "Repor o evento" : panel === "notify" ? "Avisar os participantes" : "Pôr em destaque"}
            </Text>

            {panel === "feature" ? (
              <>
                <Text style={u.label}>Por quantos dias?</Text>
                <View style={u.row}>
                  {DAYS.map((n) => (
                    <Chip key={n} label={`${n} dias`} active={days === n} onPress={() => setDays(n)} />
                  ))}
                </View>
              </>
            ) : (
              <Field
                label={panel === "notify" ? "Mensagem (recebem como notificação)" : panel === "restore" ? "Porque o evento volta" : "Motivo (inscritos e organizador veem)"}
                value={text}
                onChangeText={setText}
                multiline
                placeholder={panel === "cancel" ? "Ex: O local ficou indisponível. Avisaremos a nova data." : ""}
              />
            )}
            <View style={u.row}>
              <Btn kind={panel === "cancel" ? "danger" : "primary"} label={busy ? "A guardar..." : "Confirmar"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        <SubTitle>👥 Participantes ({d.participants.length})</SubTitle>
        {d.participants.length === 0 ? (
          <Text style={u.muted}>Ainda não há inscritos.</Text>
        ) : (
          d.participants.map((p: any) => (
            <Card key={p.id}>
              <Text style={u.strong}>{p.name}</Text>
              {p.location ? <Text style={u.muted}>📍 {p.location}</Text> : null}
              {p.registeredAt ? <Text style={u.muted}>Inscrito em {formatDate(p.registeredAt)}</Text> : null}
              <View style={u.row}>
                {p.userId ? <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: p.userId })} /> : null}
                {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
              </View>
            </Card>
          ))
        )}

        <SubTitle>Histórico de decisões</SubTitle>
        {d.history.length === 0 ? (
          <Text style={u.muted}>A equipa ainda não tomou decisões sobre este evento.</Text>
        ) : (
          d.history.map((h: any) => (
            <Card key={h.id}>
              <Text style={u.strong}>{labelOf(catalog.auditActions, h.action) || h.action}</Text>
              <Text style={{ marginTop: 2 }}>{h.summary}</Text>
              <Text style={u.muted}>
                {h.adminName} · {formatDateTime(h.createdAt)}
              </Text>
            </Card>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
