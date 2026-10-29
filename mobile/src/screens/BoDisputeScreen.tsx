import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getBoDispute, assignBoDispute, noteBoDispute, messageBoDispute, resolveBoDispute } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { humanize } from "../constants/agentOps";
import {
  DISPUTE_DECISION_HELP,
  DISPUTE_DECISION_ICON,
  DISPUTE_EVENT_ICON,
  DISPUTE_REASON_ICON,
  DISPUTE_STATUS_COLOR,
  ORDER_STAGE_LABEL,
} from "../constants/backofficeOrders";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

type Panel = "" | "note" | "message" | "resolve";

export default function BoDisputeScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoDispute(id), null as any, [id]);
  const d: any = loader.data;

  const [panel, setPanel] = useState<Panel>("");
  const [decision, setDecision] = useState("");
  const [refund, setRefund] = useState("");
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
          <Title>Disputa</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const x = d.dispute;
  const canManage = adminCan("orders.manage");
  const orderTotal = d.order?.total ?? null;
  const resolved = x.status === "RESOLVIDA";

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setText("");
    setDecision("");
    setRefund("");
  }

  async function run(work: () => Promise<any>, fail: string) {
    setBusy(true);
    try {
      loader.setData(await work());
      setPanel("");
      setText("");
      setDecision("");
      setRefund("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const note = text.trim();

    if (panel === "note") {
      if (note.length < 3) return Alert.alert("Atenção", "Escreva a nota.");
      return run(() => noteBoDispute(id, note), "Não foi possível guardar a nota.");
    }
    if (panel === "message") {
      if (note.length < 5) return Alert.alert("Atenção", "Escreva a mensagem (pelo menos 5 letras).");
      return run(() => messageBoDispute(id, note), "Não foi possível enviar a mensagem.");
    }

    if (!decision) return Alert.alert("Atenção", "Escolha a decisão.");
    if (note.length < 5) return Alert.alert("Atenção", "Explique a decisão (pelo menos 5 letras). As duas partes veem esta explicação.");

    const body: Record<string, any> = { decision, note };
    if (decision === "FAVOR_COMPRADOR" && refund.trim()) {
      const n = Number(refund.replace(",", "."));
      if (isNaN(n) || n <= 0) return Alert.alert("Atenção", "O valor a devolver deve ser maior que zero.");
      if (orderTotal !== null && n > orderTotal) return Alert.alert("Atenção", `O valor não pode passar o valor da encomenda (${money(orderTotal)}).`);
      body.refundAmount = n;
    }

    const label = labelOf(catalog.disputeDecisions, decision);
    return Alert.alert(`${label}?`, "As duas partes recebem a decisão e a explicação. Não se pode desfazer.", [
      { text: "Não", style: "cancel" },
      { text: "Decidir", onPress: () => run(() => resolveBoDispute(id, body), "Não foi possível guardar a decisão.") },
    ]);
  }

  function party(title: string, p: any) {
    if (!p) return null;
    const wa = whatsappUrl(p.phone);
    return (
      <Card>
        <Text style={u.muted}>{title}</Text>
        <Text style={u.strong}>{p.name}</Text>
        <Text style={u.muted}>{p.roleName}</Text>
        <View style={u.row}>
          <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: p.id })} />
          <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: p.id, userName: p.name })} />
          {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
          {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
        </View>
      </Card>
    );
  }

  return (
    <AdminLayout active="BoOrders">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>
              {DISPUTE_REASON_ICON[x.reason] ?? "⚖️"} {labelOf(catalog.disputeReasons, x.reason) || x.reason}
            </Title>
          </View>
          <Badge label={labelOf(catalog.disputeStatus, x.status) || x.status} color={DISPUTE_STATUS_COLOR[x.status] ?? "#757575"} />
        </View>
        <Text style={u.muted}>
          Aberta em {formatDateTime(x.createdAt)}
          {x.assignedName ? ` · 🙋 ${x.assignedName}` : ""}
        </Text>

        {d.otherDisputesAgainst > 0 ? (
          <Card>
            <Text style={{ color: "#6A1B9A", fontWeight: "bold" }}>📚 A outra parte tem mais {d.otherDisputesAgainst} disputa(s) contra si</Text>
            <Text style={u.muted}>Veja o histórico dela antes de decidir.</Text>
          </Card>
        ) : null}

        <SubTitle>O que foi relatado</SubTitle>
        <Card>
          <Text style={{ lineHeight: 21 }}>{x.description}</Text>
        </Card>

        {d.order ? (
          <Card>
            <Text style={u.strong}>📦 Encomenda {x.orderCode}</Text>
            <Text style={u.muted}>
              {money(d.order.total)} · {ORDER_STAGE_LABEL[d.order.stage] ?? d.order.stage}
            </Text>
            {d.payments.map((p: any, i: number) => (
              <Text key={i} style={u.muted}>
                💳 {p.amount !== null ? money(p.amount) : "Pagamento"} · {humanize(p.method)} · {humanize(p.status)}
                {p.reference ? ` · ref. ${p.reference}` : ""}
              </Text>
            ))}
            <Btn small kind="outline" label="Abrir a encomenda" onPress={() => navigation.navigate("BoOrder", { id: x.orderId })} />
          </Card>
        ) : null}

        {party("Quem abriu a disputa", d.openedBy)}
        {party("A outra parte", d.against)}

        {canManage && !resolved ? (
          <>
            <SubTitle>Ações</SubTitle>
            <View style={u.row}>
              {x.status === "ABERTA" || !x.assignedName ? <Btn small label="🙋 Assumir" onPress={() => run(() => assignBoDispute(id), "Não foi possível assumir a disputa.")} disabled={busy} /> : null}
              <Btn small kind="outline" label="💬 Escrever às duas partes" onPress={() => open("message")} />
              <Btn small kind="outline" label="🔒 Nota interna" onPress={() => open("note")} />
              <Btn small label="⚖️ Decidir" onPress={() => open("resolve")} />
            </View>
          </>
        ) : null}

        {panel === "message" ? (
          <Card>
            <Text style={u.strong}>Mensagem da equipa</Text>
            <Text style={u.muted}>As duas partes veem esta mensagem na disputa e recebem uma notificação.</Text>
            <Field value={text} onChangeText={setText} multiline placeholder="Ex: Peço ao vendedor que envie a foto do produto antes do embrulho." />
            <View style={u.row}>
              <Btn label={busy ? "A enviar..." : "Enviar"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        {panel === "note" ? (
          <Card>
            <Field label="Nota interna (só a equipa vê)" value={text} onChangeText={setText} multiline placeholder="Ex: O comprador já teve 2 disputas parecidas." />
            <View style={u.row}>
              <Btn label={busy ? "A guardar..." : "Guardar nota"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        {panel === "resolve" ? (
          <Card>
            <Text style={u.strong}>Decidir a disputa</Text>
            <ChipGroup
              label="Decisão"
              options={catalog.disputeDecisions.map((r) => ({ ...r, icon: DISPUTE_DECISION_ICON[r.value] }))}
              value={decision}
              onChange={setDecision}
            />
            {decision ? <Text style={[u.muted, { marginTop: 4 }]}>{DISPUTE_DECISION_HELP[decision]}</Text> : null}

            {decision === "FAVOR_COMPRADOR" ? (
              <Field
                label={`Valor a devolver em FCFA (opcional${orderTotal !== null ? `, até ${Math.round(orderTotal)}` : ""})`}
                value={refund}
                onChangeText={(v) => setRefund(v.replace(/[^\d.,]/g, ""))}
                keyboardType="numeric"
                placeholder="Ex: 15000"
              />
            ) : null}

            <Field label="Explicação (as duas partes veem)" value={text} onChangeText={setText} multiline placeholder="Ex: O vendedor confirmou que o produto não saiu. Devolução integral." />
            <View style={u.row}>
              <Btn label={busy ? "A guardar..." : "Confirmar decisão"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        {resolved ? (
          <Card>
            <Text style={u.strong}>
              {DISPUTE_DECISION_ICON[x.decision] ?? "⚖️"} {labelOf(catalog.disputeDecisions, x.decision) || "Decidida"}
              {x.decidedName ? ` por ${x.decidedName}` : ""}
            </Text>
            {x.decisionNote ? <Text style={{ marginTop: 4 }}>{x.decisionNote}</Text> : null}
            {x.refundAmount ? <Text style={{ marginTop: 4, color: colors.primary, fontWeight: "bold" }}>↩️ Devolução decidida: {money(x.refundAmount)}</Text> : null}
            {x.decidedAt ? <Text style={u.muted}>{formatDateTime(x.decidedAt)}</Text> : null}
            {x.refundAmount && adminCan("finance.manage") ? (
              <Btn small label="Criar o pedido de reembolso" onPress={() => navigation.navigate("BoRefunds", { prefill: { orderId: x.orderId, disputeId: x.id, amount: x.refundAmount } })} />
            ) : null}
          </Card>
        ) : null}

        <SubTitle>Conversa e andamento ({d.events.length})</SubTitle>
        {d.events.map((e: any) => (
          <Card key={e.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                {DISPUTE_EVENT_ICON[e.kind] ?? "•"} {e.authorName}
              </Text>
              {e.internal ? <Badge label="Interna" color="#757575" /> : e.kind === "MENSAGEM_EQUIPA" || e.kind === "DECISAO" ? <Badge label="Equipa" color="#6A1B9A" /> : null}
            </View>
            {e.message ? <Text style={{ marginTop: 4, lineHeight: 20 }}>{e.message}</Text> : null}
            <Text style={u.muted}>{formatDateTime(e.createdAt)}</Text>
          </Card>
        ))}
      </Page>
    </AdminLayout>
  );
}
