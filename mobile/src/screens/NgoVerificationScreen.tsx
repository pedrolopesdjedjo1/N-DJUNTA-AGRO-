import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getOrganization, saveOrganization, addOrgDocument, deleteOrgDocument, submitOrgVerification } from "../api/ngo";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { VERIFICATION_STATUS } from "../constants/ngo";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const PHONE = /^[+\d][\d\s-]{5,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NgoVerificationScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const loader = useLoader(getOrganization, null as any);
  const d: any = loader.data;

  const [filled, setFilled] = useState(false);
  const [registration, setRegistration] = useState("");
  const [respName, setRespName] = useState("");
  const [respRole, setRespRole] = useState("");
  const [respPhone, setRespPhone] = useState("");
  const [respEmail, setRespEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const [docKind, setDocKind] = useState("REGISTO_OFICIAL");
  const [docName, setDocName] = useState("");
  const [docBusy, setDocBusy] = useState(false);

  useEffect(() => {
    if (filled || loader.loading || !d) return;
    const o = d.organization;
    setRegistration(o.registrationNumber ?? "");
    setRespName(o.responsibleName ?? "");
    setRespRole(o.responsibleRole ?? "");
    setRespPhone(o.responsiblePhone ?? "");
    setRespEmail(o.responsibleEmail ?? "");
    setPhone(o.phone ?? "");
    setEmail(o.email ?? "");
    setFilled(true);
  }, [loader.loading, d]);

  useFocusEffect(
    useCallback(() => {
      if (filled) loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filled])
  );

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>✅ Verificação da organização</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const o = d.organization;
  const ver = d.verification;
  const info = VERIFICATION_STATUS[ver.status] ?? VERIFICATION_STATUS.NAO_ENVIADO;
  const editable = ver.status === "NAO_ENVIADO" || ver.status === "RECUSADO";
  const approved = ver.status === "APROVADO";

  function validate(): boolean {
    if (phone.trim() && !PHONE.test(phone.trim())) {
      Alert.alert("Atenção", "Telefone da organização inválido.");
      return false;
    }
    if (email.trim() && !EMAIL.test(email.trim())) {
      Alert.alert("Atenção", "E-mail da organização inválido.");
      return false;
    }
    if (respPhone.trim() && !PHONE.test(respPhone.trim())) {
      Alert.alert("Atenção", "Telefone do responsável inválido.");
      return false;
    }
    if (respEmail.trim() && !EMAIL.test(respEmail.trim())) {
      Alert.alert("Atenção", "E-mail do responsável inválido.");
      return false;
    }
    return true;
  }

  async function persist(): Promise<boolean> {
    try {
      const result = await saveOrganization({
        registrationNumber: registration.trim(),
        responsibleName: respName.trim(),
        responsibleRole: respRole.trim(),
        responsiblePhone: respPhone.trim(),
        responsibleEmail: respEmail.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      loader.setData(result);
      return true;
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar os dados."));
      return false;
    }
  }

  async function saveDetails() {
    if (!validate()) return;

    const run = async () => {
      setBusy(true);
      const ok = await persist();
      setBusy(false);
      if (ok) Alert.alert("Pronto", "Dados guardados.");
    };

    const changedRegistration = registration.trim() !== (o.registrationNumber ?? "");
    if (approved && changedRegistration) {
      Alert.alert(
        "Mudar o registo oficial",
        "Ao mudar o número do registo oficial, a organização perde o selo de verificada até ser analisada de novo. Continuar?",
        [
          { text: "Não", style: "cancel" },
          { text: "Continuar", style: "destructive", onPress: run },
        ]
      );
      return;
    }
    await run();
  }

  async function submit() {
    if (!validate()) return;

    setBusy(true);
    try {
      const saved = await persist();
      if (!saved) return;

      const result = await submitOrgVerification();
      loader.setData(result);
      Alert.alert("Enviado", "A equipa do NÔDJUNTA AGRO vai analisar os documentos. Receberá um aviso com a resposta.");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a verificação."));
    } finally {
      setBusy(false);
    }
  }

  async function addDocument(fromCamera: boolean) {
    if (docName.trim().length < 2) {
      Alert.alert("Atenção", "Escreva primeiro o nome do documento (ex: Registo da associação).");
      return;
    }

    const picked = await pickImage(fromCamera);
    if (!picked) return;

    setDocBusy(true);
    try {
      const url = await uploadImageBase64(picked.base64, "doc-ong-");
      const result = await addOrgDocument({ kind: docKind, name: docName.trim(), url });
      loader.setData(result);
      setDocName("");
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
            loader.setData(await deleteOrgDocument(doc.id));
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <Title>✅ Verificação da organização</Title>

      <Card>
        <View style={u.between}>
          <Text style={u.strong}>Estado da verificação</Text>
          <Badge label={info.label} color={info.color} />
        </View>

        {approved ? (
          <Text style={{ marginTop: 6 }}>A sua organização é uma ONG verificada ✅. O selo aparece no perfil, nos projetos e nas publicações.</Text>
        ) : ver.status === "PENDENTE" ? (
          <Text style={{ marginTop: 6 }}>Os documentos foram enviados e estão a ser analisados pela equipa. Receberá um aviso com a resposta.</Text>
        ) : ver.status === "RECUSADO" ? (
          <View style={{ marginTop: 6 }}>
            <Text style={{ color: "#C62828", fontWeight: "bold" }}>A verificação foi recusada.</Text>
            {ver.note ? <Text style={{ marginTop: 4 }}>Motivo: {ver.note}</Text> : null}
            <Text style={u.muted}>Corrija o que for preciso e envie de novo.</Text>
          </View>
        ) : (
          <Text style={{ marginTop: 6 }}>Preencha os dados, junte o documento do registo oficial e envie para a equipa analisar.</Text>
        )}
        {ver.status !== "RECUSADO" && ver.note && !approved ? <Text style={u.muted}>{ver.note}</Text> : null}
      </Card>

      <SubTitle>O que falta</SubTitle>
      <Card>
        {ver.items.map((item: any) => (
          <Text key={item.key} style={{ marginTop: 4, color: item.done ? "#2E7D32" : "#C62828" }}>
            {item.done ? "✓" : "✗"} {item.label}
          </Text>
        ))}
      </Card>

      <SubTitle>Registo oficial</SubTitle>
      <Field
        label="Número do registo oficial"
        value={registration}
        onChangeText={setRegistration}
        placeholder="Número do registo da organização"
      />

      <SubTitle>Responsável pela organização</SubTitle>
      <Field label="Nome do responsável" value={respName} onChangeText={setRespName} />
      <Field label="Cargo (opcional)" value={respRole} onChangeText={setRespRole} placeholder="Ex: Presidente, Diretor executivo" />
      <Field label="Telefone do responsável" value={respPhone} onChangeText={setRespPhone} keyboardType="phone-pad" />
      <Field label="E-mail do responsável (opcional)" value={respEmail} onChangeText={setRespEmail} keyboardType="email-address" autoCapitalize="none" />

      <SubTitle>Contactos da organização</SubTitle>
      <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      <Btn kind="outline" label={busy ? "A guardar..." : "Guardar dados"} onPress={saveDetails} disabled={busy} />

      <SubTitle>Documentos da organização ({d.documents.length})</SubTitle>
      <Text style={u.muted}>
        Envie fotos ou digitalizações legíveis. Para ser verificada precisa do documento do registo oficial. Os documentos ficam, por agora, no armazenamento de fotos do app: envie só o necessário.
      </Text>

      {d.documents.length === 0 ? (
        <Empty text="Ainda não juntou documentos." />
      ) : (
        d.documents.map((doc: any) => (
          <Card key={doc.id}>
            <Text style={u.strong}>{doc.name}</Text>
            <Text style={u.muted}>
              {labelOf(catalog.documentKinds, doc.kind)} · {formatDate(doc.createdAt)}
            </Text>
            <View style={u.row}>
              <Btn small kind="outline" label="Abrir" onPress={() => Linking.openURL(doc.url)} />
              <Btn small kind="danger" label="Apagar" onPress={() => removeDocument(doc)} />
            </View>
          </Card>
        ))
      )}

      <Card>
        <Text style={u.strong}>Juntar documento</Text>
        <ChipGroup label="Tipo de documento" options={catalog.documentKinds} value={docKind} onChange={setDocKind} />
        <Field label="Nome do documento" value={docName} onChangeText={setDocName} placeholder="Ex: Registo da associação (2019)" />
        <View style={u.row}>
          <Btn small kind="outline" label="📷 Foto da galeria" onPress={() => addDocument(false)} disabled={docBusy} />
          <Btn small kind="outline" label="📸 Tirar foto" onPress={() => addDocument(true)} disabled={docBusy} />
        </View>
        {docBusy ? <Text style={u.muted}>A enviar o documento...</Text> : null}
      </Card>

      {editable ? (
        <>
          <Btn
            label={busy ? "A enviar..." : ver.status === "RECUSADO" ? "Enviar de novo para verificação" : "Enviar para verificação"}
            onPress={submit}
            disabled={busy}
          />
          {!ver.canSubmit ? <Text style={u.muted}>Para enviar falta: {ver.missing.join(", ")}. Preencha os dados e guarde.</Text> : null}
        </>
      ) : null}

      <Btn kind="outline" label="Voltar ao perfil" onPress={() => navigation.goBack()} />
    </Page>
  );
}
