import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { adminListSecurityReports, adminRespondSecurityReport } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { SECURITY_ICON, SECURITY_STATUS_COLOR } from "../constants/agentSupport";
import { ROLE_NAME } from "../constants/agent";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

const EMPTY = { counts: {} as Record<string, number>, items: [] as any[] };

// Denúncias de segurança sobre agentes e contas
export default function AdminAgentSecurityScreen({ navigation }: any) {
  const { user } = useAuth();
  const catalog = useAgentCatalog();
  const allowed = user?.role === "ADMIN";

  const [status, setStatus] = useState("ABERTO");
  const [openId, setOpenId] = useState("");
  const [next, setNext] = useState<"EM_ANALISE" | "RESOLVIDO">("EM_ANALISE");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loader = useLoader(() => (allowed ? adminListSecurityReports({ status }) : Promise.resolve(EMPTY)), EMPTY, [allowed, status]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      if (allowed) loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed])
  );

  if (!allowed) {
    return (
      <Page>
        <Title>🚩 Denúncias de segurança</Title>
        <Empty text="Acesso restrito à equipa do NÔDJUNTA AGRO." />
      </Page>
    );
  }

  function openRespond(id: string, to: "EM_ANALISE" | "RESOLVIDO") {
    if (openId === id && next === to) {
      setOpenId("");
      return;
    }
    setOpenId(id);
    setNext(to);
    setNote("");
  }

  async function send(id: string) {
    if (next === "RESOLVIDO" && note.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o que foi feito para resolver.");
      return;
    }

    setBusy(true);
    try {
      await adminRespondSecurityReport(id, { status: next, note: note.trim() || undefined });
      setOpenId("");
      setNote("");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível responder."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>🚩 Denúncias de segurança</Title>
      <Text style={u.muted}>Problemas comunicados por agentes e por pessoas ajudadas.</Text>

      <View style={u.row}>
        {catalog.securityStatus.map((s) => (
          <Chip key={s.value} label={`${s.label} (${d.counts[s.value] ?? 0})`} active={status === s.value} onPress={() => setStatus(s.value)} />
        ))}
      </View>

      {d.items.length === 0 && !loader.loading ? (
        <Empty text="Não há denúncias com este estado." />
      ) : (
        d.items.map((r: any) => (
          <Card key={r.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                {SECURITY_ICON[r.kind] ?? "⚠️"} {labelOf(catalog.securityKinds, r.kind) || r.kind}
              </Text>
              <Badge label={labelOf(catalog.securityStatus, r.status) || r.status} color={SECURITY_STATUS_COLOR[r.status] ?? "#757575"} />
            </View>

            <Text style={{ marginTop: 6, lineHeight: 20 }}>{r.description}</Text>
            <Text style={[u.muted, { marginTop: 6 }]}>
              De: {r.reporter?.name ?? "—"} ({ROLE_NAME[String(r.reporter?.role)] ?? r.reporter?.role ?? "—"})
            </Text>
            {r.target ? (
              <Text style={u.muted}>
                Sobre: {r.target.name} ({ROLE_NAME[String(r.target.role)] ?? (String(r.target.role) === "AGENTE" ? "Agente" : r.target.role)})
              </Text>
            ) : null}
            <Text style={u.muted}>{formatDateTime(r.createdAt)}</Text>
            {r.adminNote ? <Text style={[u.muted, { marginTop: 4 }]}>💬 {r.adminNote}</Text> : null}

            <View style={u.row}>
              {r.target && String(r.target.role) === "AGENTE" ? (
                <Btn small kind="outline" label="Abrir o agente" onPress={() => navigation.navigate("AdminAgent", { userId: r.target.id })} />
              ) : null}
              {r.reporter ? <Btn small kind="outline" label="💬 Falar com quem denunciou" onPress={() => navigation.navigate("Chat", { userId: r.reporter.id, userName: r.reporter.name })} /> : null}
              {r.reporter?.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${r.reporter.phone}`)} /> : null}
            </View>

            {r.status !== "RESOLVIDO" ? (
              <View style={u.row}>
                {r.status === "ABERTO" ? <Btn small kind="outline" label="🔍 Pôr em análise" onPress={() => openRespond(r.id, "EM_ANALISE")} /> : null}
                <Btn small label="✅ Resolver" onPress={() => openRespond(r.id, "RESOLVIDO")} />
              </View>
            ) : null}

            {openId === r.id ? (
              <View style={{ marginTop: 8 }}>
                <Field
                  label={next === "RESOLVIDO" ? "O que foi feito (obrigatório, quem denunciou vê)" : "Mensagem para quem denunciou (opcional)"}
                  value={note}
                  onChangeText={setNote}
                  multiline
                />
                <View style={u.row}>
                  <Btn label={busy ? "A enviar..." : "Enviar"} onPress={() => send(r.id)} disabled={busy} />
                  <Btn kind="outline" label="Cancelar" onPress={() => setOpenId("")} />
                </View>
              </View>
            ) : null}
          </Card>
        ))
      )}
    </Page>
  );
}
