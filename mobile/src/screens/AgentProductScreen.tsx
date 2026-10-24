import React, { useState } from "react";
import { View, Text, Image, Alert, Linking, ScrollView } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ClientPicker from "../components/agent/ClientPicker";
import { priceText } from "../components/agent/ProductCard";
import { getAgentProduct, suggestProduct } from "../api/agent";
import { beginAssist } from "../utils/assistStart";
import { DEPARTMENT_LABEL } from "../constants/agentOps";
import { ROLE_NAME } from "../constants/agent";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

type Panel = "" | "suggest" | "buy";

const BUYER_ROLES = ["COMPRADOR", "CLIENTE"];

function detailRows(details: any): [string, string][] {
  if (!details || typeof details !== "object") return [];
  const rows: [string, string][] = [];
  Object.keys(details).forEach((key) => {
    const value = (details as any)[key];
    if (value === null || value === undefined || value === "") return;
    if (typeof value === "object") {
      if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v !== "object")) rows.push([key, value.join(", ")]);
      return;
    }
    rows.push([key, String(value)]);
  });
  return rows.slice(0, 12);
}

export default function AgentProductScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const loader = useLoader(() => getAgentProduct(id), null as any, [id]);
  const p: any = loader.data;

  const [panel, setPanel] = useState<Panel>("");
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!p) {
    return (
      <Page loader={loader}>
        <Title>Produto</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const owner = p.owner;
  const wa = whatsappUrl(owner?.phone);
  const rows = detailRows(p.details);

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setPicked([]);
    setMessage("");
  }

  function toggle(link: any) {
    setPicked((prev) => (prev.includes(link.id) ? prev.filter((x) => x !== link.id) : [...prev, link.id]));
  }

  async function suggest() {
    if (picked.length === 0) {
      Alert.alert("Atenção", "Escolha pelo menos uma pessoa.");
      return;
    }
    setBusy(true);
    try {
      const r = await suggestProduct({ productId: id, linkIds: picked, message: message.trim() || undefined });
      Alert.alert("Sugestão enviada", `${r.sent} pessoa(s) receberam a sugestão.${r.skipped ? ` ${r.skipped} já a tinham recebido esta semana.` : ""}`);
      setPanel("");
      setPicked([]);
      setMessage("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a sugestão."));
    } finally {
      setBusy(false);
    }
  }

  async function buyFor(link: any) {
    Alert.alert(
      "Comprar com a ajuda do agente",
      `Vai usar a conta de ${link.client.name} durante 30 minutos para a compra. A pessoa recebe um aviso e a compra fica registada.`,
      [
        { text: "Não", style: "cancel" },
        {
          text: "Iniciar",
          onPress: async () => {
            setBusy(true);
            try {
              await beginAssist(link.id, "COMPRAR");
              if (BUYER_ROLES.includes(link.client.role)) navigation.navigate("ClientProduct", { id });
              else navigation.navigate("AgentAssist");
            } catch (e) {
              Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível iniciar a sessão de ajuda."));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  async function updateInOwnerAccount() {
    if (!owner?.linkId) return;
    setBusy(true);
    try {
      await beginAssist(owner.linkId, "PUBLICAR_PRODUTO");
      navigation.navigate("AgentAssist");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível iniciar a sessão de ajuda."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page loader={loader}>
      {p.images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {p.images.map((uri: string, i: number) => (
            <Image key={`${uri}-${i}`} source={{ uri }} style={{ width: 240, height: 180, borderRadius: 10, marginRight: 10 }} />
          ))}
        </ScrollView>
      ) : null}

      <Title>{p.title}</Title>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>{priceText(p)}</Text>

      <View style={u.row}>
        {!p.isAvailable ? <Badge label="Indisponível" color="#757575" /> : <Badge label="Disponível" color="#2E7D32" />}
        {p.lowStock ? (
          <View style={{ marginLeft: 8 }}>
            <Badge label="A acabar" color="#EF6C00" />
          </View>
        ) : null}
      </View>

      <Card>
        {p.department ? <Text>{DEPARTMENT_LABEL[p.department] ?? p.department}</Text> : null}
        {p.subcategory ? <Text style={u.muted}>{p.subcategory}</Text> : null}
        {p.stock !== null && p.stock !== undefined ? <Text style={u.muted}>📦 Quantidade disponível: {p.stock}</Text> : null}
        {p.location ? <Text style={u.muted}>📍 {p.location}</Text> : null}
        {p.createdAt ? <Text style={u.muted}>Publicado em {formatDate(p.createdAt)}</Text> : null}
      </Card>

      {p.description ? (
        <>
          <SubTitle>Descrição</SubTitle>
          <Text style={{ lineHeight: 21 }}>{p.description}</Text>
        </>
      ) : null}

      {rows.length > 0 ? (
        <>
          <SubTitle>Detalhes</SubTitle>
          <Card>
            {rows.map(([k, v]) => (
              <View key={k} style={[u.between, { marginTop: 4 }]}>
                <Text style={[u.muted, { flex: 1, marginRight: 8 }]}>{k}</Text>
                <Text style={{ flex: 1, textAlign: "right" }}>{v}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SubTitle>Vendedor</SubTitle>
      <Card>
        <Text style={u.strong}>
          {owner?.name ?? "Vendedor"} {owner?.isVerified ? "✅" : ""}
        </Text>
        <Text style={u.muted}>
          {ROLE_NAME[owner?.role] ?? owner?.role ?? ""}
          {owner?.location ? ` · 📍 ${owner.location}` : ""}
        </Text>
        {owner?.isClient ? <Text style={{ color: "#00838F", marginTop: 4 }}>⭐ É seu cliente</Text> : null}

        {owner ? (
          <View style={u.row}>
            <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: owner.id, userName: owner.name })} />
            {owner.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${owner.phone}`)} /> : null}
            {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
            {owner.linkId ? <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: owner.linkId })} /> : null}
          </View>
        ) : null}
      </Card>

      <SubTitle>O que fazer</SubTitle>
      <View style={u.row}>
        <Btn small label="📢 Sugerir a clientes" onPress={() => open("suggest")} disabled={!p.isAvailable} />
        <Btn small kind="outline" label="🛒 Comprar para um cliente" onPress={() => open("buy")} disabled={!p.isAvailable} />
        {owner?.isClient ? <Btn small kind="outline" label="✏️ Atualizar na conta dele(a)" onPress={updateInOwnerAccount} disabled={busy} /> : null}
      </View>

      {panel === "suggest" ? (
        <Card>
          <Text style={u.strong}>Sugerir este produto a…</Text>
          <ClientPicker selected={picked} onToggle={toggle} filter={(c) => c.client.id !== owner?.id} />
          <Field label="Mensagem (opcional)" value={message} onChangeText={setMessage} multiline placeholder="Ex: Está barato e fica perto de si" />
          <Btn label={busy ? "A enviar..." : `Enviar a ${picked.length || ""} pessoa(s)`} onPress={suggest} disabled={busy || picked.length === 0} />
        </Card>
      ) : null}

      {panel === "buy" ? (
        <Card>
          <Text style={u.strong}>Comprar para…</Text>
          <Text style={u.muted}>Escolha o cliente. Abre-se uma sessão de ajuda na conta dele(a) para fazer a compra.</Text>
          <ClientPicker selected={[]} onToggle={buyFor} filter={(c) => c.client.id !== owner?.id} />
        </Card>
      ) : null}
    </Page>
  );
}
