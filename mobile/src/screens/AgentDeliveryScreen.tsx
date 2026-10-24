import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getAgentDelivery, logOrderAction } from "../api/agent";
import { beginAssist } from "../utils/assistStart";
import { STAGE_COLOR, humanize, minutesText, shortId } from "../constants/agentOps";
import { ROLE_NAME } from "../constants/agent";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDateTime } from "../constants/market";

export default function AgentDeliveryScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const loader = useLoader(() => getAgentDelivery(id), null as any, [id]);
  const d: any = loader.data;
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>Entrega</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const order = d.order;
  const hasCoords = d.lastLat !== null && d.lastLng !== null && d.lastLat !== undefined;
  const transporter = d.transporter;
  const wa = whatsappUrl(transporter?.phone);

  async function track(action: "ACOMPANHOU_TRANSPORTE" | "ACOMPANHOU_ENTREGA") {
    if (!order) return;
    setBusy(true);
    try {
      await logOrderAction(order.id, { action });
      Alert.alert("Registado", "O acompanhamento ficou guardado na ficha da encomenda.");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o registo."));
    } finally {
      setBusy(false);
    }
  }

  async function assistWith(person: any, reason: string, label: string) {
    if (!person?.linkId) return;
    Alert.alert(label, `Vai usar a conta de ${person.name} durante 30 minutos. A pessoa recebe um aviso e tudo fica registado.`, [
      { text: "Não", style: "cancel" },
      {
        text: "Iniciar",
        onPress: async () => {
          setBusy(true);
          try {
            await beginAssist(person.linkId, reason);
            navigation.navigate("AgentAssist");
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível iniciar a sessão de ajuda."));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>🚚 Entrega {shortId(d.orderId)}</Title>
        </View>
        <Badge label={humanize(d.status)} color={d.closed ? "#2E7D32" : STAGE_COLOR.TRANSPORTE} />
      </View>

      {d.stale ? (
        <Card>
          <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>⚠️ Sem notícias do transporte {minutesText(d.minutesSinceLocation)}.</Text>
          <Text style={u.muted}>Fale com o transportador para saber como está a entrega.</Text>
        </Card>
      ) : null}
      {d.noTransporter ? (
        <Card>
          <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>⚠️ Ninguém assumiu esta entrega.</Text>
          <Btn small kind="outline" label="🚛 Procurar transportadores" onPress={() => navigation.navigate("AgentTransport")} />
        </Card>
      ) : null}

      <SubTitle>Localização</SubTitle>
      <Card>
        {d.lastLocation || hasCoords ? (
          <>
            <Text style={u.strong}>📍 {d.lastLocation ?? "Localização enviada pelo transportador"}</Text>
            <Text style={u.muted}>
              {d.lastLocationAt ? `${formatDateTime(d.lastLocationAt)} (${minutesText(d.minutesSinceLocation)})` : "Sem hora registada"}
            </Text>
            {hasCoords ? <Btn small label="🗺️ Ver no mapa" onPress={() => Linking.openURL(`https://www.google.com/maps?q=${d.lastLat},${d.lastLng}`)} /> : null}
          </>
        ) : (
          <Text style={u.muted}>O transportador ainda não enviou a localização.</Text>
        )}
      </Card>

      <SubTitle>Transportador</SubTitle>
      <Card>
        {transporter ? (
          <>
            <Text style={u.strong}>
              {transporter.name} {transporter.isVerified ? "✅" : ""}
            </Text>
            <View style={u.row}>
              <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: transporter.id, userName: transporter.name })} />
              {transporter.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${transporter.phone}`)} /> : null}
              {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
            </View>
          </>
        ) : (
          <Text style={u.muted}>Ainda sem transportador.</Text>
        )}
      </Card>

      {order ? (
        <>
          <SubTitle>Encomenda</SubTitle>
          <Card>
            <Text style={{ fontWeight: "bold" }}>{money(order.total)}</Text>
            <Text style={u.muted}>
              🛒 {order.buyer?.name ?? "Comprador"} {order.buyer?.isClient ? "⭐" : ""} ({ROLE_NAME[order.buyer?.role] ?? ""})
            </Text>
            <Text style={u.muted}>
              🏪 {order.seller?.name ?? "Vendedor"} {order.seller?.isClient ? "⭐" : ""} ({ROLE_NAME[order.seller?.role] ?? ""})
            </Text>
            <Btn small kind="outline" label="Abrir a encomenda" onPress={() => navigation.navigate("AgentOrder", { id: order.id })} />
          </Card>

          <SubTitle>O que fazer</SubTitle>
          <View style={u.row}>
            <Btn small label="🚚 Registar acompanhamento do transporte" onPress={() => track("ACOMPANHOU_TRANSPORTE")} disabled={busy} />
            <Btn small kind="outline" label="📬 Registar acompanhamento da entrega" onPress={() => track("ACOMPANHOU_ENTREGA")} disabled={busy} />
          </View>
          <View style={u.row}>
            <Btn
              small
              kind="outline"
              label="🆘 Problema de transporte"
              onPress={() => navigation.navigate("AgentCaseForm", { orderId: order.id, category: "TRANSPORTE" })}
            />
          </View>

          {!d.closed ? (
            <>
              <Text style={[u.muted, { marginTop: 8 }]}>
                Confirmar a recolha ou a entrega faz-se na conta de quem a confirma. Se essa pessoa é sua cliente, abra uma sessão de ajuda.
              </Text>
              <View style={u.row}>
                {transporter && order.buyer?.isClient === false && false ? null : null}
                {order.seller?.isClient ? (
                  <Btn small kind="outline" label="📦 Confirmar recolha (vendedor)" onPress={() => assistWith(order.seller, "TRANSPORTE", "Confirmar a recolha")} disabled={busy} />
                ) : null}
                {order.buyer?.isClient ? (
                  <Btn small kind="outline" label="📬 Confirmar entrega (comprador)" onPress={() => assistWith(order.buyer, "ENCOMENDAS", "Confirmar a entrega")} disabled={busy} />
                ) : null}
              </View>
            </>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
