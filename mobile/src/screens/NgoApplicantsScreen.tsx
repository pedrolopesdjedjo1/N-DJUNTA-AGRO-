import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ProgressBar from "../components/ProgressBar";
import { listApplicants, answerApplication } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { APPLICATION_STATUS_COLOR, colorOf } from "../constants/ngo";
import { ROLE_LABEL, ROLE_SECTOR } from "../utils/roles";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY = {
  opportunity: { id: "", title: "", slots: null as number | null, closed: false },
  counts: {} as Record<string, number>,
  total: 0,
  applications: [] as any[],
};

const ANSWER_TITLE: Record<string, string> = {
  ACEITE: "Aceitar a candidatura",
  RECUSADA: "Recusar a candidatura",
};

export default function NgoApplicantsScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useNgoCatalog();
  const [status, setStatus] = useState("");

  const loader = useLoader(() => listApplicants(id, status || undefined), EMPTY, [id, status]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const [answering, setAnswering] = useState<{ id: string; status: string } | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [busy, setBusy] = useState(false);

  const accepted = d.counts.ACEITE ?? 0;
  const slots = d.opportunity.slots;
  const full = !!slots && accepted >= slots;

  function openAnswer(applicationId: string, next: string) {
    setAnswering({ id: applicationId, status: next });
    setAnswerText("");
  }

  async function quick(applicationId: string, next: string) {
    setBusy(true);
    try {
      await answerApplication(id, applicationId, { status: next });
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível atualizar a candidatura."));
    } finally {
      setBusy(false);
    }
  }

  async function sendAnswer() {
    if (!answering) return;
    const text = answerText.trim();
    if (answering.status === "RECUSADA" && text.length < 3) {
      Alert.alert("Atenção", "Explique o motivo, para a pessoa perceber.");
      return;
    }

    setBusy(true);
    try {
      await answerApplication(id, answering.id, { status: answering.status, answer: text || undefined });
      setAnswering(null);
      setAnswerText("");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível responder."));
    } finally {
      setBusy(false);
    }
  }

  function registerBeneficiary(a: any) {
    if (!a.applicant) return;
    navigation.navigate("NgoBeneficiaryForm", {
      userId: a.applicant.id,
      name: a.applicant.name,
      sector: ROLE_SECTOR[a.applicant.role] ?? "OUTRO",
      region: a.applicant.location ?? undefined,
    });
  }

  return (
    <Page loader={loader}>
      <Title>📥 Candidaturas</Title>
      <Text style={u.strong}>{d.opportunity.title}</Text>

      <Card>
        <Text style={u.muted}>
          {d.total} candidatura(s) · {d.counts.ENVIADA ?? 0} nova(s) · {d.counts.EM_ANALISE ?? 0} em análise
        </Text>
        {slots ? (
          <View style={{ marginTop: 6 }}>
            <Text style={{ color: full ? "#C62828" : undefined }}>
              Vagas preenchidas: {accepted} de {slots}
              {full ? " (todas as vagas estão preenchidas)" : ""}
            </Text>
            <ProgressBar percent={(accepted / slots) * 100} color={full ? "#C62828" : undefined} />
          </View>
        ) : (
          <Text style={u.muted}>✅ {accepted} aceite(s)</Text>
        )}
        <View style={u.row}>
          <Btn small kind="outline" label="Ver a oportunidade" onPress={() => navigation.navigate("NgoOpportunity", { id })} />
        </View>
      </Card>

      <View style={u.row}>
        <Chip label={`Todas (${d.counts.ENVIADA || d.counts.EM_ANALISE || d.counts.ACEITE || d.counts.RECUSADA ? Object.values(d.counts as Record<string, number>).reduce((s, n) => s + n, 0) : 0})`} active={status === ""} onPress={() => setStatus("")} />
        {catalog.applicationStatus.map((s) => (
          <Chip
            key={s.value}
            label={`${s.label} (${d.counts[s.value] ?? 0})`}
            active={status === s.value}
            onPress={() => setStatus(status === s.value ? "" : s.value)}
          />
        ))}
      </View>

      {d.applications.length === 0 ? (
        <Empty text={d.total === 0 ? "Ainda não há candidaturas." : "Nenhuma candidatura com este estado."} />
      ) : (
        d.applications.map((a: any) => {
          const isAnswering = answering?.id === a.id;
          const pending = a.status === "ENVIADA" || a.status === "EM_ANALISE";

          return (
            <Card key={a.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {a.applicant?.name ?? "Pessoa"} {a.applicant?.isVerified ? "✅" : ""}
                </Text>
                <Badge label={labelOf(catalog.applicationStatus, a.status)} color={colorOf(APPLICATION_STATUS_COLOR, a.status)} />
              </View>

              {a.applicant ? (
                <Text style={u.muted}>
                  {ROLE_LABEL[a.applicant.role] ?? a.applicant.role}
                  {a.applicant.location ? ` · 📍 ${a.applicant.location}` : ""}
                </Text>
              ) : null}
              <Text style={u.muted}>Enviada em {formatDate(a.createdAt)}</Text>
              {a.phone ? <Text style={u.muted}>📞 {a.phone}</Text> : null}
              {a.message ? <Text style={{ marginTop: 6, lineHeight: 21 }}>{a.message}</Text> : <Text style={[u.muted, { marginTop: 6 }]}>Sem mensagem.</Text>}
              {a.answer ? <Text style={[u.muted, { marginTop: 4 }]}>💬 Resposta: {a.answer}</Text> : null}

              <View style={u.row}>
                {a.applicant ? (
                  <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: a.applicant.id, userName: a.applicant.name })} />
                ) : null}
                {a.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${a.phone}`)} /> : null}
              </View>

              <View style={u.row}>
                {a.status === "ENVIADA" ? <Btn small kind="outline" label="🔍 Em análise" onPress={() => quick(a.id, "EM_ANALISE")} disabled={busy} /> : null}
                {pending || a.status === "RECUSADA" ? <Btn small label="✅ Aceitar" onPress={() => openAnswer(a.id, "ACEITE")} disabled={busy} /> : null}
                {pending || a.status === "ACEITE" ? <Btn small kind="danger" label="Recusar" onPress={() => openAnswer(a.id, "RECUSADA")} disabled={busy} /> : null}
                {a.status === "ACEITE" && a.applicant ? (
                  <Btn small kind="outline" label="👥 Registar como beneficiário" onPress={() => registerBeneficiary(a)} />
                ) : null}
              </View>

              {isAnswering && answering ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={u.strong}>{ANSWER_TITLE[answering.status]}</Text>
                  {answering.status === "ACEITE" && full ? (
                    <Text style={{ color: "#C62828", marginTop: 4 }}>Atenção: todas as vagas já estão preenchidas.</Text>
                  ) : null}
                  <Field
                    label={answering.status === "RECUSADA" ? "Motivo (obrigatório)" : "Mensagem para a pessoa (opcional)"}
                    value={answerText}
                    onChangeText={setAnswerText}
                    multiline
                    placeholder={answering.status === "ACEITE" ? "Ex: Apareça no centro comunitário na segunda-feira, às 9h" : ""}
                  />
                  <View style={u.row}>
                    <Btn label={busy ? "A enviar..." : "Enviar"} onPress={sendAnswer} disabled={busy} />
                    <Btn kind="outline" label="Cancelar" onPress={() => setAnswering(null)} />
                  </View>
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Page>
  );
}
