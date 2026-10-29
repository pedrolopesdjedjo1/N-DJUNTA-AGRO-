import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getBoOrder, noteBoOrder, notifyBoOrder } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { STAGE_COLOR, STAGE_ICON, humanize } from "../constants/agentOps";
import { DISPUTE_STATUS_COLOR, ORDER_HISTORY_ICON, ORDER_PROBLEM_COLOR, ORDER_PROBLEM_ICON, ORDER_STAGE_LABEL } from "../constants/backofficeOrders";
import { REPORT_STATUS_COLOR } from "../constants/backofficeModeration";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate, formatDateTime } from "../constants/market";

type Panel = "" | "note" | "notify";

const NOTIFY_OPTIONS = [
  { value: "BUYER", label: "O comprador" },
  { value: "SELLER", label: "O vendedor" },
  { value: "BOTH", label: "Os dois" },
];

export default function BoOrderScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoOrder(id), null as any, [id]);
  const d: any = loader.data;

  const [panel, setPanel] = useState<Panel>("");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!d) {
    return (
      <AdminLayout active="BoOrders">
        <Page loader={loader}>
          <Title>Encomenda</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const o = d.order;
  const canManage = adminCan("orders.manage");
  const finished = ["CONCLUIDA", "ENTREGUE", "CANCELADA"].includes(o.stage);
  const openDispute = (d.disputes as any[]).find((x) => x.status !== "RESOLVIDA");

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setText("");
    setTo("");
  }

  async function run(work: () => Promise<any>, fail: string) {
    setBusy(true);
    try {
      loader.setData(await work());
      setPanel("");
      setText("");
      setTo("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (panel === "note") {
      if (text.trim().length < 3) return Alert.alert("Atenção", "Escreva a nota.");
      return run(() => noteBoOrder(id, text.trim()), "Não foi possível guardar a nota.");
    }
    if (!to) return Alert.alert("Atenção", "Escolha quem avisar.");
    if (text.trim().length < 5) return Alert.alert("Atenção", "Escreva a mensagem (pelo menos 5 letras).");
    return run(() => notifyBoOrder(id, { to, message: text.trim() }), "Não foi possível enviar o aviso.");
  }

  function person(title: string, p: any, filter: "buyerId" | "sellerId") {
    if (!p) return null;
    const wa = whatsappUrl(p.phone);
    return (
      <Card>
        <Text style={u.muted}>{title}</Text>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
            {p.name} {p.isVerified ? "✅" : ""}
          </Text>
          {!p.isActive ? <Badge label="Conta inativa" color="#C62828" /> : null}
        </View>
        <Text style={u.muted}>
          {p.roleName}
          {p.location ? ` · 📍 ${p.location}` : ""}
        </Text>
        <View style={u.row}>
          <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: p.id })} />
          <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: p.id, userName: p.name })} />
          {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
          {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
        </View>
        <Btn small kind="outline" label={filter === "buyerId" ? "Outras compras dele(a)" : "Outras vendas dele(a)"} onPress={() => navigation.navigate("BoOrders", { [filter]: p.id })} />
      </Card>
    );
  }

  return (
    <AdminLayout active="BoOrders">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>
              {STAGE_ICON[o.stage] ?? "📦"} Encomenda {o.code}
            </Title>
          </View>
          <Badge label={ORDER_STAGE_LABEL[o.stage] ?? o.stage} color={STAGE_COLOR[o.stage] ?? "#757575"} />
        </View>
        <Text style={u.muted}>Estado no sistema: {humanize(o.status)}</Text>

        {d.problems.length > 0 ? (
          <Card>
            <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>⚠️ Esta encomenda tem problemas</Text>
            {d.problems.map((p: string) => (
              <Text key={p} style={{ marginTop: 4, color: ORDER_PROBLEM_COLOR[p] ?? "#EF6C00" }}>
                {ORDER_PROBLEM_ICON[p] ?? "•"} {labelOf(catalog.orderProblems, p) || p}
              </Text>
            ))}
          </Card>
        ) : null}

        <Card>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>{money(o.total)}</Text>
          {o.shippingCost ? <Text style={u.muted}>🚚 Transporte incluído: {money(o.shippingCost)}</Text> : null}
          {o.paymentMethod ? <Text style={u.muted}>💳 Pagamento: {humanize(o.paymentMethod)}</Text> : null}
          {o.desiredDate ? <Text style={u.muted}>🗓️ Data pretendida: {formatDate(o.desiredDate)}</Text> : null}
          <Text style={u.muted}>Feita em {formatDateTime(o.createdAt)}</Text>
          <Text style={u.muted}>Última alteração: {formatDateTime(o.updatedAt)}</Text>
          {!finished && o.idleDays >= 1 ? <Text style={{ color: "#EF6C00", marginTop: 4 }}>⏳ Sem andamento há {o.idleDays} dia(s)</Text> : null}
          {o.buyerConfirmedAt ? <Text style={{ color: "#2E7D32", marginTop: 4 }}>✅ O comprador confirmou a receção em {formatDate(o.buyerConfirmedAt)}</Text> : null}
        </Card>

        {person("Comprador", d.buyer, "buyerId")}
        {person("Vendedor", d.seller, "sellerId")}

        <SubTitle>Produtos ({d.items.length})</SubTitle>
        {d.items.length === 0 ? (
          <Text style={u.muted}>Sem produtos para mostrar.</Text>
        ) : (
          <Card>
            {d.items.map((i: any) => (
              <View key={i.id} style={[u.between, { marginTop: 4 }]}>
                <Text style={{ flex: 1, marginRight: 8 }}>
                  {i.quantity}× {i.title}
                </Text>
                <Text style={u.muted}>{i.unitPrice !== null && i.unitPrice !== undefined ? money(Number(i.unitPrice) * Number(i.quantity)) : ""}</Text>
              </View>
            ))}
            {d.items[0]?.productId ? (
              <Btn small kind="outline" label="Ver o primeiro produto" onPress={() => navigation.navigate("BoProduct", { id: d.items[0].productId })} />
            ) : null}
          </Card>
        )}

        <SubTitle>💳 Pagamentos ({d.payments.length})</SubTitle>
        {d.payments.length === 0 ? (
          <Text style={u.muted}>Ainda não há pagamento registado.</Text>
        ) : (
          d.payments.map((p: any) => (
            <Card key={p.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.amount !== null && p.amount !== undefined ? money(p.amount) : "Pagamento"}</Text>
                <Badge label={humanize(p.status)} color="#1565C0" />
              </View>
              <Text style={u.muted}>
                {humanize(p.method)}
                {p.reference ? ` · ref. ${p.reference}` : ""}
              </Text>
              {p.createdAt ? <Text style={u.muted}>{formatDateTime(p.createdAt)}</Text> : null}
            </Card>
          ))
        )}

        {d.deliveries.length > 0 ? (
          <>
            <SubTitle>🚚 Entregas</SubTitle>
            {d.deliveries.map((x: any) => (
              <Card key={x.id}>
                <Text style={u.strong}>{humanize(x.status)}</Text>
                <Text style={u.muted}>🚛 {x.transporter ? x.transporter.name : "Ainda sem transportador"}</Text>
                {x.lastLocation ? <Text style={u.muted}>📍 {x.lastLocation}</Text> : null}
                {adminCan("transport.view") ? <Btn small kind="outline" label="Ver a entrega" onPress={() => navigation.navigate("BoDelivery", { id: x.id })} /> : null}
              </Card>
            ))}
          </>
        ) : null}

        {d.disputes.length > 0 ? (
          <>
            <SubTitle>⚖️ Disputas ({d.disputes.length})</SubTitle>
            {d.disputes.map((x: any) => (
              <Card key={x.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{labelOf(catalog.disputeReasons, x.reason) || x.reason}</Text>
                  <Badge label={labelOf(catalog.disputeStatus, x.status) || x.status} color={DISPUTE_STATUS_COLOR[x.status] ?? "#757575"} />
                </View>
                <Text style={u.muted}>{formatDateTime(x.createdAt)}</Text>
                <Btn small kind="outline" label="Abrir a disputa" onPress={() => navigation.navigate("BoDispute", { id: x.id })} />
              </Card>
            ))}
          </>
        ) : null}

        {d.reports.length > 0 ? (
          <>
            <SubTitle>🚩 Denúncias ({d.reports.length})</SubTitle>
            {d.reports.map((r: any) => (
              <Card key={r.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{labelOf(catalog.reportCategories, r.category) || r.category}</Text>
                  <Badge label={labelOf(catalog.reportStatus, r.status) || r.status} color={REPORT_STATUS_COLOR[r.status] ?? "#757575"} />
                </View>
                <Text style={{ marginTop: 2 }} numberOfLines={2}>
                  {r.description}
                </Text>
                {adminCan("reports.view") ? <Btn small kind="outline" label="Abrir a denúncia" onPress={() => navigation.navigate("BoReport", { id: r.id })} /> : null}
              </Card>
            ))}
          </>
        ) : null}

        {d.agentCases.length > 0 ? (
          <>
            <SubTitle>🤝 Chamados de agentes ({d.agentCases.length})</SubTitle>
            {d.agentCases.map((c: any) => (
              <Card key={c.id}>
                <Text style={u.strong}>{c.title}</Text>
                <Text style={u.muted}>{humanize(c.status)}</Text>
                {adminCan("support.reply", "support.view") ? <Btn small kind="outline" label="Abrir o chamado" onPress={() => navigation.navigate("AdminAgentCase", { id: c.id })} /> : null}
              </Card>
            ))}
          </>
        ) : null}

        {canManage ? (
          <>
            <SubTitle>Ações da equipa</SubTitle>
            <View style={u.row}>
              <Btn small kind="outline" label="📝 Juntar nota interna" onPress={() => open("note")} />
              <Btn small kind="outline" label="📣 Avisar os participantes" onPress={() => open("notify")} />
              {adminCan("finance.manage") ? <Btn small kind="outline" label="↩️ Criar reembolso" onPress={() => navigation.navigate("BoRefunds", { prefill: { orderId: id } })} /> : null}
              {openDispute ? <Btn small label="⚖️ Ver a disputa aberta" onPress={() => navigation.navigate("BoDispute", { id: openDispute.id })} /> : null}
            </View>
            <Text style={u.muted}>A equipa não cancela encomendas nem muda o estado: isso faz-se nas telas do vendedor, que cuida do stock.</Text>
          </>
        ) : null}

        {panel === "note" ? (
          <Card>
            <Field label="Nota interna (só a equipa vê)" value={text} onChangeText={setText} multiline placeholder="Ex: Falei com o vendedor, vai enviar amanhã." />
            <View style={u.row}>
              <Btn label={busy ? "A guardar..." : "Guardar nota"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        {panel === "notify" ? (
          <Card>
            <ChipGroup label="Quem avisar" options={NOTIFY_OPTIONS} value={to} onChange={setTo} />
            <Field label="Mensagem (recebem como notificação)" value={text} onChangeText={setText} multiline placeholder="Ex: Lembramos que o prazo de entrega termina amanhã." />
            <View style={u.row}>
              <Btn label={busy ? "A enviar..." : "Enviar aviso"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        {d.notes.length > 0 ? (
          <>
            <SubTitle>📝 Notas da equipa ({d.notes.length})</SubTitle>
            {d.notes.map((n: any) => (
              <Card key={n.id}>
                <Text style={{ lineHeight: 20 }}>{n.message}</Text>
                <Text style={u.muted}>
                  {n.authorName} · {formatDateTime(n.createdAt)}
                </Text>
              </Card>
            ))}
          </>
        ) : null}

        <SubTitle>Histórico da encomenda</SubTitle>
        {d.history.length === 0 ? (
          <Empty text="Sem registos." />
        ) : (
          d.history.map((h: any, i: number) => (
            <View key={`${h.at}-${i}`} style={{ marginTop: 6 }}>
              <Text>
                {ORDER_HISTORY_ICON[h.kind] ?? "•"} {h.text}
              </Text>
              <Text style={u.muted}>{formatDateTime(h.at)}</Text>
            </View>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
