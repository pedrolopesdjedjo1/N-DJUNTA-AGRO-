import React, { useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Field, useLoader, u } from "../components/ui";
import { colors } from "../theme/colors";
import { api } from "../api/client";
import { pickImage, uploadImageBase64, PickedImage } from "../utils/storage";

const TIPOS = [
  { value: "BI", label: "Bilhete de identidade" },
  { value: "PASSAPORTE", label: "Passaporte" },
  { value: "CARTA_CONDUCAO", label: "Carta de condução" },
  { value: "CARTAO_ELEITOR", label: "Cartão de eleitor" },
  { value: "OUTRO", label: "Outro documento" },
];

const ESTADO: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Em análise", color: colors.gold },
  APROVADA: { label: "Aprovada", color: colors.primary },
  RECUSADA: { label: "Recusada", color: colors.error },
};

function erro(e: any) {
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || "Ocorreu um erro. Tente novamente.";
}

export default function VerificationScreen() {
  const loader = useLoader<any>(async () => (await api.get("/api/platform/identity/mine")).data, { isVerified: false, items: [] }, []);
  const [kind, setKind] = useState("BI");
  const [doc, setDoc] = useState<PickedImage | null>(null);
  const [selfie, setSelfie] = useState<PickedImage | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const data = loader.data || { isVerified: false, items: [] };
  const items: any[] = Array.isArray(data.items) ? data.items : [];
  const pending = items.some((i) => i.status === "PENDENTE");

  async function escolher(setter: (p: PickedImage | null) => void, camera: boolean) {
    const p = await pickImage(camera, [4, 3]);
    if (p) setter(p);
  }

  async function enviar() {
    if (!doc?.base64) {
      Alert.alert("Atenção", "Tire ou escolha a foto do documento.");
      return;
    }
    setBusy(true);
    try {
      const documentUrl = await uploadImageBase64(doc.base64, "id-");
      const selfieUrl = selfie?.base64 ? await uploadImageBase64(selfie.base64, "selfie-") : undefined;
      await api.post("/api/platform/identity", { documentKind: kind, documentUrl, selfieUrl, note: note.trim() || undefined });
      setDoc(null);
      setSelfie(null);
      setNote("");
      loader.onRefresh();
      Alert.alert("Enviado", "O seu pedido foi enviado e vai ser analisado.");
    } catch (e) {
      Alert.alert("Erro", erro(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>Verificação de identidade</Title>

      {data.isVerified ? (
        <Card>
          <Badge label="✅ Conta verificada" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>A sua conta já está verificada. Obrigado!</Text>
        </Card>
      ) : (
        <>
          <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
            Envie uma foto do seu documento para receber o selo de conta verificada. Isto dá mais confiança a quem compra e vende consigo.
          </Text>

          {pending ? (
            <Card>
              <Badge label="Em análise" color={colors.gold} />
              <Text style={{ color: colors.text, marginTop: 8 }}>O seu pedido está a ser analisado. Vai receber uma notificação.</Text>
            </Card>
          ) : (
            <Card>
              <Text style={u.label}>Tipo de documento</Text>
              <View style={u.row}>
                {TIPOS.map((t) => (
                  <Chip key={t.value} label={t.label} active={kind === t.value} onPress={() => setKind(t.value)} />
                ))}
              </View>

              <SubTitle>Foto do documento</SubTitle>
              {doc ? <Image source={{ uri: doc.uri }} style={{ width: "100%", height: 190, borderRadius: 12, marginBottom: 10 }} resizeMode="cover" /> : null}
              <View style={u.row}>
                <Btn small kind="outline" label="📷 Câmara" onPress={() => escolher(setDoc, true)} />
                <View style={{ width: 8 }} />
                <Btn small kind="outline" label="🖼 Galeria" onPress={() => escolher(setDoc, false)} />
              </View>

              <SubTitle>Selfie com o documento (opcional)</SubTitle>
              {selfie ? <Image source={{ uri: selfie.uri }} style={{ width: "100%", height: 190, borderRadius: 12, marginBottom: 10 }} resizeMode="cover" /> : null}
              <View style={u.row}>
                <Btn small kind="outline" label="📷 Câmara" onPress={() => escolher(setSelfie, true)} />
                <View style={{ width: 8 }} />
                <Btn small kind="outline" label="🖼 Galeria" onPress={() => escolher(setSelfie, false)} />
              </View>

              <View style={{ height: 12 }} />
              <Field label="Nota (opcional)" value={note} onChangeText={setNote} multiline placeholder="Algo que a equipa deva saber" />
              <Btn label={busy ? "A enviar..." : "Enviar pedido"} onPress={enviar} disabled={busy} />
            </Card>
          )}
        </>
      )}

      {items.length > 0 ? <SubTitle>Os meus pedidos</SubTitle> : null}
      {items.map((i: any) => {
        const st = ESTADO[i.status] || { label: i.status, color: colors.muted };
        const tipo = TIPOS.find((t) => t.value === i.documentKind)?.label || i.documentKind;
        return (
          <Card key={i.id}>
            <View style={u.between}>
              <Text style={{ fontWeight: "800", color: colors.text, flex: 1 }}>{tipo}</Text>
              <Badge label={st.label} color={st.color} />
            </View>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{new Date(i.createdAt).toLocaleDateString("pt-PT")}</Text>
            {i.reviewNote ? <Text style={{ color: colors.textSecondary, marginTop: 6 }}>Resposta: {i.reviewNote}</Text> : null}
          </Card>
        );
      })}
    </Page>
  );
}
