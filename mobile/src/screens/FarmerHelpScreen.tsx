import React, { useState } from "react";
import { View, Text, Alert, Linking, ScrollView } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { createTicket, getMyTickets } from "../api/account";
import { listContacts, createContact, deleteContact } from "../api/contacts";
import { getOrders } from "../api/orders";
import { getApiErrorMessage } from "../api/errorMessage";
import { CONTACT_KINDS, SUPPORT, TICKET_KINDS, TICKET_STATUS, formatDate } from "../constants/market";

const MANAGERS = ["ADMIN", "GOVERNO", "ONG"];
const PROBLEMS = ["PEDIDO", "ENTREGA", "PAGAMENTO", "RECLAMACAO", "SUGESTAO", "OUTRO"];

export default function FarmerHelpScreen({ navigation }: any) {
  const { user } = useAuth();
  const canManage = MANAGERS.includes(user?.role ?? "");
  const isAdmin = user?.role === "ADMIN";

  const [contactKind, setContactKind] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(
    async () => {
      const [tickets, orders, contacts] = await Promise.all([
        getMyTickets(),
        getOrders("seller"),
        listContacts({ kind: contactKind, q }),
      ]);
      return { tickets, orders, contacts };
    },
    { tickets: [] as any[], orders: [] as any[], contacts: [] as any[] },
    [contactKind, q]
  );

  // Emergência
  const [emergency, setEmergency] = useState("");
  const [sendingEmergency, setSendingEmergency] = useState(false);

  // Problemas
  const [kind, setKind] = useState("PEDIDO");
  const [orderId, setOrderId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Novo contacto (equipa)
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", kind: "AGRICOLA", region: "", description: "" });
  const [saving, setSaving] = useState(false);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function sendEmergency() {
    if (!emergency.trim()) {
      Alert.alert("Atenção", "Descreva o que está a acontecer.");
      return;
    }
    setSendingEmergency(true);
    try {
      await createTicket({ kind: "EMERGENCIA", subject: "Emergência agrícola", message: emergency.trim() });
      setEmergency("");
      Alert.alert("Enviado", "A equipa NÔDJUNTA AGRO recebeu o seu alerta. Se for muito urgente, ligue já para o suporte.");
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível enviar."));
    } finally {
      setSendingEmergency(false);
    }
  }

  async function sendProblem() {
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
        orderId: orderId || undefined,
      });
      setSubject("");
      setMessage("");
      setOrderId("");
      Alert.alert("Enviado", "A equipa vai responder em breve.");
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível enviar."));
    } finally {
      setSending(false);
    }
  }

  async function saveContact() {
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert("Atenção", "Preencha o nome e o telefone.");
      return;
    }
    setSaving(true);
    try {
      await createContact({
        name: form.name.trim(),
        phone: form.phone.trim(),
        kind: form.kind,
        region: form.region.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      setAdding(false);
      setForm({ name: "", phone: "", kind: "AGRICOLA", region: "", description: "" });
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar o contacto."));
    } finally {
      setSaving(false);
    }
  }

  function removeContact(c: any) {
    Alert.alert("Apagar contacto", `Apagar "${c.name}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteContact(c.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  const kindLabel = (value: string) => TICKET_KINDS.find((k) => k.value === value)?.label ?? value;
  const contactLabel = (value: string) => CONTACT_KINDS.find((k) => k.value === value)?.label ?? value;
  const orders: any[] = loader.data.orders.slice(0, 6);

  return (
    <Page loader={loader}>
      <Title>🆘 Ajuda e emergência</Title>

      <SubTitle>🚨 Emergência agrícola</SubTitle>
      <Card>
        <Text style={u.muted}>Praga, doença das plantas, inundação, incêndio ou outro problema urgente na sua machamba.</Text>
        <Field label="O que está a acontecer?" value={emergency} onChangeText={setEmergency} multiline />
        <Btn kind="danger" label={sendingEmergency ? "A enviar..." : "🚨 Enviar alerta de emergência"} onPress={sendEmergency} disabled={sendingEmergency} />
        <Btn kind="outline" small label={`📞 Ligar para o suporte (${SUPPORT.phones[0]})`} onPress={() => Linking.openURL(`tel:${SUPPORT.phones[0]}`)} />
      </Card>

      <SubTitle>Contactar suporte</SubTitle>
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

      <SubTitle>Problemas com pedido, transporte ou pagamento</SubTitle>
      <View style={u.row}>
        {PROBLEMS.map((value) => (
          <Chip key={value} label={kindLabel(value)} active={kind === value} onPress={() => setKind(value)} />
        ))}
      </View>

      {orders.length > 0 && ["PEDIDO", "ENTREGA", "PAGAMENTO"].includes(kind) ? (
        <>
          <Text style={u.label}>Sobre qual pedido? (opcional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip label="Nenhum" active={orderId === ""} onPress={() => setOrderId("")} />
            {orders.map((o) => (
              <Chip
                key={o.id}
                label={`#${o.id.slice(0, 6).toUpperCase()}`}
                active={orderId === o.id}
                onPress={() => setOrderId(o.id)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      <Field label="Assunto" value={subject} onChangeText={setSubject} />
      <Field label="Mensagem" value={message} onChangeText={setMessage} multiline />
      <Btn label={sending ? "A enviar..." : "Enviar"} onPress={sendProblem} disabled={sending} />

      <SubTitle>📒 Contactos importantes</SubTitle>
      <Field
        placeholder="Procurar contacto"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <Chip label="Todos" active={contactKind === ""} onPress={() => setContactKind("")} />
        {CONTACT_KINDS.map((k) => (
          <Chip key={k.value} label={k.label} active={contactKind === k.value} onPress={() => setContactKind(k.value)} />
        ))}
      </ScrollView>

      {canManage && (
        <>
          <Btn kind="outline" label={adding ? "Fechar formulário" : "➕ Adicionar contacto"} onPress={() => setAdding(!adding)} />
          {adding && (
            <Card>
              <View style={u.row}>
                {CONTACT_KINDS.map((k) => (
                  <Chip key={k.value} label={k.label} active={form.kind === k.value} onPress={() => setField("kind", k.value)} />
                ))}
              </View>
              <Field label="Nome" value={form.name} onChangeText={(v) => setField("name", v)} />
              <Field label="Telefone" value={form.phone} onChangeText={(v) => setField("phone", v)} keyboardType="phone-pad" />
              <Field label="Região (opcional)" value={form.region} onChangeText={(v) => setField("region", v)} />
              <Field label="Descrição (opcional)" value={form.description} onChangeText={(v) => setField("description", v)} multiline />
              <Btn label={saving ? "A guardar..." : "Guardar contacto"} onPress={saveContact} disabled={saving} />
            </Card>
          )}
        </>
      )}

      {loader.data.contacts.length === 0 ? (
        <Empty text="Ainda não há contactos importantes registados." />
      ) : (
        loader.data.contacts.map((c: any) => (
          <Card key={c.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{c.name}</Text>
              <Badge label={contactLabel(c.kind)} color="#00838F" />
            </View>
            {c.region ? <Text style={u.muted}>📍 {c.region}</Text> : null}
            {c.description ? <Text style={u.muted}>{c.description}</Text> : null}
            <Text style={{ marginTop: 4 }}>📞 {c.phone}</Text>
            <View style={u.row}>
              <Btn small label="Ligar" onPress={() => Linking.openURL(`tel:${c.phone}`)} />
              {(c.createdById === user?.id || isAdmin) && <Btn small kind="danger" label="Apagar" onPress={() => removeContact(c)} />}
            </View>
          </Card>
        ))
      )}

      <SubTitle>Os meus pedidos de ajuda</SubTitle>
      {loader.data.tickets.length === 0 ? (
        <Empty text="Ainda não enviou pedidos." />
      ) : (
        loader.data.tickets.map((t: any) => {
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

      {isAdmin ? (
        <>
          <SubTitle>Equipa</SubTitle>
          <Btn kind="outline" label="Ver todos os pedidos de ajuda" onPress={() => navigation.navigate("Help")} />
        </>
      ) : null}
    </Page>
  );
}
