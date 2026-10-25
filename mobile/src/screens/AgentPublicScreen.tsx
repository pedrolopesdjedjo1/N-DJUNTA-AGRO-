import React, { useCallback, useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import RatePanel from "../components/agent/RatePanel";
import { getPublicAgent, respondAgentInvite, revokeMyAgent } from "../api/agent";
import { getGovRegions } from "../api/gov";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { AGENT_STATUS_COLOR } from "../constants/agent";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";

// Cartão de um agente, visto por qualquer pessoa
export default function AgentPublicScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const { user } = useAuth();
  const catalog = useAgentCatalog();

  const loader = useLoader(
    async () => {
      const [data, regions] = await Promise.all([getPublicAgent(id), getGovRegions().catch(() => [] as any[])]);
      return { data, regions };
    },
    null as any,
    [id]
  );
  const d: any = loader.data;

  const [rate, setRate] = useState(false);
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
        <Title>Agente</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const a = d.data.agent;
  const link = d.data.myLink;
  const isMe = user?.id === a.id;
  const regionNames = (a.regions as string[]).map((k) => d.regions.find((r: any) => r.key === k)?.name ?? k);
  const wa = whatsappUrl(a.whatsapp ?? a.phone);
  const hasPoint = a.serviceLat !== null && a.serviceLng !== null && a.serviceLat !== undefined;

  async function respond(accept: boolean) {
    setBusy(true);
    try {
      await respondAgentInvite(link.id, accept);
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível responder ao convite."));
    } finally {
      setBusy(false);
    }
  }

  function revoke() {
    Alert.alert("Retirar o acesso", `${a.name} deixa de poder ajudar na sua conta e é avisado. Continuar?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Retirar acesso",
        style: "destructive",
        onPress: async () => {
          try {
            await revokeMyAgent(link.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível retirar o acesso."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <View style={[u.row, { alignItems: "center" }]}>
        {a.photoUrl ? (
          <Image source={{ uri: a.photoUrl }} style={[u.photo, { width: 84, height: 84, borderRadius: 42 }]} />
        ) : (
          <View style={[u.photo, { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 34 }}>🤝</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>{a.name}</Text>
          <Text style={u.muted}>{labelOf(catalog.agentTypes, a.agentType)}</Text>
          {a.location ? <Text style={u.muted}>📍 {a.location}</Text> : null}
          <View style={[u.row, { marginTop: 4 }]}>
            <Badge label={a.isVerified ? "Agente verificado ✅" : labelOf(catalog.agentStatus, a.status) || a.status} color={a.isVerified ? "#2E7D32" : AGENT_STATUS_COLOR[a.status] ?? "#757575"} />
          </View>
          <Text style={[u.muted, { marginTop: 4 }]}>
            {d.data.rating.average ? `⭐ ${d.data.rating.average} (${d.data.rating.count})` : "Ainda sem avaliações"} · 👥 {d.data.peopleServed} pessoa(s) acompanhada(s)
          </Text>
        </View>
      </View>

      {isMe ? (
        <View style={u.row}>
          <Btn small label="✏️ Editar o meu perfil" onPress={() => navigation.navigate("AgentProfileForm")} />
          <Text style={[u.muted, { alignSelf: "center" }]}>É assim que os clientes o veem.</Text>
        </View>
      ) : (
        <View style={u.row}>
          <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: a.id, userName: a.name })} />
          {a.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${a.phone}`)} /> : null}
          {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
        </View>
      )}

      {!isMe && link?.status === "PENDENTE_ACEITACAO" ? (
        <Card>
          <Text style={u.strong}>✉️ {a.name} convidou-o a ser acompanhado</Text>
          <Text style={u.muted}>Se aceitar, o agente pode pedir-lhe uma sessão de ajuda de 30 minutos para publicar produtos, comprar ou tratar de encomendas. Recebe um aviso em cada sessão e pode retirar o acesso quando quiser.</Text>
          <View style={u.row}>
            <Btn label={busy ? "..." : "✅ Aceitar"} onPress={() => respond(true)} disabled={busy} />
            <Btn kind="outline" label="Recusar" onPress={() => respond(false)} disabled={busy} />
          </View>
        </Card>
      ) : null}

      {!isMe && link?.status === "ATIVO" ? (
        <Card>
          <Text style={u.strong}>✅ É o seu agente</Text>
          <View style={u.row}>
            <Btn small kind="outline" label="📋 O que fez na minha conta" onPress={() => navigation.navigate("MyAgentActivity", { linkId: link.id, agentName: a.name })} />
            <Btn small kind="outline" label={rate ? "Fechar" : "⭐ Avaliar"} onPress={() => setRate(!rate)} />
            <Btn small kind="danger" label="Retirar acesso" onPress={revoke} />
          </View>
        </Card>
      ) : null}
      {!isMe && rate && link ? (
        <RatePanel
          linkId={link.id}
          onCancel={() => setRate(false)}
          onDone={() => {
            setRate(false);
            loader.reload();
          }}
        />
      ) : null}

      {!isMe && !link ? (
        <Card>
          <Text style={u.muted}>Para este agente o poder ajudar na sua conta, ele tem de o registar ou convidar. Fale com ele pela mensagem.</Text>
        </Card>
      ) : null}

      {a.bio ? (
        <>
          <SubTitle>Sobre o agente</SubTitle>
          <Text style={{ lineHeight: 21 }}>{a.bio}</Text>
        </>
      ) : null}

      <SubTitle>Área de atuação</SubTitle>
      <Card>
        <Text style={u.muted}>Áreas</Text>
        <View style={u.row}>
          {(a.areas as string[]).length === 0 ? <Text style={u.muted}>Não indicadas.</Text> : null}
          {(a.areas as string[]).map((x) => (
            <Badge key={x} label={labelOf(catalog.agentAreas, x)} color="#00838F" />
          ))}
        </View>
        <Text style={[u.muted, { marginTop: 8 }]}>Regiões onde atua</Text>
        <View style={u.row}>
          {regionNames.length === 0 ? <Text style={u.muted}>Não indicadas.</Text> : null}
          {regionNames.map((r) => (
            <Badge key={r} label={r} color="#1565C0" />
          ))}
        </View>
      </Card>

      {a.serviceAddress || a.schedule || hasPoint ? (
        <>
          <SubTitle>Ponto de atendimento</SubTitle>
          <Card>
            {a.serviceAddress ? <Text>🏠 {a.serviceAddress}</Text> : null}
            {a.schedule ? <Text style={u.muted}>🕒 {a.schedule}</Text> : null}
            {hasPoint ? (
              <Btn
                small
                label="🧭 Como chegar"
                onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${a.serviceLat},${a.serviceLng}`)}
              />
            ) : null}
          </Card>
        </>
      ) : null}

      {!isMe ? (
        <Btn
          small
          kind="outline"
          label="🚩 Denunciar um problema com este agente"
          onPress={() => navigation.navigate("Help")}
        />
      ) : null}
    </Page>
  );
}
