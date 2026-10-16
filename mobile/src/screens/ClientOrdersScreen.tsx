import React, { useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ClientLayout } from "../components/MerchantTabs";
import { Page, Title, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getMyOrders, cancelMyOrder } from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";
import { ORDER_STATUS, money, formatDate } from "../constants/market";
import { Alert } from "react-native";

type Tab = "current" | "completed" | "cancelled";

const PAY: Record<string, { label: string; color: string }> = {
  PAGO: { label: "Pago", color: "#2E7D32" },
  AGUARDA_CONFIRMACAO: { label: "A aguardar confirmação", color: "#F9A825" },
  POR_PAGAR: { label: "Por pagar", color: "#757575" },
};

export default function ClientOrdersScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>("current");
  const loader = useLoader(() => getMyOrders(tab), { count: 0, groups: [] as any[] }, [tab]);
  const groups: any[] = loader.data.groups;

  // Atualiza a lista sempre que volta a esta tela
  useFocusEffect(
    React.useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab])
  );

  function cancel(order: any) {
    Alert.alert("Cancelar encomenda", `Cancelar o pedido ${order.number}?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Cancelar pedido",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelMyOrder(order.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível cancelar."));
          }
        },
      },
    ]);
  }

  return (
    <ClientLayout active="ClientOrders">
      <Page loader={loader}>
        <Title>📦 Minhas encomendas</Title>

        <View style={u.row}>
          <Chip label="Atuais" active={tab === "current"} onPress={() => setTab("current")} />
          <Chip label="Concluídas" active={tab === "completed"} onPress={() => setTab("completed")} />
          <Chip label="Canceladas" active={tab === "cancelled"} onPress={() => setTab("cancelled")} />
        </View>

        <View style={u.row}>
          <Btn small kind="outline" label="💳 Pagamentos" onPress={() => navigation.navigate("ClientPayments")} />
          <Btn small kind="outline" label="⭐ Minhas avaliações" onPress={() => navigation.navigate("ClientMyReviews")} />
        </View>

        {groups.length === 0 ? (
          <>
            <Empty
              text={
                tab === "current"
                  ? "Não tem encomendas em curso."
                  : tab === "completed"
                  ? "Ainda não tem encomendas concluídas."
                  : "Não tem encomendas canceladas."
              }
            />
            {tab === "current" ? <Btn label="🔎 Explorar produtos" onPress={() => navigation.navigate("ClientExplore")} /> : null}
          </>
        ) : (
          groups.map((g) => (
            <View key={g.groupId}>
              {g.orders.length > 1 ? (
                <Text style={[u.muted, { marginTop: 12 }]}>
                  Encomenda de {formatDate(g.createdAt)} com {g.orders.length} vendedores · {money(g.total)}
                </Text>
              ) : null}

              {g.orders.map((o: any) => {
                const st = ORDER_STATUS[o.status];
                const pay = PAY[o.paymentStatus];
                const step = o.tracking?.steps?.[o.tracking.current];
                return (
                  <Card key={o.id}>
                    <View style={u.between}>
                      <Text style={u.strong}>{o.number}</Text>
                      <Badge label={st?.label ?? o.status} color={st?.color ?? "#757575"} />
                    </View>
                    <Text style={u.muted}>
                      {formatDate(o.createdAt)} · {o.seller.name}
                    </Text>

                    {o.items.map((i: any) => (
                      <Text key={i.id} style={{ marginTop: 3 }}>
                        {i.quantity} × {i.title} — {money(i.lineTotal)}
                      </Text>
                    ))}

                    <Text style={[u.strong, { marginTop: 8 }]}>
                      Total: {money(o.total)}
                      {o.shipping > 0 ? ` (inclui ${money(o.shipping)} de ${o.isPickup ? "recolha" : "transporte"})` : ""}
                    </Text>

                    <View style={[u.row, { marginTop: 6 }]}>
                      <Badge label={pay?.label ?? o.paymentStatus} color={pay?.color ?? "#757575"} />
                    </View>

                    {!o.tracking.cancelled && step ? <Text style={[u.muted, { marginTop: 6 }]}>📍 {step.label}</Text> : null}

                    <View style={u.row}>
                      <Btn small label="Acompanhar / detalhes" onPress={() => navigation.navigate("ClientOrder", { id: o.id })} />
                      {o.actions.canPay ? (
                        <Btn small kind="outline" label="💳 Informar pagamento" onPress={() => navigation.navigate("ClientOrder", { id: o.id })} />
                      ) : null}
                      {o.actions.hasReceipt ? (
                        <Btn small kind="outline" label="🧾 Recibo" onPress={() => navigation.navigate("ClientReceipt", { id: o.id })} />
                      ) : null}
                      {o.actions.canReview ? (
                        <Btn small kind="outline" label="⭐ Avaliar" onPress={() => navigation.navigate("ClientReview", { orderId: o.id })} />
                      ) : null}
                      {o.actions.canCancel ? <Btn small kind="danger" label="Cancelar" onPress={() => cancel(o)} /> : null}
                    </View>
                  </Card>
                );
              })}
            </View>
          ))
        )}
      </Page>
    </ClientLayout>
  );
}
