import React, { useCallback, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listRequests, answerRequest, requestToBeneficiary, listNgoProjects } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { REQUEST_STATUS_COLOR, colorOf } from "../constants/ngo";
import { ROLE_LABEL } from "../utils/roles";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY = { counts: { newMine: 0, open: 0 }, items: [] as any[], projects: [] as any[] };

const ANSWER_TITLE: Record<string, string> = {
  ACEITE: "Aceitar o pedido",
  RECUSADO: "Recusar o pedido",
  CONCLUIDO: "Concluir o pedido",
};

export default function NgoRequestsScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const [scope, setScope] = useState<"mine" | "open">("mine");
  const [status, setStatus] = useState("");

  const loader = useLoader(
    async () => {
      const [list, projects] = await Promise.all([
        listRequests({ scope, status: scope === "mine" ? status : "" }),
        listNgoProjects().catch(() => ({ projects: [] })),
      ]);
      return { counts: list.counts, items: list.items, projects: (projects as any).projects };
    },
    EMPTY,
    [scope, status]
  );
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const [answering, setAnswering] = useState<{ id: string; status: string } | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [benFor, setBenFor] = useState<string>("");
  const [benProject, setBenProject] = useState("");
  const [busy, setBusy] = useState(false);

  function openAnswer(id: string, next: string) {
    setBenFor("");
    setAnswering({ id, status: next });
    setAnswerText("");
  }

  async function quick(id: string, next: string) {
    setBusy(true);
    try {
      await answerRequest(id, { status: next });
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível atualizar o pedido."));
    } finally {
      setBusy(false);
    }
  }

  async function sendAnswer() {
    if (!answering) return;
    const text = answerText.trim();
    if (answering.status === "RECUSADO" && text.length < 3) {
      Alert.alert("Atenção", "Explique o motivo, para a pessoa perceber.");
      return;
    }

    setBusy(true);
    try {
      await answerRequest(answering.id, { status: answering.status, answer: text || undefined });
      setAnswering(null);
      setAnswerText("");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível responder."));
    } finally {
      setBusy(false);
    }
  }

  async function registerBeneficiary(id: string) {
    setBusy(true);
    try {
      await requestToBeneficiary(id, { projectId: benProject || undefined });
      setBenFor("");
      setBenProject("");
      Alert.alert("Pronto", "A pessoa foi registada como beneficiária.");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível registar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>🙋 Pedidos de apoio</Title>

      <View style={u.row}>
        <Chip label={`Para a minha organização${d.counts.newMine ? ` (${d.counts.newMine} novos)` : ""}`} active={scope === "mine"} onPress={() => setScope("mine")} />
        <Chip label={`Abertos a todas (${d.counts.open})`} active={scope === "open"} onPress={() => setScope("open")} />
      </View>

      {scope === "mine" ? (
        <ChipGroup options={catalog.requestStatus} value={status} onChange={setStatus} allowEmpty scroll />
      ) : (
        <Text style={[u.muted, { marginTop: 8 }]}>
          Pedidos de pessoas que não escolheram uma organização. Quando assume um, passa a ser seu e a pessoa é avisada.
        </Text>
      )}

      {d.items.length === 0 ? (
        <Empty text={scope === "mine" ? "Ainda não recebeu pedidos de apoio." : "Não há pedidos abertos neste momento."} />
      ) : (
        d.items.map((r: any) => {
          const isOpen = r.isOpenRequest;
          const isAnswering = answering?.id === r.id;

          return (
            <Card key={r.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{r.title}</Text>
                <Badge label={labelOf(catalog.requestStatus, r.status)} color={colorOf(REQUEST_STATUS_COLOR, r.status)} />
              </View>

              <Text style={u.muted}>{labelOf(catalog.needCategories, r.category)}</Text>
              <Text style={{ marginTop: 6, lineHeight: 21 }}>{r.message}</Text>

              <Text style={[u.muted, { marginTop: 6 }]}>
                👤 {r.requester?.name ?? "Pessoa"}
                {r.requester?.isVerified ? " ✅" : ""}
                {r.requester ? ` · ${ROLE_LABEL[r.requester.role] ?? r.requester.role}` : ""}
              </Text>
              {r.community || r.region ? (
                <Text style={u.muted}>
                  📍 {[r.community, r.region].filter(Boolean).join(", ")}
                </Text>
              ) : null}
              <Text style={u.muted}>Recebido em {formatDate(r.createdAt)}</Text>
              {r.answer ? <Text style={[u.muted, { marginTop: 4 }]}>💬 Resposta: {r.answer}</Text> : null}

              <View style={u.row}>
                {r.requester ? (
                  <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: r.requester.id, userName: r.requester.name })} />
                ) : null}

                {r.status === "NOVO" ? <Btn small kind="outline" label="🔍 Em análise" onPress={() => quick(r.id, "EM_ANALISE")} disabled={busy} /> : null}
                {r.status === "NOVO" || r.status === "EM_ANALISE" ? <Btn small label="✅ Aceitar" onPress={() => openAnswer(r.id, "ACEITE")} /> : null}
                {!isOpen && (r.status === "NOVO" || r.status === "EM_ANALISE") ? (
                  <Btn small kind="danger" label="Recusar" onPress={() => openAnswer(r.id, "RECUSADO")} />
                ) : null}
                {!isOpen && r.status === "ACEITE" ? <Btn small label="🏁 Concluir" onPress={() => openAnswer(r.id, "CONCLUIDO")} /> : null}
                {!isOpen && (r.status === "ACEITE" || r.status === "CONCLUIDO") ? (
                  <Btn
                    small
                    kind="outline"
                    label="👥 Registar como beneficiário"
                    onPress={() => {
                      setAnswering(null);
                      setBenFor(benFor === r.id ? "" : r.id);
                      setBenProject("");
                    }}
                  />
                ) : null}
              </View>

              {isAnswering && answering ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={u.strong}>{ANSWER_TITLE[answering.status]}</Text>
                  <Field
                    label={answering.status === "RECUSADO" ? "Motivo (obrigatório)" : "Mensagem para a pessoa (opcional)"}
                    value={answerText}
                    onChangeText={setAnswerText}
                    multiline
                    placeholder={answering.status === "ACEITE" ? "Ex: Vamos visitar a comunidade na próxima semana" : ""}
                  />
                  <View style={u.row}>
                    <Btn label={busy ? "A enviar..." : "Enviar"} onPress={sendAnswer} disabled={busy} />
                    <Btn kind="outline" label="Cancelar" onPress={() => setAnswering(null)} />
                  </View>
                </View>
              ) : null}

              {benFor === r.id ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={u.strong}>Registar em que projeto?</Text>
                  <View style={u.row}>
                    <Chip label="Sem projeto" active={benProject === ""} onPress={() => setBenProject("")} />
                    {d.projects.map((p: any) => (
                      <Chip key={p.id} label={p.name} active={benProject === p.id} onPress={() => setBenProject(benProject === p.id ? "" : p.id)} />
                    ))}
                  </View>
                  <Btn label={busy ? "A registar..." : "Registar beneficiário"} onPress={() => registerBeneficiary(r.id)} disabled={busy} />
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Page>
  );
}
