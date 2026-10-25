import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert, Linking, Switch } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import {
  adminAgentDetail,
  adminReviewAgent,
  adminUnlockAgent,
  adminReconcileAgent,
} from "../api/agent";
import { getGovRegions } from "../api/gov";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { ACTIVITY_ICON, AGENT_STATUS_COLOR } from "../constants/agent";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate, formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

type Panel = "" | "APROVAR" | "RECUSAR" | "SUSPENDER" | "REATIVAR" | "AJUSTAR" | "unlock";

const TITLE: Record<string, string> = {
  APROVAR: "Aprovar o agente",
  RECUSAR: "Recusar o perfil",
  SUSPENDER: "Suspender o agente",
  REATIVAR: "Reativar o agente",
  AJUSTAR: "Ajustar as permissões",
  unlock: "Levantar o bloqueio de segurança",
};

export default function AdminAgentScreen({ navigation, route }: any) {
  const userId: string = route?.params?.userId;
  const { user } = useAuth();
  const catalog = useAgentCatalog();
  const allowed = user?.role === "ADMIN";

  const loader = useLoader(
    async () => {
      if (!allowed) return null as any;
      const [detail, regions] = await Promise.all([adminAgentDetail(userId), getGovRegions().catch(() => [] as any[])]);
      return { detail, regions };
    },
    null as any,
    [allowed, userId]
  );
  const d: any = loader.data;

  const [filled, setFilled] = useState(false);
  const [canRegister, setCanRegister] = useState(true);
  const [canAssist, setCanAssist] = useState(true);
  const [rate, setRate] = useState("0");
  const [panel, setPanel] = useState<Panel>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (filled || loader.loading || !d) return;
    const p = d.detail.profile;
    setCanRegister(p.canRegister);
    setCanAssist(p.canAssist);
    setRate(String(p.commissionRate ?? 0));
    setFilled(true);
  }, [loader.loading, d]);

  useFocusEffect(
    useCallback(() => {
      if (allowed && filled) loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed, filled])
  );

  if (!allowed) {
    return (
      <Page>
        <Title>🤝 Agente</Title>
        <Empty text="Acesso restrito à equipa do NÔDJUNTA AGRO." />
      </Page>
    );
  }

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>🤝 Agente</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const detail = d.detail;
  const p = detail.profile;
  const u0 = detail.user;
  const regionNames = (p.regions as string[]).map((k) => d.regions.find((r: any) => r.key === k)?.name ?? k);

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setNote("");
  }

  async function decide(decision: Exclude<Panel, "" | "unlock">) {
    const needsNote = decision === "RECUSAR" || decision === "SUSPENDER";
    if (needsNote && note.trim().length < 3) {
      Alert.alert("Atenção", "Explique o motivo, para o agente perceber.");
      return;
    }

    const body: Record<string, any> = { decision };
    if (note.trim()) body.note = note.trim();

    if (decision === "APROVAR" || decision === "REATIVAR" || decision === "AJUSTAR") {
      const value = Number(rate.replace(",", ".") || 0);
      if (isNaN(value) || value < 0 || value > 30) {
        Alert.alert("Atenção", "A comissão deve ser um número entre 0 e 30.");
        return;
      }
      body.canRegister = canRegister;
      body.canAssist = canAssist;
      body.commissionRate = value;
    }

    setBusy(true);
    try {
      await adminReviewAgent(userId, body);
      setPanel("");
      setNote("");
      setFilled(false);
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a decisão."));
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    setBusy(true);
    try {
      await adminUnlockAgent(userId, note.trim() || undefined);
      setPanel("");
      setNote("");
      setFilled(false);
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível levantar o bloqueio."));
    } finally {
      setBusy(false);
    }
  }

  async function reconcile() {
    setBusy(true);
    try {
      const r = await adminReconcileAgent(userId);
      Alert.alert("Comissões recalculadas", r.created > 0 ? `${r.created} comissão(ões) nova(s) criada(s).` : "Não há comissões novas.");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível recalcular."));
    } finally {
      setBusy(false);
    }
  }

  const settingsFields = (
    <>
      <View style={u.between}>
        <Text style={{ flex: 1, marginRight: 8 }}>Pode registar pessoas novas</Text>
        <Switch value={canRegister} onValueChange={setCanRegister} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
      </View>
      <View style={[u.between, { marginTop: 8 }]}>
        <Text style={{ flex: 1, marginRight: 8 }}>Pode ajudar nas contas dos clientes</Text>
        <Switch value={canAssist} onValueChange={setCanAssist} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
      </View>
      <Field label="Comissão (% de 0 a 30, 0 = sem comissão)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
    </>
  );

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>{u0?.name ?? "Agente"}</Title>
        </View>
        <Badge label={labelOf(catalog.agentStatus, p.status) || p.status} color={AGENT_STATUS_COLOR[p.status] ?? "#757575"} />
      </View>
      <Text style={u.muted}>{labelOf(catalog.agentTypes, p.agentType)}</Text>

      <Card>
        {u0?.location ? <Text>📍 {u0.location}</Text> : null}
        {u0?.phone ? <Text style={u.muted}>📞 {u0.phone}</Text> : null}
        {p.whatsapp ? <Text style={u.muted}>WhatsApp: {p.whatsapp}</Text> : null}
        <Text style={u.muted}>Conta criada em {u0 ? formatDate(u0.createdAt) : "—"}</Text>
        {p.submittedAt ? <Text style={u.muted}>Perfil enviado em {formatDate(p.submittedAt)}</Text> : null}
        {p.statusNote ? <Text style={[u.muted, { marginTop: 4 }]}>Nota: {p.statusNote}</Text> : null}
        {p.lockedAt ? (
          <Text style={{ color: "#C62828", marginTop: 4 }}>
            🔒 Bloqueou a própria conta em {formatDateTime(p.lockedAt)}
            {p.lockReason ? `: ${p.lockReason}` : ""}
          </Text>
        ) : null}
        <View style={u.row}>
          {u0 ? <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: u0.id, userName: u0.name })} /> : null}
          {u0?.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${u0.phone}`)} /> : null}
          <Btn small kind="outline" label="Ver como os clientes veem" onPress={() => navigation.navigate("AgentPublic", { id: userId })} />
        </View>
      </Card>

      {p.bio ? (
        <>
          <SubTitle>Apresentação</SubTitle>
          <Text style={{ lineHeight: 21 }}>{p.bio}</Text>
        </>
      ) : null}

      <Card>
        <Text style={u.muted}>Áreas</Text>
        <View style={u.row}>
          {(p.areas as string[]).length === 0 ? <Text style={u.muted}>Nenhuma.</Text> : null}
          {(p.areas as string[]).map((x) => (
            <Badge key={x} label={labelOf(catalog.agentAreas, x)} color="#00838F" />
          ))}
        </View>
        <Text style={[u.muted, { marginTop: 8 }]}>Regiões</Text>
        <View style={u.row}>
          {regionNames.length === 0 ? <Text style={u.muted}>Nenhuma.</Text> : null}
          {regionNames.map((r) => (
            <Badge key={r} label={r} color="#1565C0" />
          ))}
        </View>
        {p.serviceAddress ? <Text style={[u.muted, { marginTop: 8 }]}>🏠 {p.serviceAddress}</Text> : null}
      </Card>

      <SubTitle>Documentos ({detail.documents.length})</SubTitle>
      {detail.documents.length === 0 ? (
        <Empty text="Sem documentos." />
      ) : (
        detail.documents.map((doc: any) => (
          <Card key={doc.id}>
            <Text style={u.strong}>{doc.name}</Text>
            <Text style={u.muted}>
              {labelOf(catalog.documentKinds, doc.kind)} · {formatDate(doc.createdAt)}
            </Text>
            <Btn small kind="outline" label="Abrir documento" onPress={() => Linking.openURL(doc.url)} />
          </Card>
        ))
      )}

      <SubTitle>Decisão</SubTitle>
      <Card>
        <Text>{p.canRegister ? "✅" : "⛔"} Registar pessoas novas</Text>
        <Text>{p.canAssist ? "✅" : "⛔"} Ajudar nas contas dos clientes</Text>
        <Text>{p.commissionRate > 0 ? `💰 Comissão de ${p.commissionRate}%` : "💰 Sem comissão"}</Text>
      </Card>

      <View style={u.row}>
        {p.status === "PENDENTE" ? <Btn small label="✅ Aprovar" onPress={() => open("APROVAR")} /> : null}
        {p.status === "PENDENTE" ? <Btn small kind="danger" label="Recusar" onPress={() => open("RECUSAR")} /> : null}
        {p.status === "APROVADO" ? <Btn small kind="outline" label="⚙️ Ajustar permissões" onPress={() => open("AJUSTAR")} /> : null}
        {p.status === "APROVADO" ? <Btn small kind="danger" label="Suspender" onPress={() => open("SUSPENDER")} /> : null}
        {p.status === "SUSPENSO" ? <Btn small label="Reativar" onPress={() => open("REATIVAR")} /> : null}
        {p.lockedAt ? <Btn small kind="outline" label="🔓 Levantar bloqueio" onPress={() => open("unlock")} /> : null}
        {p.status === "APROVADO" ? <Btn small kind="outline" label="🧾 Recalcular comissões" onPress={reconcile} disabled={busy} /> : null}
      </View>
      {p.status === "RASCUNHO" || p.status === "RECUSADO" ? <Text style={u.muted}>Este perfil ainda não foi enviado para análise.</Text> : null}

      {panel ? (
        <Card>
          <Text style={u.strong}>{TITLE[panel]}</Text>
          {panel === "APROVAR" || panel === "REATIVAR" || panel === "AJUSTAR" ? settingsFields : null}
          <Field
            label={panel === "RECUSAR" || panel === "SUSPENDER" ? "Motivo (obrigatório, o agente vê)" : "Nota (opcional)"}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder={panel === "RECUSAR" ? "Ex: O documento está ilegível. Envie uma foto mais clara." : ""}
          />
          <View style={u.row}>
            <Btn
              kind={panel === "RECUSAR" || panel === "SUSPENDER" ? "danger" : "primary"}
              label={busy ? "A guardar..." : "Confirmar"}
              onPress={() => (panel === "unlock" ? unlock() : decide(panel as Exclude<Panel, "" | "unlock">))}
              disabled={busy}
            />
            <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
          </View>
        </Card>
      ) : null}

      <SubTitle>Resumo</SubTitle>
      <View style={u.grid}>
        {(
          [
            ["👥 Clientes ativos", detail.clients.active],
            ["✉️ Convites", detail.clients.pending],
            ["⏳ Comissões a receber", money(detail.commissions.pending)],
            ["✅ Comissões pagas", money(detail.commissions.paid)],
          ] as [string, any][]
        ).map(([label, value]) => (
          <View key={label} style={u.tile}>
            <View style={u.tileBox}>
              <Text style={[u.tileValue, { fontSize: 16 }]}>{value}</Text>
              <Text style={u.tileLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>

      {detail.reportsAgainst.length > 0 ? (
        <>
          <SubTitle>Denúncias contra este agente ({detail.reportsAgainst.length})</SubTitle>
          {detail.reportsAgainst.map((r: any) => (
            <Card key={r.id}>
              <Text style={u.strong}>
                {labelOf(catalog.securityKinds, r.kind) || r.kind} · {labelOf(catalog.securityStatus, r.status) || r.status}
              </Text>
              <Text style={{ marginTop: 4 }} numberOfLines={3}>
                {r.description}
              </Text>
              <Text style={u.muted}>{formatDateTime(r.createdAt)}</Text>
            </Card>
          ))}
          <Btn small kind="outline" label="Ver as denúncias" onPress={() => navigation.navigate("AdminAgentSecurity")} />
        </>
      ) : null}

      <SubTitle>Sessões de ajuda ({detail.sessions.length})</SubTitle>
      {detail.sessions.length === 0 ? (
        <Text style={u.muted}>Ainda não fez sessões.</Text>
      ) : (
        detail.sessions.map((s: any) => (
          <Card key={s.id}>
            <Text style={u.strong}>🤝 {s.clientName ?? "Cliente"}</Text>
            <Text style={u.muted}>
              {labelOf(catalog.assistReasons, s.reason) || s.reason} · {s.actions} alteração(ões)
            </Text>
            <Text style={u.muted}>{formatDateTime(s.startedAt)}</Text>
          </Card>
        ))
      )}

      <SubTitle>Atividade recente</SubTitle>
      {detail.activities.length === 0 ? (
        <Text style={u.muted}>Sem atividade.</Text>
      ) : (
        detail.activities.slice(0, 30).map((a: any) => (
          <Card key={a.id}>
            <Text style={u.strong}>
              {ACTIVITY_ICON[a.kind] ?? "•"} {labelOf(catalog.activityKinds, a.kind) || a.kind}
            </Text>
            {a.message ? <Text style={{ marginTop: 2 }}>{a.message}</Text> : null}
            <Text style={u.muted}>
              {a.clientName ? `${a.clientName} · ` : ""}
              {formatDateTime(a.createdAt)}
              {a.isPrivate ? " · 🔒" : ""}
            </Text>
          </Card>
        ))
      )}
    </Page>
  );
}
