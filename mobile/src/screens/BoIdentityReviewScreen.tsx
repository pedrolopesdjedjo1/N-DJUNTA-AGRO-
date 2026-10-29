import React, { useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getBoIdentity, reviewBoIdentity } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

const STATUS_COLOR: Record<string, string> = { PENDENTE: "#F9A825", APROVADA: "#2E7D32", RECUSADA: "#C62828" };

export default function BoIdentityReviewScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoIdentity(id), null as any, [id]);
  const d: any = loader.data;

  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!d) {
    return (
      <AdminLayout active="BoUsers">
        <Page loader={loader}>
          <Title>Verificação</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const item = d.item;
  const user = d.user;
  const pending = item.status === "PENDENTE";

  async function decide(approve: boolean) {
    if (!approve && note.trim().length < 3) {
      Alert.alert("Atenção", "Explique o motivo da recusa, para a pessoa corrigir.");
      return;
    }

    setBusy(true);
    try {
      await reviewBoIdentity(id, { approve, note: note.trim() || undefined });
      Alert.alert(approve ? "Identidade verificada ✅" : "Pedido recusado", approve ? "A pessoa recebeu o selo e foi avisada." : "A pessoa foi avisada e pode enviar de novo.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a decisão."));
    } finally {
      setBusy(false);
    }
  }

  function approve() {
    Alert.alert("Aprovar", "Confirma que o documento é legível, é verdadeiro e corresponde a esta pessoa?", [
      { text: "Não", style: "cancel" },
      { text: "Aprovar", onPress: () => decide(true) },
    ]);
  }

  return (
    <AdminLayout active="BoUsers">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>🆔 {user?.name ?? "Pedido de verificação"}</Title>
          </View>
          <Badge label={labelOf(catalog.identityStatus, item.status) || item.status} color={STATUS_COLOR[item.status] ?? "#757575"} />
        </View>

        {user ? (
          <Card>
            <Text style={u.strong}>{user.roleName}</Text>
            {user.location ? <Text style={u.muted}>📍 {user.location}</Text> : null}
            {user.phone ? <Text style={u.muted}>📞 {user.phone}</Text> : null}
            <Text style={u.muted}>Conta criada em {formatDateTime(user.createdAt)}</Text>
            <View style={u.row}>
              <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: user.id })} />
              <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: user.id, userName: user.name })} />
            </View>
          </Card>
        ) : null}

        <SubTitle>{labelOf(catalog.identityKinds, item.documentKind) || "Documento"}</SubTitle>
        <Text style={u.muted}>Enviado em {formatDateTime(item.createdAt)}</Text>
        {item.note ? <Text style={{ marginTop: 4 }}>A pessoa escreveu: {item.note}</Text> : null}

        <Image source={{ uri: item.documentUrl }} resizeMode="contain" style={{ width: "100%", height: 280, marginTop: 8, borderRadius: 8, backgroundColor: "#ECEFF1" }} />
        <Btn small kind="outline" label="Abrir o documento em tamanho real" onPress={() => Linking.openURL(item.documentUrl)} />

        {item.selfieUrl ? (
          <>
            <SubTitle>Foto do rosto</SubTitle>
            <View style={u.row}>
              <Image source={{ uri: item.selfieUrl }} resizeMode="cover" style={{ width: 150, height: 150, borderRadius: 8, marginRight: 10, backgroundColor: "#ECEFF1" }} />
              {user?.photoUrl ? (
                <View>
                  <Image source={{ uri: user.photoUrl }} resizeMode="cover" style={{ width: 90, height: 90, borderRadius: 8, backgroundColor: "#ECEFF1" }} />
                  <Text style={u.muted}>Foto do perfil</Text>
                </View>
              ) : null}
            </View>
            <Btn small kind="outline" label="Abrir a foto em tamanho real" onPress={() => Linking.openURL(item.selfieUrl)} />
          </>
        ) : null}

        {d.previous.length > 0 ? (
          <>
            <SubTitle>Pedidos anteriores</SubTitle>
            {d.previous.map((p: any) => (
              <Card key={p.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{labelOf(catalog.identityKinds, p.documentKind)}</Text>
                  <Badge label={labelOf(catalog.identityStatus, p.status) || p.status} color={STATUS_COLOR[p.status] ?? "#757575"} />
                </View>
                <Text style={u.muted}>{formatDateTime(p.createdAt)}</Text>
                {p.reviewNote ? <Text style={u.muted}>📝 {p.reviewNote}</Text> : null}
              </Card>
            ))}
          </>
        ) : null}

        {pending && adminCan("users.verify") ? (
          <>
            <SubTitle>Decisão</SubTitle>
            <Card>
              <Text style={u.muted}>Confira se o nome e a foto do documento correspondem a esta pessoa e se o documento está legível e dentro do prazo.</Text>
              <Btn label={busy ? "A guardar..." : "✅ Aprovar e dar o selo"} onPress={approve} disabled={busy} />
              <Btn small kind="danger" label={rejecting ? "Cancelar recusa" : "Recusar"} onPress={() => { setRejecting(!rejecting); setNote(""); }} disabled={busy} />
              {rejecting ? (
                <View style={{ marginTop: 6 }}>
                  <Field
                    label="Motivo da recusa (a pessoa vê)"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    placeholder="Ex: A foto está tremida. Envie uma foto mais clara do documento inteiro."
                  />
                  <Btn kind="danger" label={busy ? "A enviar..." : "Enviar recusa"} onPress={() => decide(false)} disabled={busy} />
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {!pending ? (
          <Card>
            <Text style={u.strong}>Decisão: {labelOf(catalog.identityStatus, item.status)}</Text>
            {item.reviewNote ? <Text style={u.muted}>{item.reviewNote}</Text> : null}
            {item.reviewedAt ? <Text style={u.muted}>{formatDateTime(item.reviewedAt)}</Text> : null}
          </Card>
        ) : null}
      </Page>
    </AdminLayout>
  );
}
