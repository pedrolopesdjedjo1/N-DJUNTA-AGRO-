import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import MediaGallery from "../components/ngo/MediaGallery";
import ReportTimeline from "../components/gov/ReportTimeline";
import {
  getReport,
  setReportStatus,
  respondReport,
  noteReport,
  setReportPriority,
  forwardReport,
} from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { ROLE_LABEL } from "../utils/roles";
import { REPORT_ICON, REPORT_STATUS_COLOR } from "../constants/gov";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

type Panel = "" | "RESOLVIDO" | "REJEITADO" | "respond" | "note" | "forward";

// Tratar um pedido ou uma denúncia (instituições públicas)
export default function GovReportScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useGovCatalog();
  const loader = useLoader(() => getReport(id), null as any, [id]);
  const d: any = loader.data;

  const [panel, setPanel] = useState<Panel>("");
  const [text, setText] = useState("");
  const [target, setTarget] = useState("");
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
        <Title>Pedido</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const r = d.report;
  const requester = r.requester;
  const open = !!r.isOpenRequest;
  const closed = r.status === "RESOLVIDO" || r.status === "REJEITADO";
  const media = (r.imageUrls ?? []).map((url: string, i: number) => ({ id: `${i}`, kind: "IMAGE", url, caption: "" }));
  const hasCoords = r.lat !== null && r.lng !== null && r.lat !== undefined;
  const institutions: any[] = d.institutions ?? [];

  function openPanel(next: Panel) {
    setPanel(panel === next ? "" : next);
    setText("");
    setTarget("");
  }

  async function run(work: () => Promise<any>, fail: string, afterOk?: () => void) {
    setBusy(true);
    try {
      loader.setData(await work());
      setPanel("");
      setText("");
      setTarget("");
      if (afterOk) afterOk();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function assume() {
    Alert.alert("Assumir o pedido", "O pedido passa a ser da sua instituição e a pessoa é avisada. Assumir?", [
      { text: "Não", style: "cancel" },
      { text: "Assumir", onPress: () => run(() => setReportStatus(id, { status: "EM_ANALISE" }), "Não foi possível assumir o pedido.") },
    ]);
  }

  function startAnalysis() {
    run(() => setReportStatus(id, { status: "EM_ANALISE" }), "Não foi possível mudar o estado.");
  }

  function closeReport() {
    const status = panel as "RESOLVIDO" | "REJEITADO";
    if (status === "REJEITADO" && text.trim().length < 3) {
      Alert.alert("Atenção", "Explique o motivo, para a pessoa perceber.");
      return;
    }
    run(() => setReportStatus(id, { status, answer: text.trim() || undefined }), "Não foi possível mudar o estado.");
  }

  function send() {
    if (text.trim().length < 3) {
      Alert.alert("Atenção", panel === "respond" ? "Escreva a resposta." : "Escreva a nota.");
      return;
    }
    if (panel === "respond") run(() => respondReport(id, text.trim()), "Não foi possível enviar a resposta.");
    else run(() => noteReport(id, text.trim()), "Não foi possível guardar a nota.");
  }

  function forward() {
    if (!target) {
      Alert.alert("Atenção", "Escolha a instituição para onde encaminhar.");
      return;
    }
    const name = institutions.find((i) => i.ownerId === target)?.name ?? "outra instituição";
    Alert.alert("Encaminhar pedido", `O pedido passa para ${name} e deixa de ser seu. Encaminhar?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Encaminhar",
        onPress: async () => {
          setBusy(true);
          try {
            await forwardReport(id, { institutionId: target, message: text.trim() || undefined });
            Alert.alert("Encaminhado", `O pedido segue agora com ${name}.`);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível encaminhar."));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  function togglePriority() {
    const next = r.priority === "URGENTE" ? "NORMAL" : "URGENTE";
    run(() => setReportPriority(id, next), "Não foi possível mudar a prioridade.");
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>
            {REPORT_ICON[r.category] ?? "📝"} {r.title}
          </Title>
        </View>
        <Badge label={labelOf(catalog.reportStatus, r.status)} color={REPORT_STATUS_COLOR[r.status] ?? "#757575"} />
      </View>

      <View style={u.row}>
        {r.priority === "URGENTE" ? <Badge label="Urgente" color="#C62828" /> : null}
        {open ? (
          <View style={{ marginLeft: r.priority === "URGENTE" ? 8 : 0 }}>
            <Badge label="Aberto a todas as instituições" color="#1565C0" />
          </View>
        ) : null}
      </View>

      <Card>
        <Text style={u.muted}>Número de protocolo</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", letterSpacing: 1 }}>{r.protocol}</Text>
        <Text style={u.muted}>
          {labelOf(catalog.reportCategories, r.category)} · recebido em {formatDateTime(r.createdAt)}
        </Text>
      </Card>

      <Card>
        <Text style={u.muted}>Quem enviou</Text>
        {r.anonymous || !requester ? (
          <>
            <Text style={u.strong}>🕶️ Cidadão anónimo</Text>
            <Text style={u.muted}>Não há nome nem contacto. Responda aqui: a pessoa vê a resposta pelo protocolo e pelas notificações.</Text>
          </>
        ) : (
          <>
            <Text style={u.strong}>
              {requester.name} {requester.isVerified ? "✅" : ""}
            </Text>
            <Text style={u.muted}>
              {ROLE_LABEL[requester.role] ?? requester.role}
              {requester.location ? ` · 📍 ${requester.location}` : ""}
            </Text>
            <View style={u.row}>
              <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: requester.id, userName: requester.name })} />
              {requester.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${requester.phone}`)} /> : null}
            </View>
          </>
        )}
      </Card>

      <SubTitle>O pedido</SubTitle>
      <Text style={{ lineHeight: 21 }}>{r.message}</Text>
      {r.region || r.location ? <Text style={[u.muted, { marginTop: 6 }]}>📍 {[r.location, r.region].filter(Boolean).join(", ")}</Text> : null}
      {hasCoords ? <Btn small kind="outline" label="🗺️ Abrir o ponto no mapa" onPress={() => Linking.openURL(`https://www.google.com/maps?q=${r.lat},${r.lng}`)} /> : null}
      {r.place ? (
        <Card>
          <Text style={u.muted}>Local ligado ao pedido</Text>
          <Text style={u.strong}>🏗️ {r.place.name}</Text>
          <Btn small kind="outline" label="Abrir o local" onPress={() => navigation.navigate("GovPlace", { id: r.place.id })} />
        </Card>
      ) : null}
      {media.length > 0 ? <MediaGallery media={media} /> : null}

      <SubTitle>Acompanhamento</SubTitle>
      <ReportTimeline events={d.events} catalog={catalog} />

      {open ? (
        <Card>
          <Text style={u.strong}>Ninguém assumiu este pedido</Text>
          <Text style={u.muted}>Se for da sua área, assuma-o para o poder tratar.</Text>
          <Btn label={busy ? "A assumir..." : "✅ Assumir o pedido"} onPress={assume} disabled={busy} />
        </Card>
      ) : d.canAct ? (
        <>
          <SubTitle>Tratar o pedido</SubTitle>

          <View style={u.row}>
            {r.status === "RECEBIDO" || r.status === "ENCAMINHADO" ? <Btn small label="🔍 Pôr em análise" onPress={startAnalysis} disabled={busy} /> : null}
            {!closed ? <Btn small label="✅ Resolvido" onPress={() => openPanel("RESOLVIDO")} /> : null}
            {!closed ? <Btn small kind="danger" label="Não aceitar" onPress={() => openPanel("REJEITADO")} /> : null}
            {closed ? <Btn small kind="outline" label="Reabrir (em análise)" onPress={startAnalysis} disabled={busy} /> : null}
          </View>

          <View style={u.row}>
            <Btn small kind="outline" label="💬 Responder ao cidadão" onPress={() => openPanel("respond")} />
            <Btn small kind="outline" label="🔒 Nota interna" onPress={() => openPanel("note")} />
            {!closed ? <Btn small kind="outline" label="➡️ Encaminhar" onPress={() => openPanel("forward")} /> : null}
            <Btn small kind="outline" label={r.priority === "URGENTE" ? "Tirar urgência" : "🚨 Marcar urgente"} onPress={togglePriority} disabled={busy} />
          </View>

          {panel === "RESOLVIDO" || panel === "REJEITADO" ? (
            <Card>
              <Text style={u.strong}>{panel === "RESOLVIDO" ? "Marcar como resolvido" : "Não aceitar o pedido"}</Text>
              <Field
                label={panel === "REJEITADO" ? "Motivo (obrigatório, a pessoa vê)" : "Mensagem para a pessoa (opcional)"}
                value={text}
                onChangeText={setText}
                multiline
                placeholder={panel === "RESOLVIDO" ? "Ex: A ponte foi reparada em 20 de outubro" : "Ex: Este pedido é da competência de outra instituição"}
              />
              <View style={u.row}>
                <Btn label={busy ? "A guardar..." : "Confirmar"} onPress={closeReport} disabled={busy} />
                <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
              </View>
            </Card>
          ) : null}

          {panel === "respond" || panel === "note" ? (
            <Card>
              <Text style={u.strong}>{panel === "respond" ? "Responder ao cidadão" : "Nota interna"}</Text>
              <Text style={u.muted}>
                {panel === "respond" ? "A pessoa recebe a resposta e um aviso." : "Só as instituições veem esta nota. O cidadão não."}
              </Text>
              <Field value={text} onChangeText={setText} multiline placeholder={panel === "respond" ? "Escreva a resposta" : "Escreva a nota"} />
              <View style={u.row}>
                <Btn label={busy ? "A enviar..." : panel === "respond" ? "Enviar resposta" : "Guardar nota"} onPress={send} disabled={busy} />
                <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
              </View>
            </Card>
          ) : null}

          {panel === "forward" ? (
            <Card>
              <Text style={u.strong}>Encaminhar para outra instituição</Text>
              {institutions.length === 0 ? (
                <Text style={u.muted}>Não há outras instituições registadas no app.</Text>
              ) : (
                <>
                  <View style={u.row}>
                    {institutions.map((i) => (
                      <Chip key={i.ownerId} label={i.acronym || i.name} active={target === i.ownerId} onPress={() => setTarget(target === i.ownerId ? "" : i.ownerId)} />
                    ))}
                  </View>
                  <Field label="Mensagem (opcional)" value={text} onChangeText={setText} multiline placeholder="Porque encaminha este pedido" />
                  <View style={u.row}>
                    <Btn label={busy ? "A encaminhar..." : "Encaminhar"} onPress={forward} disabled={busy} />
                    <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
                  </View>
                </>
              )}
            </Card>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
