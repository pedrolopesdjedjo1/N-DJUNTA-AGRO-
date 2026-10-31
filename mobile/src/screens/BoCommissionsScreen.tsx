import React, { useCallback, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { listBoCommissions, getBoCommissionRows, payBoCommissions, voidBoCommission } from "../api/backoffice";
import { useAgentCatalog } from "../utils/agentCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { COMMISSION_COLOR, COMMISSION_ICON } from "../constants/agentWork";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

const EMPTY = { platformPercent: 0, totals: { pending: 0, paid: 0 }, items: [] as any[] };

// Comissões dos agentes: ver, registar o pagamento e anular
export default function BoCommissionsScreen({ navigation }: any) {
  const agentCatalog = useAgentCatalog();
  const canManage = adminCan("finance.manage");

  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const loader = useLoader(() => listBoCommissions({ q }), EMPTY, [q]);
  const d: any = loader.data;

  const [openId, setOpenId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [rowsBusy, setRowsBusy] = useState(false);
  const [payNote, setPayNote] = useState("");
  const [voidId, setVoidId] = useState("");
  const [voidNote, setVoidNote] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function loadRows(agentId: string) {
    setRowsBusy(true);
    try {
      setRows(await getBoCommissionRows(agentId));
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível carregar as comissões."));
    } finally {
      setRowsBusy(false);
    }
  }

  async function toggle(agentId: string) {
    if (openId === agentId) {
      setOpenId("");
      return;
    }
    setOpenId(agentId);
    setPayNote("");
    setVoidId("");
    setRows([]);
    await loadRows(agentId);
  }

  function pay(item: any) {
    Alert.alert(
      "Registar o pagamento",
      `Confirma que pagou ${money(item.pending)} (${item.pendingEntries} comissão(ões)) a ${item.name}? O agente recebe um aviso. O app não paga: registe só depois de pagar.`,
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, paguei",
          onPress: async () => {
            setBusy(true);
            try {
              await payBoCommissions(item.agentId, payNote.trim() || undefined);
              setPayNote("");
              await loadRows(item.agentId);
              loader.reload();
            } catch (e) {
              Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível registar o pagamento."));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  async function voidOne(item: any) {
    if (voidNote.trim().length < 3) {
      Alert.alert("Atenção", "Explique o motivo da anulação. O agente vê.");
      return;
    }

    setBusy(true);
    try {
      await voidBoCommission(voidId, voidNote.trim());
      setVoidId("");
      setVoidNote("");
      await loadRows(item.agentId);
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível anular a comissão."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout active="BoFinance">
      <Page loader={loader}>
        <Title>🤝 Comissões dos agentes</Title>
        <Text style={u.muted}>O que cada agente tem a receber. Pague fora do app e registe aqui o pagamento.</Text>

        <View style={u.grid}>
          {(
            [
              ["⏳ A pagar", money(d.totals.pending)],
              ["✅ Já pago", money(d.totals.paid)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 16 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <Field placeholder="Procurar agente" value={text} onChangeText={setText} onSubmitEditing={() => setQ(text.trim())} returnKeyType="search" />

        {d.items.length === 0 && !loader.loading ? (
          <Empty text="Ainda não há comissões. Elas aparecem quando um agente com comissão tem encomendas concluídas." />
        ) : (
          d.items.map((i: any) => (
            <Card key={i.agentId}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{i.name}</Text>
                <Badge label={`${i.rate}%`} color="#00838F" />
              </View>
              <Text style={u.muted}>
                ⏳ A pagar: {money(i.pending)} ({i.pendingEntries}) · ✅ Pago: {money(i.paid)}
                {i.voided > 0 ? ` · ${i.voided} anulada(s)` : ""}
              </Text>
              <View style={u.row}>
                <Btn small label={openId === i.agentId ? "Fechar" : "Ver comissões"} onPress={() => toggle(i.agentId)} />
                <Btn small kind="outline" label="Abrir o agente" onPress={() => navigation.navigate("AdminAgent", { userId: i.agentId })} />
              </View>

              {openId === i.agentId ? (
                <View style={{ marginTop: 8 }}>
                  {i.pending > 0 && canManage ? (
                    <>
                      <Field label="Como pagou (opcional)" value={payNote} onChangeText={setPayNote} placeholder="Ex: Dinheiro móvel, ref. 123456" />
                      <Btn label={busy ? "A registar..." : `Registar o pagamento de ${money(i.pending)}`} onPress={() => pay(i)} disabled={busy} />
                    </>
                  ) : i.pending > 0 ? (
                    <Text style={u.muted}>Só quem tem a permissão financeira regista pagamentos.</Text>
                  ) : (
                    <Text style={u.muted}>Não há comissões por pagar a este agente.</Text>
                  )}

                  <SubTitle>Comissões</SubTitle>
                  {rowsBusy && rows.length === 0 ? <Text style={u.muted}>A carregar...</Text> : null}
                  {rows.map((r) => (
                    <Card key={r.id}>
                      <View style={u.between}>
                        <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{money(r.amount)}</Text>
                        <Badge label={labelOf(agentCatalog.commissionStatus, r.status) || r.status} color={COMMISSION_COLOR[r.status] ?? "#757575"} />
                      </View>
                      <Text style={u.muted}>
                        {money(r.base)} × {r.rate}% · {COMMISSION_ICON[r.reason] ?? ""} {labelOf(agentCatalog.commissionReasons, r.reason) || r.reason}
                      </Text>
                      <Text style={u.muted}>
                        Encomenda {r.orderCode} · concluída em {formatDate(r.orderCompletedAt)}
                      </Text>
                      {r.status === "PAGO" && r.paidAt ? <Text style={{ color: "#2E7D32" }}>Paga em {formatDate(r.paidAt)}</Text> : null}
                      {r.note ? <Text style={u.muted}>📝 {r.note}</Text> : null}

                      <View style={u.row}>
                        <Btn small kind="outline" label="Abrir a encomenda" onPress={() => navigation.navigate("BoOrder", { id: r.orderId })} />
                        {r.status === "PENDENTE" && canManage ? (
                          <Btn small kind="danger" label={voidId === r.id ? "Cancelar" : "Anular"} onPress={() => { setVoidId(voidId === r.id ? "" : r.id); setVoidNote(""); }} />
                        ) : null}
                      </View>
                      {voidId === r.id ? (
                        <View style={{ marginTop: 6 }}>
                          <Field label="Motivo (o agente vê)" value={voidNote} onChangeText={setVoidNote} multiline placeholder="Ex: A encomenda foi devolvida." />
                          <Btn kind="danger" label={busy ? "A anular..." : "Confirmar anulação"} onPress={() => voidOne(i)} disabled={busy} />
                        </View>
                      ) : null}
                    </Card>
                  ))}
                </View>
              ) : null}
            </Card>
          ))
        )}

        <Text style={[u.muted, { marginTop: 10 }]}>A comissão de cada agente define-se na ficha dele (Gestão de agentes). A comissão da plataforma muda-se nas configurações.</Text>
      </Page>
    </AdminLayout>
  );
}
