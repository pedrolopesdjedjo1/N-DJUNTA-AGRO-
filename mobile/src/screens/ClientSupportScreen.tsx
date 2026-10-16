import React, { useState } from "react";
import { View, Text, Alert, Linking, ScrollView } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { createTicket, getMyTickets } from "../api/account";
import { getMyOrders } from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";
import { SUPPORT, TICKET_STATUS, formatDate } from "../constants/market";

const KINDS = [
  { value: "PEDIDO", label: "Problema com encomenda" },
  { value: "PAGAMENTO", label: "Problema com pagamento" },
  { value: "ENTREGA", label: "Problema com entrega" },
  { value: "RECLAMACAO", label: "Reclamação" },
  { value: "SUGESTAO", label: "Sugestão" },
  { value: "OUTRO", label: "Outro" },
];

const WITH_ORDER = ["PEDIDO", "PAGAMENTO", "ENTREGA"];
const EMPTY = { tickets: [] as any[], orders: [] as any[] };

export default function ClientSupportScreen({ route }: any) {
  const loader = useLoader(async () => {
    const [tickets, groups] = await Promise.all([getMyTickets(), getMyOrders().catch(() => ({ groups: [] as any[] }))]);
    const orders = ((groups as any).groups as any[]).flatMap((g) => g.orders).slice(0, 8);
    return { tickets, orders };
  }, EMPTY);

  const [kind, setKind] = useState("PEDIDO");
  const [orderId, setOrderId] = useState<string>(route?.params?.orderId ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const orders: any[] = loader.data.orders;
  const tickets: any[] = loader.data.tickets;
  const kindLabel = (value: string) => KINDS.find((k) => k.value === value)?.label ?? value;

  async function send() {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Atenção", "Preencha o assunto e a mensagem.");
      return;
    }
    setSending(true);
    try {
      await createTicket({
        kind,
        subject: subject.trim(),
        message: message.trim(),
        orderId: WITH_ORDER.includes(kind) && orderId ? orderId : undefined,
      });
      setSubject("");
      setMessage("");
      setOrderId("");
      Alert.alert("Enviado", "A equipa NÔDJUNTA AGRO vai responder em breve.");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar."));
    } finally {
      setSending(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>🆘 Suporte</Title>

      <SubTitle>Fale connosco</SubTitle>
      {SUPPORT.phones.map((phone) => (
        <Card key={phone}>
          <Text style={u.strong}>📞 {phone}</Text>
          <View style={u.row}>
            <Btn small label="Ligar" onPress={() => Linking.openURL(`tel:${phone}`)} />
            <Btn small kind="outline" label="💬 WhatsApp" onPress={() => Linking.openURL(`https://wa.me/245${phone}`)} />
          </View>
        </Card>
      ))}
      <Card>
        <Text style={u.strong}>📧 {SUPPORT.email}</Text>
        <Btn small label="Enviar e-mail" onPress={() => Linking.openURL(`mailto:${SUPPORT.email}`)} />
      </Card>

      <SubTitle>Enviar um pedido de ajuda</SubTitle>
      <View style={u.row}>
        {KINDS.map((k) => (
          <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
        ))}
      </View>

      {WITH_ORDER.includes(kind) && orders.length > 0 ? (
        <>
          <Text style={u.label}>Sobre qual encomenda? (opcional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip label="Nenhuma" active={orderId === ""} onPress={() => setOrderId("")} />
            {orders.map((o) => (
              <Chip key={o.id} label={o.number} active={orderId === o.id} onPress={() => setOrderId(o.id)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <Field label="Assunto" value={subject} onChangeText={setSubject} />
      <Field label="Mensagem" value={message} onChangeText={setMessage} multiline placeholder="Conte o que aconteceu" />
      <Btn label={sending ? "A enviar..." : "Enviar"} onPress={send} disabled={sending} />

      <SubTitle>Os meus pedidos de ajuda</SubTitle>
      {tickets.length === 0 ? (
        <Empty text="Ainda não enviou pedidos." />
      ) : (
        tickets.map((t) => {
          const st = TICKET_STATUS[t.status];
          return (
            <Card key={t.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{t.subject}</Text>
                <Badge label={st?.label ?? t.status} color={st?.color ?? "#757575"} />
              </View>
              <Text style={u.muted}>
                {kindLabel(t.kind)} · {formatDate(t.createdAt)}
              </Text>
              <Text style={{ marginTop: 4 }}>{t.message}</Text>
            </Card>
          );
        })
      )}
    </Page>
  );
}
