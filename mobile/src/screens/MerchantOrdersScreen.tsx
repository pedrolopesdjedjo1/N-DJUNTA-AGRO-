import React, { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { MerchantLayout } from "../components/MerchantTabs";
import { Page, Title, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getOrders, setOrderStatus, setOrderPaid } from "../api/orders";
import { getApiErrorMessage } from "../api/errorMessage";
import { ORDER_STATUS, DELIVERY_STATUS, money, formatDate } from "../constants/market";

const TABS = [
  { key: "NOVO", label: "Novos" },
  { key: "ACEITO", label: "Aceites" },
  { key: "EM_PREPARACAO", label: "Em preparação" },
  { key: "ENVIADO", label: "Enviados" },
  { key: "CONCLUIDO", label: "Concluídos" },
  { key: "CANCELADO", label: "Cancelados" },
  { key: "", label: "Histórico" },
];

const NEXT: Record<string, { label: string; to: string; kind?: "primary" | "outline" | "danger" }[]> = {
  NOVO: [
    { label: "Aceitar", to: "ACEITO" },
    { label: "Recusar", to: "CANCELADO", kind: "danger" },
  ],
  ACEITO: [
    { label: "Preparar", to: "EM_PREPARACAO" },
    { label: "Cancelar", to: "CANCELADO", kind: "danger" },
  ],
  EM_PREPARACAO: [
    { label: "Marcar enviado", to: "ENVIADO" },
    { label: "Cancelar", to: "CANCELADO", kind: "danger" },
  ],
  ENVIADO: [{ label: "Concluir", to: "CONCLUIDO" }],
};

export default function MerchantOrdersScreen({ navigation }: any) {
  const [tab, setTab] = useState("NOVO");
  const loader = useLoader(() => getOrders("seller", tab || undefined), [] as any[], [tab]);
  const orders: any[] = loader.data;

  async function change(order: any, to: string) {
    const run = async () => {
      try {
        await setOrderStatus(order.id, to);
        loader.reload();
      } catch (e) {
        Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar o pedido."));
      }
    };
    if (to === "CANCELADO") {
      Alert.alert("Cancelar pedido", "Tem certeza?", [
        { text: "Não", style: "cancel" },
        { text: "Sim", style: "destructive", onPress: run },
      ]);
    } else {
      run();
    }
  }

  async function togglePaid(order: any) {
    try {
      await setOrderPaid(order.id, !order.paid);
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar o pagamento."));
    }
  }

  return (
    <MerchantLayout active="MerchantOrders">
      <Page loader={loader}>
        <Title>🛒 Pedidos</Title>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((t) => (
            <Chip key={t.label} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>

        {orders.length === 0 ? (
          <Empty text="Nenhum pedido aqui." />
        ) : (
          orders.map((o) => {
            const st = ORDER_STATUS[o.status];
            const activeDelivery = o.delivery && o.delivery.status !== "CANCELADA";
            const canAskTransport = ["ACEITO", "EM_PREPARACAO", "ENVIADO"].includes(o.status) && !activeDelivery;
            return (
              <Card key={o.id}>
                <View style={u.between}>
                  <Text style={u.strong}>Pedido #{o.id.slice(0, 6).toUpperCase()}</Text>
                  <Badge label={st?.label ?? o.status} color={st?.color ?? "#757575"} />
                </View>
                <Text style={u.muted}>
                  {formatDate(o.createdAt)} · {o.buyer?.name ?? "Cliente"}
                </Text>

                {o.items.map((i: any) => (
                  <Text key={i.id} style={{ marginTop: 4 }}>
                    {i.quantity} × {i.title} — {money(i.price)}
                  </Text>
                ))}

                <Text style={[u.strong, { marginTop: 8 }]}>Total: {money(o.total)}</Text>
                {o.deliveryOption ? <Text style={u.muted}>Entrega: {o.deliveryOption}</Text> : null}
                {o.deliveryAddress ? <Text style={u.muted}>Endereço: {o.deliveryAddress}</Text> : null}
                {o.notes ? <Text style={u.muted}>Nota: {o.notes}</Text> : null}

                <View style={[u.row, { marginTop: 6 }]}>
                  <Badge label={o.paid ? "Pago" : "Por pagar"} color={o.paid ? "#2E7D32" : "#F9A825"} />
                  {o.delivery ? (
                    <View style={{ marginLeft: 8 }}>
                      <Badge
                        label={`Entrega: ${DELIVERY_STATUS[o.delivery.status]?.label ?? o.delivery.status}`}
                        color={DELIVERY_STATUS[o.delivery.status]?.color ?? "#757575"}
                      />
                    </View>
                  ) : null}
                </View>

                <View style={u.row}>
                  {(NEXT[o.status] ?? []).map((a) => (
                    <Btn key={a.to} small kind={a.kind ?? "primary"} label={a.label} onPress={() => change(o, a.to)} />
                  ))}
                  {o.status !== "CANCELADO" && (
                    <Btn small kind="outline" label={o.paid ? "Marcar não pago" : "Marcar pago"} onPress={() => togglePaid(o)} />
                  )}
                  {canAskTransport && (
                    <Btn small kind="outline" label="🚚 Pedir transporte" onPress={() => navigation.navigate("MerchantDeliveries", { orderId: o.id })} />
                  )}
                  {o.buyer ? (
                    <Btn
                      small
                      kind="outline"
                      label="💬 Mensagem"
                      onPress={() => navigation.navigate("Chat", { userId: o.buyer.id, userName: o.buyer.name })}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })
        )}
      </Page>
    </MerchantLayout>
  );
}
