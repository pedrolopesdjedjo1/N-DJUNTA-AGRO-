import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import {
  getOpportunity,
  applyToOpportunity,
  withdrawApplication,
  closeOpportunity,
  reopenOpportunity,
  deleteOpportunity,
} from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { APPLICATION_STATUS_COLOR, colorOf } from "../constants/ngo";
import { OPPORTUNITY_ICON, amountText, contactAction, deadlineInfo } from "../constants/ngoContent";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const PHONE = /^[+\d][\d\s-]{5,19}$/;

export default function NgoOpportunityScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const { user } = useAuth();
  const catalog = useNgoCatalog();

  const loader = useLoader(() => getOpportunity(id), null as any, [id]);
  const d: any = loader.data;

  const [showApply, setShowApply] = useState(false);
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState<string>((user as any)?.phone ?? "");
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
        <Title>Oportunidade</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const o = d.opportunity;
  const application = d.application;
  const deadline = deadlineInfo(o);
  const amount = amountText(o.amount, o.kind);
  const contact = contactAction(o.contact);
  const orgName = o.organization?.name ?? "Organização";

  async function apply() {
    if (phone.trim() && !PHONE.test(phone.trim())) {
      Alert.alert("Atenção", "Telefone inválido.");
      return;
    }

    setBusy(true);
    try {
      await applyToOpportunity(id, { message: message.trim() || undefined, phone: phone.trim() || undefined });
      setShowApply(false);
      setMessage("");
      Alert.alert("Candidatura enviada", "A organização recebeu a sua candidatura e vai responder aqui no app.");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a candidatura."));
    } finally {
      setBusy(false);
    }
  }

  function withdraw() {
    Alert.alert("Retirar candidatura", "Quer retirar a sua candidatura?", [
      { text: "Não", style: "cancel" },
      {
        text: "Retirar",
        style: "destructive",
        onPress: async () => {
          try {
            await withdrawApplication(id);
            loader.reload();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível retirar a candidatura."));
          }
        },
      },
    ]);
  }

  async function ownerAction(work: () => Promise<any>, fail: string, goBack = false) {
    setBusy(true);
    try {
      await work();
      if (goBack) navigation.goBack();
      else loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function closeIt() {
    Alert.alert("Fechar oportunidade", "As pessoas deixam de poder candidatar-se. Fechar?", [
      { text: "Não", style: "cancel" },
      { text: "Fechar", onPress: () => ownerAction(() => closeOpportunity(id), "Não foi possível fechar.") },
    ]);
  }

  function removeIt() {
    Alert.alert("Apagar oportunidade", "Apagar esta oportunidade?", [
      { text: "Não", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => ownerAction(() => deleteOpportunity(id), "Não foi possível apagar.", true) },
    ]);
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>
            {OPPORTUNITY_ICON[o.kind] ?? "📢"} {o.title}
          </Title>
        </View>
        <Badge label={deadline.label} color={deadline.color} />
      </View>
      <Text style={u.muted}>{labelOf(catalog.opportunityKinds, o.kind)}</Text>

      <Card>
        <View style={[u.row, { alignItems: "center" }]}>
          {o.organization?.logoUrl ? <Image source={{ uri: o.organization.logoUrl }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 10 }} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={u.muted}>Publicada por</Text>
            <Text style={u.strong}>
              {orgName} {o.organization?.isVerified ? "✅" : ""}
            </Text>
          </View>
        </View>
        <View style={u.row}>
          {o.organization?.role === "ONG" ? (
            <Btn small kind="outline" label="Ver organização" onPress={() => navigation.navigate("NgoPublicOrganization", { id: o.ownerId })} />
          ) : null}
          {!o.isMine ? (
            <Btn small kind="outline" label="💬 Contactar" onPress={() => navigation.navigate("Chat", { userId: o.ownerId, userName: orgName })} />
          ) : null}
        </View>
      </Card>

      <Card>
        {o.region ? <Text>📍 {o.region}</Text> : null}
        {o.area ? <Text style={u.muted}>🏷️ {labelOf(catalog.areas, o.area)}</Text> : null}
        {amount ? <Text style={[u.strong, { marginTop: 4 }]}>💰 {amount}</Text> : null}
        {o.slots ? <Text style={u.muted}>👥 {o.slots} vaga(s)</Text> : null}
        {o.deadline ? <Text style={u.muted}>🗓️ Data limite: {formatDate(o.deadline)}</Text> : <Text style={u.muted}>🗓️ Sem data limite</Text>}
        <Text style={u.muted}>Publicada em {formatDate(o.createdAt)}</Text>
      </Card>

      <SubTitle>Sobre a oportunidade</SubTitle>
      <Text style={{ lineHeight: 21 }}>{o.description}</Text>

      {o.requirements ? (
        <>
          <SubTitle>Quem pode candidatar-se</SubTitle>
          <Text style={{ lineHeight: 21 }}>{o.requirements}</Text>
        </>
      ) : null}

      {o.benefits ? (
        <>
          <SubTitle>O que a pessoa recebe</SubTitle>
          <Text style={{ lineHeight: 21 }}>{o.benefits}</Text>
        </>
      ) : null}

      {contact || o.link ? (
        <>
          <SubTitle>Mais informações</SubTitle>
          {contact ? (
            contact.kind === "text" ? (
              <Text>📇 {contact.value}</Text>
            ) : (
              <Btn
                small
                kind="outline"
                label={contact.kind === "phone" ? `📞 Ligar ${contact.value}` : `✉️ ${contact.value}`}
                onPress={() => Linking.openURL(contact.kind === "phone" ? `tel:${contact.value}` : `mailto:${contact.value}`)}
              />
            )
          ) : null}
          {o.link ? <Btn small kind="outline" label="🔗 Abrir o link" onPress={() => Linking.openURL(o.link)} /> : null}
        </>
      ) : null}

      {o.isMine ? (
        <>
          <SubTitle>Gerir esta oportunidade</SubTitle>
          <Card>
            <Text style={u.strong}>
              {o.applicationsCount ?? 0} candidatura(s) · {o.pendingCount ?? 0} por analisar · {o.acceptedCount ?? 0} aceite(s)
              {o.slots ? ` de ${o.slots} vagas` : ""}
            </Text>
            <View style={u.row}>
              <Btn small label="📥 Ver candidaturas" onPress={() => navigation.navigate("NgoApplicants", { id })} />
              <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("NgoOpportunityForm", { opportunity: o })} />
              {o.status === "ABERTA" ? (
                <Btn small kind="outline" label="Fechar" onPress={closeIt} disabled={busy} />
              ) : (
                <Btn
                  small
                  kind="outline"
                  label="Reabrir"
                  onPress={() => ownerAction(() => reopenOpportunity(id), "Não foi possível reabrir.")}
                  disabled={busy}
                />
              )}
              {(o.applicationsCount ?? 0) === 0 ? <Btn small kind="danger" label="Apagar" onPress={removeIt} disabled={busy} /> : null}
            </View>
          </Card>
        </>
      ) : (
        <>
          <SubTitle>Candidatura</SubTitle>

          {application ? (
            <Card>
              <View style={u.between}>
                <Text style={u.strong}>A sua candidatura</Text>
                <Badge label={labelOf(catalog.applicationStatus, application.status)} color={colorOf(APPLICATION_STATUS_COLOR, application.status)} />
              </View>
              <Text style={u.muted}>Enviada em {formatDate(application.createdAt)}</Text>
              {application.answer ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={u.strong}>Resposta da organização</Text>
                  <Text style={{ marginTop: 2, lineHeight: 21 }}>{application.answer}</Text>
                </View>
              ) : null}
              {application.status === "ENVIADA" ? <Btn small kind="danger" label="Retirar candidatura" onPress={withdraw} /> : null}
            </Card>
          ) : o.closed ? (
            <Card>
              <Text style={u.muted}>As candidaturas desta oportunidade estão fechadas.</Text>
            </Card>
          ) : (
            <>
              <Btn label={showApply ? "Fechar" : "✅ Candidatar-me"} onPress={() => setShowApply(!showApply)} />
              {showApply ? (
                <Card>
                  <Field
                    label="Mensagem para a organização (opcional)"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    placeholder="Fale de si e porque quer esta oportunidade"
                  />
                  <Field label="Telefone para contacto (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  <Btn label={busy ? "A enviar..." : "Enviar candidatura"} onPress={apply} disabled={busy} />
                </Card>
              ) : null}
            </>
          )}
        </>
      )}
    </Page>
  );
}
