import React, { useCallback, useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import RatePanel from "../components/agent/RatePanel";
import { getMyAgents, respondAgentInvite, revokeMyAgent } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { LINK_STATUS_COLOR } from "../constants/agent";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

// Os agentes que me acompanham: aceitar convites, ver o que fizeram, avaliar e retirar o acesso.
// Serve para qualquer perfil (agricultor, pescador, artesão, comerciante, cliente...).
export default function MyAgentsScreen({ navigation }: any) {
  const catalog = useAgentCatalog();
  const loader = useLoader(getMyAgents, [] as any[]);
  const items: any[] = loader.data;

  const [busyId, setBusyId] = useState("");
  const [rateId, setRateId] = useState("");

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const invites = items.filter((l) => l.status === "PENDENTE_ACEITACAO");
  const active = items.filter((l) => l.status === "ATIVO");
  const past = items.filter((l) => l.status === "REVOGADO" || l.status === "RECUSADO");

  async function respond(link: any, accept: boolean) {
    setBusyId(link.id);
    try {
      loader.setData(await respondAgentInvite(link.id, accept));
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível responder ao convite."));
    } finally {
      setBusyId("");
    }
  }

  function revoke(link: any) {
    Alert.alert("Retirar o acesso", `${link.agent.name} deixa de poder ajudar na sua conta e é avisado. Continuar?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Retirar acesso",
        style: "destructive",
        onPress: async () => {
          setBusyId(link.id);
          try {
            loader.setData(await revokeMyAgent(link.id));
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível retirar o acesso."));
          } finally {
            setBusyId("");
          }
        },
      },
    ]);
  }

  function header(link: any) {
    return (
      <View style={[u.row, { alignItems: "center" }]}>
        {link.agent.photoUrl ? (
          <Image source={{ uri: link.agent.photoUrl }} style={[u.photo, { width: 48, height: 48, borderRadius: 24 }]} />
        ) : (
          <View style={[u.photo, { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 22 }}>🤝</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={u.strong}>
            {link.agent.name} {link.agent.isVerified ? "✅" : ""}
          </Text>
          <Text style={u.muted}>{labelOf(catalog.agentTypes, link.agent.agentType) || "Agente"}</Text>
        </View>
        <Badge label={labelOf(catalog.linkStatus, link.status) || link.status} color={LINK_STATUS_COLOR[link.status] ?? "#757575"} />
      </View>
    );
  }

  return (
    <Page loader={loader}>
      <Title>🤝 Os meus agentes</Title>
      <Text style={u.muted}>
        Um agente é uma pessoa autorizada pelo NÔDJUNTA AGRO que o ajuda a usar o app. Só o ajuda na conta se você aceitar, e pode retirar o acesso quando quiser.
      </Text>

      <Card>
        <Text style={u.strong}>🔒 Como o protegemos</Text>
        <Text style={u.muted}>
          Quando o agente o ajuda, abre uma sessão de 30 minutos e recebe um aviso. Ele nunca pode mudar a sua palavra-passe, as configurações ou a verificação de identidade. Tudo o que faz na sua conta fica registado e você pode ver.
        </Text>
      </Card>

      {invites.length > 0 ? (
        <>
          <SubTitle>Convites por responder ({invites.length})</SubTitle>
          {invites.map((l) => (
            <Card key={l.id}>
              {header(l)}
              <Text style={[u.muted, { marginTop: 6 }]}>Convite recebido em {formatDate(l.createdAt)}</Text>
              <View style={u.row}>
                <Btn small label={busyId === l.id ? "..." : "✅ Aceitar"} onPress={() => respond(l, true)} disabled={busyId === l.id} />
                <Btn small kind="outline" label="Recusar" onPress={() => respond(l, false)} disabled={busyId === l.id} />
                <Btn small kind="outline" label="Ver o agente" onPress={() => navigation.navigate("AgentPublic", { id: l.agent.id })} />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      <SubTitle>Os meus agentes ({active.length})</SubTitle>
      {active.length === 0 ? (
        <Empty text="Ainda não tem agentes. Um agente pode registá-lo ou convidá-lo, e você decide se aceita." />
      ) : (
        active.map((l) => {
          const wa = whatsappUrl(l.agent.phone);
          return (
            <View key={l.id}>
              <Card>
                {header(l)}
                <Text style={[u.muted, { marginTop: 6 }]}>
                  {l.consentMode === "PRESENCIAL" ? "Registou a sua conta" : "Convite aceite"} · desde {formatDate(l.createdAt)}
                </Text>
                {l.lastActivityAt ? <Text style={u.muted}>Última atividade em {formatDate(l.lastActivityAt)}</Text> : null}
                {l.myRating ? <Text style={u.muted}>A sua avaliação: {l.myRating} ⭐</Text> : null}

                <View style={u.row}>
                  <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: l.agent.id, userName: l.agent.name })} />
                  {l.agent.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${l.agent.phone}`)} /> : null}
                  {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
                </View>
                <View style={u.row}>
                  <Btn small kind="outline" label="📋 O que fez na minha conta" onPress={() => navigation.navigate("MyAgentActivity", { linkId: l.id, agentName: l.agent.name })} />
                  <Btn small kind="outline" label={rateId === l.id ? "Fechar" : "⭐ Avaliar"} onPress={() => setRateId(rateId === l.id ? "" : l.id)} />
                  <Btn small kind="danger" label="Retirar acesso" onPress={() => revoke(l)} disabled={busyId === l.id} />
                </View>
              </Card>
              {rateId === l.id ? (
                <RatePanel
                  linkId={l.id}
                  current={l.myRating}
                  onCancel={() => setRateId("")}
                  onDone={() => {
                    setRateId("");
                    loader.reload();
                  }}
                />
              ) : null}
            </View>
          );
        })
      )}

      {past.length > 0 ? (
        <>
          <SubTitle>Anteriores ({past.length})</SubTitle>
          {past.map((l) => (
            <Card key={l.id}>
              {header(l)}
              <Text style={[u.muted, { marginTop: 6 }]}>
                {l.endedBy === "CLIENTE" ? "Você retirou o acesso." : l.endedBy === "AGENTE" ? "O agente deixou de o acompanhar." : "Acesso terminado."}
              </Text>
              <Btn small kind="outline" label="📋 Ver o histórico" onPress={() => navigation.navigate("MyAgentActivity", { linkId: l.id, agentName: l.agent.name })} />
            </Card>
          ))}
        </>
      ) : null}

      <Text style={[u.muted, { marginTop: 12 }]}>
        Se foi registado por um agente, a palavra-passe inicial foi escolhida com ele: mude-a em Configurações.
      </Text>
      <View style={u.row}>
        <Btn small kind="outline" label="⚙️ Configurações" onPress={() => navigation.navigate("Settings")} />
        <Btn small kind="outline" label="🆘 Suporte" onPress={() => navigation.navigate("Help")} />
      </View>
    </Page>
  );
}
