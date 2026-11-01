import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking, Switch } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getBoTicket, replyBoTicket, noteBoTicket, setBoTicketStatus, assignBoTicket } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { TICKET_CATEGORY_ICON, TICKET_STATUS_COLOR } from "../constants/backofficeComms";
import { STAGE_COLOR } from "../constants/agentOps";
import { ORDER_STAGE_LABEL } from "../constants/backofficeOrders";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

type Panel = "" | "reply" | "note";

export default function BoTicketScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoTicket(id), null as any, [id]);
  const d: any = loader.data;
  const canReply = adminCan("support.reply");

  const [panel, setPanel] = useState<Panel>("");
  const [text, setText] = useState("");
  const [resolve, setResolve] = useState(false);
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
          <Title>Pedido de suporte</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const t = d.ticket;
  const user = t.user;
  const wa = whatsappUrl(user?.phone);

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setText("");
    setResolve(false);
  }

  async function run(work: () => Promise<any>, fail: string) {
    setBusy(true);
    try {
      loader.setData(await work());
      setPanel("");
      setText("");
      setResolve(false);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const message = text.trim();
    if (message.length < 3) {
      Alert.alert("Atenção", panel === "reply" ? "Escreva a resposta." : "Escreva a nota.");
      return;
    }
    if (panel === "reply") run(() => replyBoTicket(id, { message, resolve }), "Não foi possível enviar a resposta.");
    else run(() => noteBoTicket(id, message), "Não foi possível guardar a nota.");
  }

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>
              {TICKET_CATEGORY_ICON[t.category] ?? "📝"} {t.subject}
            </Title>
          </View>
          <Badge label={labelOf(catalog.ticketStatus, t.status) || t.status} color={TICKET_STATUS_COLOR[t.status] ?? "#757575"} />
        </View>
        <Text style={u.muted}>
          {labelOf(catalog.ticketCategories, t.category)}
          {t.createdAt ? ` · ${formatDateTime(t.createdAt)}` : ""}
          {t.assignedTo ? ` · 🙋 ${t.assignedTo.name}` : ""}
        </Text>

        <Card>
          <Text style={{ lineHeight: 21 }}>{t.message || "Sem mensagem."}</Text>
        </Card>

        <SubTitle>Quem pediu</SubTitle>
        <Card>
          {user ? (
            <>
              <Text style={u.strong}>{user.name}</Text>
              <Text style={u.muted}>
                {user.roleName}
                {user.location ? ` · 📍 ${user.location}` : ""}
              </Text>
              <View style={u.row}>
                <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: user.id })} />
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: user.id, userName: user.name })} />
                {user.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${user.phone}`)} /> : null}
                {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
              </View>
              <Text style={[u.muted, { marginTop: 6 }]}>
                Outros pedidos: {d.context.otherTickets} · Denúncias abertas contra a pessoa: {d.context.openReportsAgainst}
              </Text>
            </>
          ) : (
            <Text style={u.muted}>Conta removida.</Text>
          )}
        </Card>

        {d.context.recentOrders.length > 0 ? (
          <>
            <SubTitle>Encomendas recentes da pessoa</SubTitle>
            {d.context.recentOrders.map((o: any) => (
              <Card key={o.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>Encomenda {o.code}</Text>
                  <Text style={{ color: STAGE_COLOR[o.stage] ?? "#757575", fontWeight: "bold" }}>{ORDER_STAGE_LABEL[o.stage] ?? o.stage}</Text>
                </View>
                <Text style={u.muted}>
                  {money(o.total)} · {formatDateTime(o.createdAt)}
                </Text>
                {adminCan("orders.view") ? <Btn small kind="outline" label="Abrir a encomenda" onPress={() => navigation.navigate("BoOrder", { id: o.id })} /> : null}
              </Card>
            ))}
          </>
        ) : null}

        {canReply ? (
          <>
            <SubTitle>Ações</SubTitle>
            <View style={u.row}>
              <Btn small label="💬 Responder" onPress={() => open("reply")} />
              <Btn small kind="outline" label="🔒 Nota interna" onPress={() => open("note")} />
              {!t.assignedTo ? <Btn small kind="outline" label="🙋 Assumir" onPress={() => run(() => assignBoTicket(id), "Não foi possível assumir o pedido.")} disabled={busy} /> : null}
              {t.status !== "RESOLVIDO" ? <Btn small kind="outline" label="✅ Marcar como resolvido" onPress={() => run(() => setBoTicketStatus(id, "RESOLVIDO"), "Não foi possível mudar o estado.")} disabled={busy} /> : <Btn small kind="outline" label="Reabrir" onPress={() => run(() => setBoTicketStatus(id, "EM_CURSO"), "Não foi possível reabrir.")} disabled={busy} />}
            </View>
          </>
        ) : null}

        {panel === "reply" ? (
          <Card>
            <Text style={u.strong}>Responder à pessoa</Text>
            <Text style={u.muted}>Ela recebe a resposta como notificação.</Text>
            <Field value={text} onChangeText={setText} multiline placeholder="Escreva de forma clara e com respeito." />
            <View style={[u.between, { marginTop: 6 }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={u.strong}>Resolver o pedido</Text>
                <Text style={u.muted}>{resolve ? "O pedido fica resolvido." : "O pedido fica em curso."}</Text>
              </View>
              <Switch value={resolve} onValueChange={setResolve} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
            </View>
            <View style={u.row}>
              <Btn label={busy ? "A enviar..." : "Enviar resposta"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        {panel === "note" ? (
          <Card>
            <Field label="Nota interna (só a equipa vê)" value={text} onChangeText={setText} multiline />
            <View style={u.row}>
              <Btn label={busy ? "A guardar..." : "Guardar nota"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        <SubTitle>Conversa ({d.replies.length})</SubTitle>
        {d.replies.length === 0 ? (
          <Text style={u.muted}>Ainda ninguém respondeu.</Text>
        ) : (
          d.replies.map((r: any) => (
            <Card key={r.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{r.authorName}</Text>
                {r.isInternal ? <Badge label="Nota interna" color="#757575" /> : <Badge label="Enviada" color="#2E7D32" />}
              </View>
              <Text style={{ marginTop: 4, lineHeight: 20 }}>{r.message}</Text>
              <Text style={u.muted}>{formatDateTime(r.createdAt)}</Text>
            </Card>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
