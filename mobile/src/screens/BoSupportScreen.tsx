import React, { useCallback, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { listBoTickets, getBoSupportStats, getBoSupportContacts } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { TICKET_CATEGORY_ICON, TICKET_STATUS_COLOR } from "../constants/backofficeComms";
import { hoursText } from "../constants/backofficeTransport";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const STATS_EMPTY = {
  last30Days: { replies: 0, resolved: 0, avgFirstResponseHours: null as number | null },
  open: { total: 0, over3Days: 0, unanswered: 0 },
  admins: [] as any[],
};
const CONTACTS_EMPTY = { email: "", phones: [] as string[] };

export default function BoSupportScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const stats = useLoader(getBoSupportStats, STATS_EMPTY);
  const contacts = useLoader(getBoSupportContacts, CONTACTS_EMPTY);

  const [status, setStatus] = useState("OPEN");
  const [category, setCategory] = useState("");
  const [assigned, setAssigned] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const key = JSON.stringify({ status, category, assigned, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoTickets({ status, category, assigned, q, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setCounts(r.counts);
      setCategories(r.categories);
      setAvailable(r.available);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar a caixa de entrada."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      stats.reload();
      contacts.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
  );

  const s: any = stats.data;
  const c: any = contacts.data;
  const open = (counts.ABERTO ?? 0) + (counts.EM_CURSO ?? 0);

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>🎧 Suporte</Title>
        <Text style={u.muted}>Pedidos de ajuda das pessoas. Os mais antigos por responder aparecem primeiro.</Text>

        {!available ? (
          <Card>
            <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>Os pedidos de suporte não foram encontrados nesta versão do servidor.</Text>
            <Text style={u.muted}>Na ligação final confirmo o nome da tabela e a lista passa a aparecer.</Text>
          </Card>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["⏳ Em aberto", s.open.total, false],
              ["📭 Sem resposta", s.open.unanswered, s.open.unanswered > 0],
              ["🚨 Há +3 dias", s.open.over3Days, s.open.over3Days > 0],
              ["⏱️ 1.ª resposta (média)", hoursText(s.last30Days.avgFirstResponseHours), false],
              ["💬 Respostas (30 dias)", s.last30Days.replies, false],
              ["✅ Resolvidos (30 dias)", s.last30Days.resolved, false],
            ] as [string, any, boolean][]
          ).map(([label, value, warn]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15, color: warn ? "#C62828" : undefined }]}>{typeof value === "number" ? formatNumber(value) : value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label={`Em aberto (${open})`} active={status === "OPEN"} onPress={() => setStatus("OPEN")} />
          {catalog.ticketStatus.map((st) => (
            <Chip key={st.value} label={`${st.label} (${counts[st.value] ?? 0})`} active={status === st.value} onPress={() => setStatus(st.value)} />
          ))}
          <Chip label="Todos" active={status === ""} onPress={() => setStatus("")} />
        </ScrollView>
        <View style={u.row}>
          <Chip label="🙋 Os meus" active={assigned === "me"} onPress={() => setAssigned(assigned === "me" ? "" : "me")} />
          <Chip label="Sem responsável" active={assigned === "none"} onPress={() => setAssigned(assigned === "none" ? "" : "none")} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="Todos os tipos" active={category === ""} onPress={() => setCategory("")} />
          {catalog.ticketCategories.map((k) => (
            <Chip key={k.value} label={`${TICKET_CATEGORY_ICON[k.value] ?? ""} ${k.label} (${categories[k.value] ?? 0})`.trim()} active={category === k.value} onPress={() => setCategory(k.value)} />
          ))}
        </ScrollView>

        <Field
          placeholder="Procurar no assunto, na mensagem ou pelo nome"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} pedido(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && available && items.length === 0 ? <Empty text={status === "OPEN" ? "Não há pedidos por responder. Bom trabalho!" : "Nenhum pedido com estes filtros."} /> : null}

        {items.map((t) => (
          <TouchableOpacity key={t.id} activeOpacity={0.85} onPress={() => navigation.navigate("BoTicket", { id: t.id })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                  {TICKET_CATEGORY_ICON[t.category] ?? "📝"} {t.subject}
                </Text>
                <Badge label={labelOf(catalog.ticketStatus, t.status) || t.status} color={TICKET_STATUS_COLOR[t.status] ?? "#757575"} />
              </View>
              <Text style={u.muted}>
                {labelOf(catalog.ticketCategories, t.category)} · {t.user?.name ?? "Utilizador"}
              </Text>
              <Text style={{ marginTop: 4 }} numberOfLines={2}>
                {t.message}
              </Text>
              <Text style={u.muted}>
                {t.createdAt ? `${formatDate(t.createdAt)} (há ${t.ageDays} dia(s))` : ""} · 💬 {t.replies}
                {t.assignedTo ? ` · 🙋 ${t.assignedTo.name}` : ""}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}

        <SubTitle>Outras caixas de entrada</SubTitle>
        <View style={u.row}>
          <Btn small kind="outline" label="📣 Reclamações" onPress={() => navigation.navigate("BoReports", { queue: "complaints" })} />
          <Btn small kind="outline" label="⚖️ Problemas de encomendas" onPress={() => navigation.navigate("BoDisputes")} />
          <Btn small kind="outline" label="💳 Problemas de pagamento" onPress={() => navigation.navigate("BoPayments", { state: "PENDENTE" })} />
          <Btn small kind="outline" label="🤝 Chamados dos agentes" onPress={() => navigation.navigate("AdminAgentCases")} />
        </View>

        <SubTitle>Histórico de atendimento (30 dias)</SubTitle>
        {s.admins.length === 0 ? (
          <Text style={u.muted}>Ainda ninguém respondeu a pedidos neste período.</Text>
        ) : (
          s.admins.map((a: any) => (
            <Card key={a.id}>
              <Text style={u.strong}>{a.name}</Text>
              <Text style={u.muted}>
                💬 {a.replies} resposta(s) em {a.tickets} pedido(s)
              </Text>
            </Card>
          ))
        )}

        <SubTitle>Contactos oficiais</SubTitle>
        <Card>
          {c.phones.map((p: string) => (
            <View key={p} style={{ marginBottom: 6 }}>
              <Text style={u.strong}>📞 {p}</Text>
              <View style={u.row}>
                <Btn small label="Ligar" onPress={() => Linking.openURL(`tel:${p}`)} />
                <Btn small kind="outline" label="💬 WhatsApp" onPress={() => Linking.openURL(`https://wa.me/245${p}`)} />
              </View>
            </View>
          ))}
          {c.email ? (
            <>
              <Text style={u.strong}>📧 {c.email}</Text>
              <Btn small kind="outline" label="Enviar e-mail" onPress={() => Linking.openURL(`mailto:${c.email}`)} />
            </>
          ) : null}
          <Text style={[u.muted, { marginTop: 6 }]}>Os contactos mudam-se nas configurações do sistema.</Text>
        </Card>
      </Page>
    </AdminLayout>
  );
}
