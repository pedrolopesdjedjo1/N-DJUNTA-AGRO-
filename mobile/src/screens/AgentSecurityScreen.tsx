import React, { useCallback, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import ClientPicker from "../components/agent/ClientPicker";
import { getAgentSecurity, lockAgentAccount, createSecurityReport, listMySecurityReports, endAssist } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { getAssist, clearAssist } from "../utils/assistMode";
import { labelOf } from "../utils/ngoCatalog";
import { ACTIVITY_ICON } from "../constants/agent";
import { SECURITY_ICON, SECURITY_STATUS_COLOR } from "../constants/agentSupport";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

const EMPTY = { security: null as any, reports: [] as any[] };

type Panel = "" | "lock" | "report";

// Segurança: conta protegida, permissões, sessões, registo de atividades, bloqueio e denúncias
export default function AgentSecurityScreen({ navigation }: any) {
  const catalog = useAgentCatalog();

  const loader = useLoader(
    async () => {
      const [security, reports] = await Promise.all([getAgentSecurity(), listMySecurityReports().catch(() => [] as any[])]);
      return { security, reports };
    },
    EMPTY
  );
  const s: any = loader.data.security;
  const reports: any[] = loader.data.reports;

  const [panel, setPanel] = useState<Panel>("");
  const [reason, setReason] = useState("");
  const [kind, setKind] = useState("");
  const [description, setDescription] = useState("");
  const [blockLink, setBlockLink] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  if (!s) {
    return (
      <Page loader={loader}>
        <Title>🛡️ Segurança</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setReason("");
    setKind("");
    setDescription("");
    setBlockLink("");
  }

  function lock() {
    Alert.alert(
      "Bloquear a minha conta",
      "As sessões de ajuda terminam já e deixa de poder registar pessoas e ajudar nas contas. Só a equipa do NÔDJUNTA AGRO pode levantar o bloqueio. Continuar?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await lockAgentAccount(reason.trim() || undefined);
              clearAssist();
              setPanel("");
              loader.reload();
            } catch (e) {
              Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível bloquear a conta."));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  async function report() {
    if (!kind) {
      Alert.alert("Atenção", "Escolha o tipo de problema.");
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert("Atenção", "Explique o que aconteceu (pelo menos 10 letras).");
      return;
    }

    setBusy(true);
    try {
      const r = await createSecurityReport({ kind, description: description.trim(), blockLinkId: blockLink || undefined });
      Alert.alert("Denúncia enviada", r.blocked ? "A equipa vai analisar. O acesso a essa pessoa foi retirado." : "A equipa vai analisar e responde-lhe aqui.");
      setPanel("");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a denúncia."));
    } finally {
      setBusy(false);
    }
  }

  async function finish(id: string) {
    setBusy(true);
    try {
      await endAssist(id);
      if (getAssist()?.sessionId === id) clearAssist();
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível terminar a sessão."));
    } finally {
      setBusy(false);
    }
  }

  const counts: Record<string, number> = s.activityCounts ?? {};
  const kinds = Object.keys(counts);

  return (
    <Page loader={loader}>
      <Title>🛡️ Segurança</Title>

      {s.locked ? (
        <Card>
          <Text style={{ color: "#C62828", fontWeight: "bold" }}>🔒 A sua conta está bloqueada</Text>
          {s.lockReason ? <Text style={{ marginTop: 4 }}>Motivo: {s.lockReason}</Text> : null}
          {s.lockedAt ? <Text style={u.muted}>Desde {formatDateTime(s.lockedAt)}</Text> : null}
          <Text style={u.muted}>Fale com a equipa do NÔDJUNTA AGRO para levantar o bloqueio.</Text>
          <Btn small kind="outline" label="🆘 Contactar a equipa" onPress={() => navigation.navigate("AgentSupport")} />
        </Card>
      ) : (
        <Card>
          <Text style={u.strong}>{s.protected ? "✅ Conta protegida" : "⚠️ Falta proteger a conta"}</Text>
          <Text style={u.muted}>{s.protected ? "A sua conta de agente cumpre todos os passos de segurança." : "Complete os passos em falta."}</Text>
        </Card>
      )}

      <SubTitle>Verificação de identidade</SubTitle>
      <Card>
        {s.checks.map((c: any) => (
          <Text key={c.key} style={{ marginTop: 4, color: c.ok ? "#2E7D32" : "#C62828" }}>
            {c.ok ? "✓" : "✗"} {c.label}
          </Text>
        ))}
        <View style={u.row}>
          <Btn small kind="outline" label="Ver o meu perfil" onPress={() => navigation.navigate("AgentProfile")} />
          <Btn small kind="outline" label="🔑 Mudar palavra-passe" onPress={() => navigation.navigate("Settings")} />
        </View>
      </Card>

      <SubTitle>Permissões de agente</SubTitle>
      <Card>
        <Text>{s.permissions.canRegister ? "✅" : "⛔"} Registar pessoas novas</Text>
        <Text>{s.permissions.canAssist ? "✅" : "⛔"} Ajudar nas contas dos clientes</Text>
        <Text>{s.permissions.commissionRate > 0 ? `💰 Comissão de ${s.permissions.commissionRate}%` : "💰 Sem comissão"}</Text>
        <Text style={[u.muted, { marginTop: 4 }]}>A equipa define estas permissões. Durante uma sessão de ajuda nunca pode mudar a palavra-passe, as configurações ou a verificação do cliente.</Text>
      </Card>

      <SubTitle>Sessões de ajuda</SubTitle>
      {s.activeSessions.length === 0 ? (
        <Text style={u.muted}>Não há sessões abertas.</Text>
      ) : (
        s.activeSessions.map((x: any) => (
          <Card key={x.id}>
            <Text style={u.strong}>🤝 {x.clientName ?? "Cliente"}</Text>
            <Text style={u.muted}>Termina em {formatDateTime(x.expiresAt)}</Text>
            <Btn small kind="danger" label="Terminar agora" onPress={() => finish(x.id)} disabled={busy} />
          </Card>
        ))
      )}
      {s.recentSessions.slice(0, 5).map((x: any) => (
        <Card key={x.id}>
          <Text style={u.strong}>{x.clientName ?? "Cliente"}</Text>
          <Text style={u.muted}>
            {formatDateTime(x.startedAt)} · {x.actions} alteração(ões)
          </Text>
        </Card>
      ))}
      <Btn small kind="outline" label="Ver todas as sessões" onPress={() => navigation.navigate("AgentSessions")} />

      <SubTitle>Registo das atividades (30 dias)</SubTitle>
      {kinds.length === 0 ? (
        <Text style={u.muted}>Ainda não há atividade nos últimos 30 dias.</Text>
      ) : (
        <Card>
          {kinds.map((k) => (
            <View key={k} style={[u.between, { marginTop: 4 }]}>
              <Text>
                {ACTIVITY_ICON[k] ?? "•"} {labelOf(catalog.activityKinds, k) || k}
              </Text>
              <Text style={{ fontWeight: "bold" }}>{counts[k]}</Text>
            </View>
          ))}
        </Card>
      )}
      <Btn small kind="outline" label="Ver o registo completo" onPress={() => navigation.navigate("AgentActivity")} />

      <SubTitle>Denunciar e bloquear</SubTitle>
      <View style={u.row}>
        <Btn small label="🚩 Denunciar um problema" onPress={() => open("report")} />
        {!s.locked ? <Btn small kind="danger" label="🔒 Bloquear a minha conta" onPress={() => open("lock")} /> : null}
      </View>

      {panel === "report" ? (
        <Card>
          <ChipGroup
            label="Tipo de problema"
            options={catalog.securityKinds.map((k) => ({ ...k, icon: SECURITY_ICON[k.value] }))}
            value={kind}
            onChange={setKind}
          />
          <Field label="O que aconteceu" value={description} onChangeText={setDescription} multiline placeholder="Conte o que viu, quando e com quem" />

          <Text style={u.label}>Retirar também o acesso a um cliente (opcional)</Text>
          <Text style={u.muted}>Para bloquear uma atividade suspeita, escolha o cliente: sai da sua carteira na hora.</Text>
          <ClientPicker selected={blockLink ? [blockLink] : []} onToggle={(l) => setBlockLink(blockLink === l.id ? "" : l.id)} />

          <View style={u.row}>
            <Btn label={busy ? "A enviar..." : "Enviar denúncia"} onPress={report} disabled={busy} />
            <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
          </View>
        </Card>
      ) : null}

      {panel === "lock" ? (
        <Card>
          <Text style={u.strong}>Bloquear a conta de agente</Text>
          <Text style={u.muted}>Use se perdeu o telemóvel ou suspeita que alguém usa a sua conta. A equipa é avisada.</Text>
          <Field label="Motivo (opcional)" value={reason} onChangeText={setReason} multiline placeholder="Ex: Perdi o telemóvel" />
          <View style={u.row}>
            <Btn kind="danger" label={busy ? "A bloquear..." : "Bloquear agora"} onPress={lock} disabled={busy} />
            <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
          </View>
        </Card>
      ) : null}

      <SubTitle>As minhas denúncias ({reports.length})</SubTitle>
      {reports.length === 0 ? (
        <Text style={u.muted}>Ainda não enviou denúncias.</Text>
      ) : (
        reports.map((r) => (
          <Card key={r.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                {SECURITY_ICON[r.kind] ?? "⚠️"} {labelOf(catalog.securityKinds, r.kind) || r.kind}
              </Text>
              <Badge label={labelOf(catalog.securityStatus, r.status) || r.status} color={SECURITY_STATUS_COLOR[r.status] ?? "#757575"} />
            </View>
            <Text style={{ marginTop: 4 }} numberOfLines={3}>
              {r.description}
            </Text>
            {r.adminNote ? <Text style={[u.muted, { marginTop: 4 }]}>💬 Equipa: {r.adminNote}</Text> : null}
            <Text style={u.muted}>{formatDateTime(r.createdAt)}</Text>
          </Card>
        ))
      )}
    </Page>
  );
}
