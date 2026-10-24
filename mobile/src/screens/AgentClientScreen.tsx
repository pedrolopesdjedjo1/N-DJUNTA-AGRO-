import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking, Image, Switch } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import {
  getAgentClient,
  updateClientNotes,
  removeAgentClient,
  addClientActivity,
  startAssist,
  endAssist,
} from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { getAssist, setAssist, useAssist } from "../utils/assistMode";
import { labelOf } from "../utils/ngoCatalog";
import { ACTIVITY_ICON, LINK_STATUS_COLOR, ROLE_ICON, ROLE_NAME } from "../constants/agent";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate, formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

export default function AgentClientScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useAgentCatalog();
  const { session } = useAssist();
  const loader = useLoader(() => getAgentClient(id), null as any, [id]);
  const d: any = loader.data;

  const [showAssist, setShowAssist] = useState(false);
  const [reason, setReason] = useState("OUTRO");
  const [notes, setNotes] = useState<string | null>(null);
  const [kind, setKind] = useState("NOTA");
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
        <Title>Cliente</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const c = d.client;
  const link = d.link;
  const wa = whatsappUrl(c.phone);
  const here = session && session.linkId === id;

  async function logContact(via: string) {
    try {
      await addClientActivity(id, { kind: "CONTACTO", via });
    } catch (e) {
      // o contacto faz-se na mesma
    }
  }

  async function call() {
    await logContact("chamada");
    Linking.openURL(`tel:${c.phone}`);
  }

  async function whatsapp() {
    if (!wa) return;
    await logContact("WhatsApp");
    Linking.openURL(wa);
  }

  async function chat() {
    await logContact("mensagem");
    navigation.navigate("Chat", { userId: c.id, userName: c.name });
  }

  async function saveNotes() {
    if (notes === null) return;
    setBusy(true);
    try {
      loader.setData(await updateClientNotes(id, notes));
      setNotes(null);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar as notas."));
    } finally {
      setBusy(false);
    }
  }

  async function addActivity() {
    if (kind !== "CONTACTO" && message.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o que aconteceu.");
      return;
    }
    setBusy(true);
    try {
      loader.setData(await addClientActivity(id, { kind, message: message.trim() || undefined, isPrivate }));
      setMessage("");
      setIsPrivate(false);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o registo."));
    } finally {
      setBusy(false);
    }
  }

  async function startHelp() {
    setBusy(true);
    try {
      // Só uma sessão de cada vez neste telemóvel: termina a anterior, se for de outra pessoa
      const old = getAssist();
      if (old && old.linkId !== id) {
        try {
          await endAssist(old.sessionId);
        } catch (e) {
          // termina sozinha
        }
      }

      const r = await startAssist(id, reason);
      setAssist({
        sessionId: r.sessionId,
        token: r.token,
        expiresAt: new Date(r.expiresAt).getTime(),
        startedAt: new Date(r.startedAt).getTime(),
        reason: r.reason,
        linkId: id,
        client: r.client,
      });
      setShowAssist(false);
      navigation.navigate("AgentAssist");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível iniciar a sessão de ajuda."));
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    Alert.alert("Deixar de acompanhar", `${c.name} sai da sua carteira e a pessoa é avisada. Continuar?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Deixar de acompanhar",
        style: "destructive",
        onPress: async () => {
          try {
            await removeAgentClient(id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível retirar a pessoa."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <View style={[u.row, { alignItems: "center" }]}>
        {c.photoUrl ? (
          <Image source={{ uri: c.photoUrl }} style={[u.photo, { width: 64, height: 64, borderRadius: 32 }]} />
        ) : (
          <View style={[u.photo, { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 28 }}>{ROLE_ICON[c.role] ?? "👤"}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Title>
            {c.name} {c.isVerified ? "✅" : ""}
          </Title>
          <Text style={u.muted}>{ROLE_NAME[c.role] ?? c.role}</Text>
        </View>
      </View>

      <View style={u.row}>
        <Badge label={labelOf(catalog.linkStatus, link.status) || link.status} color={LINK_STATUS_COLOR[link.status] ?? "#757575"} />
        <View style={{ marginLeft: 8 }}>
          <Badge label={link.consentMode === "PRESENCIAL" ? "Registada por si" : "Convite aceite"} color="#00838F" />
        </View>
      </View>

      {link.status === "PENDENTE_ACEITACAO" ? (
        <Card>
          <Text style={u.strong}>✉️ À espera da resposta</Text>
          <Text style={u.muted}>A pessoa ainda não aceitou o convite. Só depois de aceitar pode ajudar na conta dela.</Text>
        </Card>
      ) : null}
      {link.status === "REVOGADO" || link.status === "RECUSADO" ? (
        <Card>
          <Text style={{ color: "#C62828", fontWeight: "bold" }}>
            {link.endedBy === "CLIENTE" ? "A pessoa retirou o acesso." : link.endedBy === "AGENTE" ? "Deixou de acompanhar esta pessoa." : "Acesso terminado."}
          </Text>
        </Card>
      ) : null}

      <Card>
        {c.location ? <Text>📍 {c.location}</Text> : null}
        {c.phone ? <Text style={u.muted}>📞 {c.phone}</Text> : null}
        <Text style={u.muted}>Conta criada em {formatDate(c.createdAt)}</Text>
        <Text style={u.muted}>{link.lastContactAt ? `Último contacto: ${formatDate(link.lastContactAt)}` : "Sem contactos registados"}</Text>
        {link.status === "ATIVO" ? (
          <View style={u.row}>
            <Btn small kind="outline" label="💬 Mensagem" onPress={chat} />
            {c.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={call} /> : null}
            {wa ? <Btn small kind="outline" label="WhatsApp" onPress={whatsapp} /> : null}
          </View>
        ) : null}
      </Card>

      <View style={u.grid}>
        {(
          [
            ["📦 Produtos", d.stats.products],
            ["🛒 Encomendas em aberto", d.stats.openOrders],
          ] as [string, number][]
        ).map(([label, value]) => (
          <View key={label} style={u.tile}>
            <View style={u.tileBox}>
              <Text style={u.tileValue}>{value}</Text>
              <Text style={u.tileLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>

      {link.status === "ATIVO" ? (
        <>
          <SubTitle>O que fazer com {c.name.split(" ")[0]}</SubTitle>

          {d.canAssist ? (
            here ? (
              <Card>
                <Text style={u.strong}>🤝 Sessão de ajuda aberta</Text>
                <Btn label="Continuar a ajudar" onPress={() => navigation.navigate("AgentAssist")} />
              </Card>
            ) : (
              <>
                <Btn label={showAssist ? "Fechar" : "🤝 Ajudar na conta (30 minutos)"} onPress={() => setShowAssist(!showAssist)} />
                {showAssist ? (
                  <Card>
                    <Text style={u.strong}>Para que vai ajudar?</Text>
                    <View style={u.row}>
                      {catalog.assistReasons.map((r) => (
                        <Chip key={r.value} label={r.label} active={reason === r.value} onPress={() => setReason(r.value)} />
                      ))}
                    </View>
                    <Text style={[u.muted, { marginTop: 6 }]}>
                      Vai usar as telas normais de {c.name.split(" ")[0]}. A pessoa recebe um aviso e tudo o que fizer fica registado.
                    </Text>
                    <Btn label={busy ? "A iniciar..." : "Iniciar a sessão"} onPress={startHelp} disabled={busy} />
                  </Card>
                ) : null}
              </>
            )
          ) : (
            <Card>
              <Text style={u.muted}>A sua conta não tem permissão para ajudar nas contas das pessoas. Fale com a equipa.</Text>
            </Card>
          )}

          <View style={u.row}>
            <Btn small kind="outline" label="📦 Encomendas" onPress={() => navigation.navigate("AgentOrders", { linkId: id })} />
            <Btn small kind="outline" label="🛒 Produtos dele(a)" onPress={() => navigation.navigate("AgentMarket", { linkId: id, scope: "mine" })} />
            <Btn small kind="outline" label="📢 Oportunidades" onPress={() => navigation.navigate("AgentOpportunities", { linkId: id })} />
          </View>
          <View style={u.row}>
            <Btn small kind="outline" label="☑️ Nova tarefa" onPress={() => navigation.navigate("AgentTaskForm", { linkId: id })} />
            <Btn small kind="outline" label="📍 Registar necessidade" onPress={() => navigation.navigate("AgentNeedForm", { linkId: id })} />
            <Btn small kind="outline" label="🆘 Abrir chamado" onPress={() => navigation.navigate("AgentCaseForm", { linkId: id })} />
          </View>
        </>
      ) : null}

      <SubTitle>Notas</SubTitle>
      <Card>
        {notes === null ? (
          <>
            <Text>{link.notes || "Sem notas."}</Text>
            <Btn small kind="outline" label="✏️ Editar notas" onPress={() => setNotes(link.notes ?? "")} />
          </>
        ) : (
          <>
            <Field value={notes} onChangeText={setNotes} multiline placeholder="Ex: Produz arroz e caju, prefere ser contactado de manhã" />
            <View style={u.row}>
              <Btn small label={busy ? "A guardar..." : "Guardar"} onPress={saveNotes} disabled={busy} />
              <Btn small kind="outline" label="Cancelar" onPress={() => setNotes(null)} />
            </View>
          </>
        )}
      </Card>

      {link.status === "ATIVO" ? (
        <>
          <SubTitle>Registar atendimento</SubTitle>
          <Card>
            <View style={u.row}>
              {catalog.manualActivityKinds.map((k) => (
                <Chip key={k.value} label={`${ACTIVITY_ICON[k.value] ?? ""} ${k.label}`.trim()} active={kind === k.value} onPress={() => setKind(k.value)} />
              ))}
            </View>
            <Field
              label={kind === "CONTACTO" ? "Detalhes (opcional)" : "O que aconteceu"}
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="Ex: Visitei a bolanha e combinámos a venda de 200 kg de arroz"
            />
            <View style={u.between}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={u.strong}>Nota privada</Text>
                <Text style={u.muted}>{isPrivate ? "Só você vê este registo." : "A pessoa pode ver este registo."}</Text>
              </View>
              <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
            </View>
            <Btn label={busy ? "A guardar..." : "Guardar registo"} onPress={addActivity} disabled={busy} />
          </Card>
        </>
      ) : null}

      <SubTitle>Histórico de atendimento ({d.activities.length})</SubTitle>
      {d.activities.length === 0 ? (
        <Empty text="Ainda não há registos." />
      ) : (
        d.activities.map((a: any) => (
          <Card key={a.id}>
            <Text style={u.strong}>
              {ACTIVITY_ICON[a.kind] ?? "•"} {labelOf(catalog.activityKinds, a.kind) || a.kind}
            </Text>
            {a.message ? <Text style={{ marginTop: 2, lineHeight: 20 }}>{a.message}</Text> : null}
            <Text style={u.muted}>
              {formatDateTime(a.createdAt)}
              {a.isPrivate ? " · 🔒 só você vê" : ""}
            </Text>
          </Card>
        ))
      )}

      {d.sessions.length > 0 ? (
        <>
          <SubTitle>Sessões de ajuda</SubTitle>
          {d.sessions.map((s: any) => (
            <Card key={s.id}>
              <Text style={u.strong}>🤝 {labelOf(catalog.assistReasons, s.reason) || s.reason}</Text>
              <Text style={u.muted}>
                {formatDateTime(s.startedAt)} · {s.actions} alteração(ões)
              </Text>
            </Card>
          ))}
        </>
      ) : null}

      {link.status === "ATIVO" || link.status === "PENDENTE_ACEITACAO" ? (
        <Btn small kind="danger" label="Deixar de acompanhar esta pessoa" onPress={remove} />
      ) : null}
    </Page>
  );
}
