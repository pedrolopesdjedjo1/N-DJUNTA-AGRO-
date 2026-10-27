import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import {
  getTransporterProfile,
  addTransporterDocument,
  deleteTransporterDocument,
  submitTransporterVerification,
} from "../api/transporter";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { useTransportCatalog } from "../utils/transportCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { VERIFICATION_COLOR } from "../constants/transporter";
import { dateToIso, isDateText, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

export default function TransporterVerificationScreen({ navigation }: any) {
  const catalog = useTransportCatalog();
  const loader = useLoader(getTransporterProfile, null as any);
  const d: any = loader.data;

  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("IDENTIFICACAO");
  const [name, setName] = useState("");
  const [expires, setExpires] = useState("");
  const [docBusy, setDocBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>✅ Verificação</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const p = d.profile;
  const verified = p.verificationStatus === "APROVADO" || d.user.isVerified;
  const status = verified ? "APROVADO" : p.verificationStatus;
  const editable = status === "RASCUNHO" || status === "RECUSADO";
  const expiredDocs = (d.documents as any[]).filter((x) => x.expired);

  async function addDocument(fromCamera: boolean) {
    if (name.trim().length < 2) {
      Alert.alert("Atenção", "Escreva primeiro o nome do documento (ex: Carta de condução).");
      return;
    }
    if (expires.trim() && !isDateText(expires.trim())) {
      Alert.alert("Atenção", "A validade deve ser assim: AAAA-MM-DD (ex: 2028-05-30).");
      return;
    }

    const picked = await pickImage(fromCamera);
    if (!picked) return;

    setDocBusy(true);
    try {
      const url = await uploadImageBase64(picked.base64, "doc-transportador-");
      const next = await addTransporterDocument({
        kind,
        name: name.trim(),
        url,
        expiresAt: expires.trim() ? dateToIso(expires.trim()) : undefined,
      });
      loader.setData(next);
      setName("");
      setExpires("");
      setOpen(false);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível juntar o documento."));
    } finally {
      setDocBusy(false);
    }
  }

  function removeDocument(doc: any) {
    Alert.alert("Apagar documento", `Apagar "${doc.name}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            loader.setData(await deleteTransporterDocument(doc.id));
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  async function submit() {
    setBusy(true);
    try {
      loader.setData(await submitTransporterVerification());
      Alert.alert("Enviado", "A equipa do NÔDJUNTA AGRO vai analisar os documentos. Receberá um aviso com a resposta.");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a verificação."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>✅ Verificação</Title>

      <Card>
        <View style={u.between}>
          <Text style={u.strong}>Estado da conta</Text>
          <Badge label={labelOf(catalog.verificationStatus, status) || status} color={VERIFICATION_COLOR[status] ?? "#757575"} />
        </View>

        {status === "APROVADO" ? (
          <Text style={{ marginTop: 6 }}>A sua conta está verificada ✅. Quem encomenda vê o selo no seu perfil e confia mais.</Text>
        ) : status === "PENDENTE" ? (
          <Text style={{ marginTop: 6 }}>Os documentos foram enviados e estão a ser analisados. Receberá um aviso com a resposta.</Text>
        ) : status === "RECUSADO" ? (
          <View style={{ marginTop: 6 }}>
            <Text style={{ color: "#C62828", fontWeight: "bold" }}>A verificação foi recusada.</Text>
            {p.verificationNote ? <Text style={{ marginTop: 4 }}>Motivo: {p.verificationNote}</Text> : null}
            <Text style={u.muted}>Corrija o que for preciso e envie de novo.</Text>
          </View>
        ) : (
          <Text style={{ marginTop: 6 }}>Preencha o perfil, junte os documentos e envie para a equipa analisar.</Text>
        )}
        {status === "RASCUNHO" && p.verificationNote ? <Text style={[u.muted, { marginTop: 4 }]}>{p.verificationNote}</Text> : null}
      </Card>

      <SubTitle>O que falta</SubTitle>
      <Card>
        {d.checklist.items.map((item: any) => (
          <Text key={item.key} style={{ marginTop: 4, color: item.done ? "#2E7D32" : "#C62828" }}>
            {item.done ? "✓" : "✗"} {item.label}
          </Text>
        ))}
        <Btn small kind="outline" label="✏️ Editar perfil e veículo" onPress={() => navigation.navigate("TransporterProfileForm")} />
      </Card>

      <SubTitle>Documentos ({d.documents.length})</SubTitle>
      <Text style={u.muted}>Envie fotos legíveis. Só você e a equipa os veem. Os documentos fora do prazo travam o envio.</Text>

      {d.documents.length === 0 ? (
        <Empty text="Ainda não juntou documentos." />
      ) : (
        d.documents.map((doc: any) => (
          <Card key={doc.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{doc.name}</Text>
              {doc.expired ? <Badge label="Fora do prazo" color="#C62828" /> : doc.expiringSoon ? <Badge label="Termina em breve" color="#EF6C00" /> : null}
            </View>
            <Text style={u.muted}>
              {labelOf(catalog.documentKinds, doc.kind)} · {formatDate(doc.createdAt)}
            </Text>
            {doc.expiresAt ? <Text style={u.muted}>Válido até {formatDate(doc.expiresAt)}</Text> : null}
            <View style={u.row}>
              <Btn small kind="outline" label="Abrir" onPress={() => Linking.openURL(doc.url)} />
              <Btn small kind="danger" label="Apagar" onPress={() => removeDocument(doc)} />
            </View>
          </Card>
        ))
      )}

      <Btn small kind="outline" label={open ? "Fechar" : "➕ Juntar documento"} onPress={() => setOpen(!open)} />
      {open ? (
        <Card>
          <ChipGroup label="Tipo de documento" options={catalog.documentKinds} value={kind} onChange={setKind} />
          <Field label="Nome do documento" value={name} onChangeText={setName} placeholder="Ex: Carta de condução" />
          <Field label="Válido até (AAAA-MM-DD, opcional)" value={expires} onChangeText={setExpires} placeholder={todayText(365)} />
          <View style={u.row}>
            <Btn small kind="outline" label="📷 Foto da galeria" onPress={() => addDocument(false)} disabled={docBusy} />
            <Btn small kind="outline" label="📸 Tirar foto" onPress={() => addDocument(true)} disabled={docBusy} />
          </View>
          {docBusy ? <Text style={u.muted}>A enviar o documento...</Text> : null}
        </Card>
      ) : null}

      {editable ? (
        <>
          {expiredDocs.length > 0 ? (
            <Text style={{ color: "#C62828", marginTop: 8 }}>⛔ Apague os documentos fora do prazo e envie documentos válidos.</Text>
          ) : null}
          <Btn
            label={busy ? "A enviar..." : status === "RECUSADO" ? "Enviar de novo para verificação" : "Enviar para verificação"}
            onPress={submit}
            disabled={busy || !d.checklist.canSubmit || expiredDocs.length > 0}
          />
          {!d.checklist.canSubmit ? <Text style={u.muted}>Para enviar falta: {d.checklist.missing.join(", ")}.</Text> : null}
        </>
      ) : null}

      <Btn kind="outline" label="Voltar ao perfil" onPress={() => navigation.goBack()} />
    </Page>
  );
}
