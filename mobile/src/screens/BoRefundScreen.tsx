import React, { useCallback, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getBoRefund, decideBoRefund, payBoRefund } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan, getAdminMeCache } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { REFUND_COLOR } from "../constants/backofficeFinance";
import { humanize } from "../constants/agentOps";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDateTime } from "../constants/market";

type Panel = "" | "approve" | "refuse" | "pay";

export default function BoRefundScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoRefund(id), null as any, [id]);
  const d: any = loader.data;
  const me = getAdminMeCache();

  const [panel, setPanel] = useState<Panel>("");
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
      <AdminLayout active="BoFinance">
        <Page loader={loader}>
          <Title>Reembolso</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const r = d.refund;
  const canManage = adminCan("finance.manage");
  const ownRequest = !!me && r.requestedBy === me.userId && me.level !== "SUPER_ADMIN";

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

  function submit() {
    const note = text.trim();

    if (panel === "approve") {
      return Alert.alert("Aprovar o reembolso", `Aprovar a devolução de ${money(r.amount)} ao comprador? Ele e o vendedor são avisados.`, [
        { text: "Não", style: "cancel" },
        { text: "Aprovar", onPress: () => run(() => decideBoRefund(id, { approve: true, note: note || undefined }), "Não foi possível aprovar.") },
      ]);
    }
    if (panel === "refuse") {
      if (note.length < 3) return Alert.alert("Atenção", "Explique porque o reembolso é recusado. O comprador vê.");
      return run(() => decideBoRefund(id, { approve: false, note }), "Não foi possível recusar.");
    }
    if (note.length < 3) return Alert.alert("Atenção", "Escreva como foi pago (ex: dinheiro móvel, referência).");
    return Alert.alert("Registar o pagamento", `Confirma que já devolveu ${money(r.amount)} a ${r.buyerName}? O app não paga: registe só depois de pagar.`, [
      { text: "Ainda não", style: "cancel" },
      { text: "Sim, paguei", onPress: () => run(() => payBoRefund(id, note), "Não foi possível registar o pagamento.") },
    ]);
  }

  return (
    <AdminLayout active="BoFinance">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>↩️ Reembolso de {money(r.amount)}</Title>
          </View>
          <Badge label={labelOf(catalog.refundStatus, r.status) || r.status} color={REFUND_COLOR[r.status] ?? "#757575"} />
        </View>

        <Card>
          <Text style={u.strong}>🛒 {r.buyerName}</Text>
          <Text style={u.muted}>
            Encomenda {r.orderCode}
            {r.orderTotal !== null ? ` · valor da encomenda ${money(r.orderTotal)}` : ""}
          </Text>
          <Text style={{ marginTop: 6, lineHeight: 20 }}>{r.reason}</Text>
          <Text style={[u.muted, { marginTop: 4 }]}>
            Pedido por {r.requestedName} em {formatDateTime(r.createdAt)}
          </Text>
          <View style={u.row}>
            <Btn small kind="outline" label="Abrir a encomenda" onPress={() => navigation.navigate("BoOrder", { id: r.orderId })} />
            <Btn small kind="outline" label="Ver o comprador" onPress={() => navigation.navigate("BoUser", { id: r.buyerId })} />
            <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: r.buyerId, userName: r.buyerName })} />
          </View>
        </Card>

        {d.dispute ? (
          <Card>
            <Text style={u.strong}>⚖️ Vem de uma disputa</Text>
            {d.dispute.decision ? <Text style={u.muted}>Decisão: {labelOf(catalog.disputeDecisions, d.dispute.decision) || d.dispute.decision}</Text> : null}
            {d.dispute.decisionNote ? <Text style={{ marginTop: 2 }}>{d.dispute.decisionNote}</Text> : null}
            <Btn small kind="outline" label="Abrir a disputa" onPress={() => navigation.navigate("BoDispute", { id: d.dispute.id })} />
          </Card>
        ) : null}

        {r.decidedAt ? (
          <Card>
            <Text style={u.strong}>
              {r.status === "RECUSADO" ? "❌ Recusado" : "✅ Aprovado"} por {r.decidedName}
            </Text>
            {r.decisionNote ? <Text style={{ marginTop: 2 }}>{r.decisionNote}</Text> : null}
            <Text style={u.muted}>{formatDateTime(r.decidedAt)}</Text>
          </Card>
        ) : null}

        {r.paidAt ? (
          <Card>
            <Text style={{ color: "#2E7D32", fontWeight: "bold" }}>💸 Pago por {r.paidName}</Text>
            {r.paidNote ? <Text style={{ marginTop: 2 }}>{r.paidNote}</Text> : null}
            <Text style={u.muted}>{formatDateTime(r.paidAt)}</Text>
          </Card>
        ) : null}

        {canManage && r.status === "PENDENTE" ? (
          <>
            <SubTitle>Decisão</SubTitle>
            {ownRequest ? (
              <Card>
                <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>Este pedido foi criado por si</Text>
                <Text style={u.muted}>Tem de ser decidido por outro administrador. Só um Super administrador pode decidir os seus próprios pedidos.</Text>
              </Card>
            ) : (
              <View style={u.row}>
                <Btn small label="✅ Aprovar" onPress={() => open("approve")} />
                <Btn small kind="danger" label="Recusar" onPress={() => open("refuse")} />
              </View>
            )}
          </>
        ) : null}

        {canManage && r.status === "APROVADO" ? (
          <>
            <SubTitle>Pagamento</SubTitle>
            <Text style={u.muted}>Devolva o dinheiro ao comprador fora do app (dinheiro ou dinheiro móvel) e depois registe aqui como pagou.</Text>
            <Btn label="💸 Registar o pagamento" onPress={() => open("pay")} />
          </>
        ) : null}

        {panel ? (
          <Card>
            <Text style={u.strong}>{panel === "approve" ? "Aprovar o reembolso" : panel === "refuse" ? "Recusar o reembolso" : "Registar o pagamento"}</Text>
            <Field
              label={panel === "pay" ? "Como foi pago (obrigatório)" : panel === "refuse" ? "Motivo (o comprador vê)" : "Nota (opcional)"}
              value={text}
              onChangeText={setText}
              multiline
              placeholder={panel === "pay" ? "Ex: Dinheiro móvel, ref. 123456" : ""}
            />
            <View style={u.row}>
              <Btn kind={panel === "refuse" ? "danger" : "primary"} label={busy ? "A guardar..." : "Confirmar"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        <SubTitle>💳 Pagamentos da encomenda</SubTitle>
        {d.payments.length === 0 ? (
          <Text style={u.muted}>Não há pagamento registado nesta encomenda.</Text>
        ) : (
          d.payments.map((p: any, i: number) => (
            <Card key={i}>
              <Text style={u.strong}>{p.amount !== null && p.amount !== undefined ? money(p.amount) : "Pagamento"}</Text>
              <Text style={u.muted}>
                {humanize(p.method)} · {humanize(p.status)}
                {p.reference ? ` · ref. ${p.reference}` : ""}
              </Text>
            </Card>
          ))
        )}

        {d.otherRefunds.length > 0 ? (
          <>
            <SubTitle>Outros reembolsos desta encomenda</SubTitle>
            {d.otherRefunds.map((o: any) => (
              <Card key={o.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{money(o.amount)}</Text>
                  <Badge label={labelOf(catalog.refundStatus, o.status) || o.status} color={REFUND_COLOR[o.status] ?? "#757575"} />
                </View>
                <Btn small kind="outline" label="Abrir" onPress={() => navigation.push("BoRefund", { id: o.id })} />
              </Card>
            ))}
          </>
        ) : null}
      </Page>
    </AdminLayout>
  );
}
