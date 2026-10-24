import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getAgentOrder, logOrderAction } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { beginAssist } from "../utils/assistStart";
import { labelOf } from "../utils/ngoCatalog";
import { ACTION_ICON, STAGE_COLOR, STAGE_ICON, humanize, shortId } from "../constants/agentOps";
import { ACTIVITY_ICON, ROLE_NAME } from "../constants/agent";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate, formatDateTime } from "../constants/market";

export default function AgentOrderScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useAgentCatalog();
  const loader = useLoader(() => getAgentOrder(id), null as any, [id]);
  const d: any = loader.data;

  const [action, setAction] = useState("");
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
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
        <Title>Encomenda</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const o = d.order;

  async function contactLog(side: "COMPRADOR" | "VENDEDOR", via: string) {
    try {
      await logOrderAction(id, { action: side === "COMPRADOR" ? "CONTACTOU_COMPRADOR" : "CONTACTOU_VENDEDOR", message: `por ${via}` });
    } catch (e) {
      // o contacto faz-se na mesma
    }
  }

  async function saveAction() {
    if (!action) {
      Alert.alert("Atenção", "Escolha o que fez.");
      return;
    }
    if (action === "NOTA" && message.trim().length < 3) {
      Alert.alert("Atenção", "Escreva a nota.");
      return;
    }
    setBusy(true);
    try {
      loader.setData(await logOrderAction(id, { action, message: message.trim() || undefined, isPrivate }));
      setAction("");
      setMessage("");
      setIsPrivate(false);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o registo."));
    } finally {
      setBusy(false);
    }
  }

  async function treatInAccount(person: any) {
    if (!person?.linkId) return;
    Alert.alert("Tratar na conta", `Vai usar a conta de ${person.name} durante 30 minutos. A pessoa recebe um aviso.`, [
      { text: "Não", style: "cancel" },
      {
        text: "Iniciar",
        onPress: async () => {
          setBusy(true);
          try {
            await beginAssist(person.linkId, "ENCOMENDAS");
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

  function party(title: string, person: any, side: "COMPRADOR" | "VENDEDOR") {
    if (!person) return null;
    const wa = whatsappUrl(person.phone);
    return (
      <Card>
        <Text style={u.muted}>{title}</Text>
        <Text style={u.strong}>
          {person.name} {person.isVerified ? "✅" : ""} {person.isClient ? "⭐" : ""}
        </Text>
        <Text style={u.muted}>
          {ROLE_NAME[person.role] ?? person.role}
          {person.location ? ` · 📍 ${person.location}` : ""}
        </Text>
        <View style={u.row}>
          <Btn
            small
            kind="outline"
            label="💬 Mensagem"
            onPress={async () => {
              await contactLog(side, "mensagem");
              navigation.navigate("Chat", { userId: person.id, userName: person.name });
            }}
          />
          {person.phone ? (
            <Btn
              small
              kind="outline"
              label="📞 Ligar"
              onPress={async () => {
                await contactLog(side, "chamada");
                Linking.openURL(`tel:${person.phone}`);
              }}
            />
          ) : null}
          {wa ? (
            <Btn
              small
              kind="outline"
              label="WhatsApp"
              onPress={async () => {
                await contactLog(side, "WhatsApp");
                Linking.openURL(wa);
              }}
            />
          ) : null}
        </View>
        {person.isClient ? (
          <View style={u.row}>
            <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: person.linkId })} />
            <Btn small kind="outline" label="🤝 Tratar na conta dele(a)" onPress={() => treatInAccount(person)} disabled={busy} />
          </View>
        ) : null}
      </Card>
    );
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>
            {STAGE_ICON[o.stage] ?? "📦"} Encomenda {shortId(o.id)}
          </Title>
        </View>
        <Badge label={labelOf(catalog.orderStages, o.stage) || o.stage} color={STAGE_COLOR[o.stage] ?? "#757575"} />
      </View>
      <Text style={u.muted}>Estado no sistema: {humanize(o.status)}</Text>

      {d.attention ? (
        <Card>
          <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>⚠️ {d.attention}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>{money(o.total)}</Text>
        {o.shippingCost ? <Text style={u.muted}>🚚 Transporte: {money(o.shippingCost)}</Text> : null}
        {o.paymentMethod ? <Text style={u.muted}>💳 Pagamento: {humanize(o.paymentMethod)}</Text> : null}
        {o.desiredDate ? <Text style={u.muted}>🗓️ Data pretendida: {formatDate(o.desiredDate)}</Text> : null}
        <Text style={u.muted}>Feita em {formatDateTime(o.createdAt)}</Text>
        <Text style={u.muted}>Última alteração: {formatDateTime(o.updatedAt)}</Text>
        {o.buyerConfirmedAt ? <Text style={{ color: "#2E7D32", marginTop: 4 }}>✅ Comprador confirmou a receção em {formatDate(o.buyerConfirmedAt)}</Text> : null}
      </Card>

      {party("Comprador", d.buyer, "COMPRADOR")}
      {party("Vendedor", d.seller, "VENDEDOR")}

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
              <Text style={u.muted}>{i.unitPrice !== null ? money(i.unitPrice * i.quantity) : ""}</Text>
            </View>
          ))}
        </Card>
      )}

      {d.payments.length > 0 ? (
        <>
          <SubTitle>Pagamentos</SubTitle>
          {d.payments.map((p: any) => (
            <Card key={p.id}>
              <View style={u.between}>
                <Text style={u.strong}>{p.amount !== null ? money(p.amount) : "Pagamento"}</Text>
                <Badge label={humanize(p.status)} color="#1565C0" />
              </View>
              <Text style={u.muted}>
                {humanize(p.method)}
                {p.reference ? ` · ref. ${p.reference}` : ""}
              </Text>
            </Card>
          ))}
        </>
      ) : null}

      {d.deliveries.length > 0 ? (
        <>
          <SubTitle>Transporte e entrega</SubTitle>
          {d.deliveries.map((x: any) => (
            <Card key={x.id}>
              <Text style={u.strong}>🚚 {humanize(x.status)}</Text>
              {x.lastLocation ? <Text style={u.muted}>📍 {x.lastLocation}</Text> : null}
              <Btn small kind="outline" label="Ver a entrega" onPress={() => navigation.navigate("AgentDelivery", { id: x.id })} />
            </Card>
          ))}
        </>
      ) : null}

      <SubTitle>Registar o que fez</SubTitle>
      <View style={u.row}>
        {catalog.orderActions.map((a) => (
          <Btn
            key={a.value}
            small
            kind={action === a.value ? "primary" : "outline"}
            label={`${ACTION_ICON[a.value] ?? ""} ${a.label}`.trim()}
            onPress={() => setAction(action === a.value ? "" : a.value)}
          />
        ))}
      </View>

      {action ? (
        <Card>
          <Text style={u.strong}>{labelOf(catalog.orderActions, action)}</Text>
          <Field
            label={action === "NOTA" ? "Nota" : "Detalhes (opcional)"}
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Ex: O vendedor vai entregar amanhã de manhã"
          />
          <View style={u.row}>
            <Btn small kind={isPrivate ? "primary" : "outline"} label={isPrivate ? "🔒 Nota privada" : "Visível ao cliente"} onPress={() => setIsPrivate(!isPrivate)} />
          </View>
          <Btn label={busy ? "A guardar..." : "Guardar registo"} onPress={saveAction} disabled={busy} />
        </Card>
      ) : null}

      <SubTitle>Resolver problemas</SubTitle>
      <View style={u.row}>
        <Btn small label="🆘 Abrir chamado" onPress={() => navigation.navigate("AgentCaseForm", { orderId: id, category: "ENCOMENDA" })} />
        <Btn small kind="outline" label="🚚 Problema de transporte" onPress={() => navigation.navigate("AgentCaseForm", { orderId: id, category: "TRANSPORTE" })} />
        <Btn small kind="outline" label="💳 Problema de pagamento" onPress={() => navigation.navigate("AgentCaseForm", { orderId: id, category: "PAGAMENTO" })} />
      </View>
      {d.cases.map((c: any) => (
        <Card key={c.id}>
          <View style={u.between}>
            <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{c.title}</Text>
            <Badge label={labelOf(catalog.caseStatus, c.status) || c.status} color={c.status === "RESOLVIDO" ? "#2E7D32" : c.status === "ESCALADO" ? "#6A1B9A" : "#F9A825"} />
          </View>
          <Btn small kind="outline" label="Abrir chamado" onPress={() => navigation.navigate("AgentCase", { id: c.id })} />
        </Card>
      ))}

      <SubTitle>Histórico desta encomenda</SubTitle>
      {d.activities.length === 0 ? (
        <Empty text="Ainda não registou nada nesta encomenda." />
      ) : (
        d.activities.map((a: any) => (
          <Card key={a.id}>
            <Text style={u.strong}>
              {ACTIVITY_ICON[a.kind] ?? "•"} {a.message}
            </Text>
            <Text style={u.muted}>
              {formatDateTime(a.createdAt)}
              {a.isPrivate ? " · 🔒 só você vê" : ""}
            </Text>
          </Card>
        ))
      )}
    </Page>
  );
}
