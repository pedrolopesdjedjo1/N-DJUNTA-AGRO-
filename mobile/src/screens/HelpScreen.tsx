import React, { useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { createTicket, getMyTickets, getAllTickets, setTicketStatus } from "../api/account";
import { getApiErrorMessage } from "../api/errorMessage";
import { SUPPORT, TICKET_KINDS, TICKET_STATUS, formatDate } from "../constants/market";

export default function HelpScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const loader = useLoader(
    async () => {
      const [mine, all] = await Promise.all([getMyTickets(), isAdmin ? getAllTickets() : Promise.resolve([])]);
      return { mine, all };
    },
    { mine: [] as any[], all: [] as any[] }
  );

  const [kind, setKind] = useState("PEDIDO");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Atenção", "Preencha o assunto e a mensagem.");
      return;
    }
    setSending(true);
    try {
      await createTicket({ kind, subject: subject.trim(), message: message.trim() });
      setSubject("");
      setMessage("");
      Alert.alert("Enviado", "A equipa NÔDJUNTA AGRO vai responder em breve.");
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível enviar."));
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(id: string, status: string) {
    try {
      await setTicketStatus(id, status);
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar."));
    }
  }

  const kindLabel = (value: string) => TICKET_KINDS.find((k) => k.value === value)?.label ?? value;

  return (
    <Page loader={loader}>
      <Title>🆘 Ajuda e suporte</Title>

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
        {TICKET_KINDS.map((k) => (
          <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
        ))}
      </View>
      <Field label="Assunto" value={subject} onChangeText={setSubject} />
      <Field label="Mensagem" value={message} onChangeText={setMessage} multiline />
      <Btn label={sending ? "A enviar..." : "Enviar"} onPress={send} disabled={sending} />

      <SubTitle>Os meus pedidos de ajuda</SubTitle>
      {loader.data.mine.length === 0 ? (
        <Empty text="Ainda não enviou pedidos." />
      ) : (
        loader.data.mine.map((t: any) => {
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

      {isAdmin && (
        <>
          <SubTitle>Equipa: todos os pedidos</SubTitle>
          {loader.data.all.length === 0 ? (
            <Empty text="Nenhum pedido de ajuda." />
          ) : (
            loader.data.all.map((t: any) => {
              const st = TICKET_STATUS[t.status];
              return (
                <Card key={t.id}>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{t.subject}</Text>
                    <Badge label={st?.label ?? t.status} color={st?.color ?? "#757575"} />
                  </View>
                  <Text style={u.muted}>
                    {t.user?.name ?? "Utilizador"} {t.user?.phone ? `· ${t.user.phone}` : ""} · {kindLabel(t.kind)} · {formatDate(t.createdAt)}
                  </Text>
                  <Text style={{ marginTop: 4 }}>{t.message}</Text>
                  <View style={u.row}>
                    {Object.keys(TICKET_STATUS)
                      .filter((s) => s !== t.status)
                      .map((s) => (
                        <Btn key={s} small kind="outline" label={TICKET_STATUS[s].label} onPress={() => changeStatus(t.id, s)} />
                      ))}
                  </View>
                </Card>
              );
            })
          )}
        </>
      )}
    </Page>
  );
}
