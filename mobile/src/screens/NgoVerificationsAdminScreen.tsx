import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getPendingVerifications, reviewVerification } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

// Para a equipa do NÔDJUNTA AGRO: analisar os pedidos de verificação das organizações
export default function NgoVerificationsAdminScreen({ navigation }: any) {
  const { user } = useAuth();
  const catalog = useNgoCatalog();
  const allowed = user?.role === "ADMIN";

  const loader = useLoader(() => (allowed ? getPendingVerifications() : Promise.resolve([])), [] as any[], [allowed]);
  const items: any[] = loader.data;

  const [rejecting, setRejecting] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (allowed) loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowed])
  );

  if (!allowed) {
    return (
      <Page>
        <Title>✅ Verificação de organizações</Title>
        <Empty text="Acesso restrito à equipa do NÔDJUNTA AGRO." />
      </Page>
    );
  }

  function approve(item: any) {
    const org = item.organization;
    Alert.alert("Aprovar organização", `Confirma que "${org.name}" é uma organização real e dá-lhe o selo de verificada?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Aprovar",
        onPress: async () => {
          setBusy(true);
          try {
            await reviewVerification(org.ownerId, true);
            setRejecting("");
            loader.reload();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível aprovar."));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function reject(item: any) {
    if (note.trim().length < 3) {
      Alert.alert("Atenção", "Explique o motivo da recusa, para a organização corrigir.");
      return;
    }

    setBusy(true);
    try {
      await reviewVerification(item.organization.ownerId, false, note.trim());
      setRejecting("");
      setNote("");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível recusar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>✅ Verificação de organizações</Title>
      <Text style={u.muted}>
        Confira o número do registo oficial, os documentos e o responsável. Ao aprovar, a organização recebe o selo de verificada.
      </Text>

      <Text style={[u.strong, { marginTop: 8 }]}>{items.length} pedido(s) por analisar</Text>

      {items.length === 0 ? (
        <Empty text="Não há pedidos de verificação pendentes." />
      ) : (
        items.map((item) => {
          const o = item.organization;
          const isRejecting = rejecting === o.ownerId;

          return (
            <Card key={o.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {o.name}
                  {o.acronym ? ` (${o.acronym})` : ""}
                </Text>
                <Badge label="Pendente" color="#F9A825" />
              </View>

              <Text style={u.muted}>
                Enviado em {o.verificationSubmittedAt ? formatDate(o.verificationSubmittedAt) : "—"}
                {o.region ? ` · 📍 ${o.region}` : ""}
              </Text>

              <Text style={[u.strong, { marginTop: 8 }]}>Registo oficial</Text>
              <Text>{o.registrationNumber || "—"}</Text>

              <Text style={[u.strong, { marginTop: 8 }]}>Responsável</Text>
              <Text>
                {o.responsibleName || "—"}
                {o.responsibleRole ? ` (${o.responsibleRole})` : ""}
              </Text>
              {o.responsiblePhone ? <Text style={u.muted}>📞 {o.responsiblePhone}</Text> : null}
              {o.responsibleEmail ? <Text style={u.muted}>✉️ {o.responsibleEmail}</Text> : null}

              <Text style={[u.strong, { marginTop: 8 }]}>Contactos da organização</Text>
              {o.phone ? <Text style={u.muted}>📞 {o.phone}</Text> : null}
              {o.email ? <Text style={u.muted}>✉️ {o.email}</Text> : null}
              {o.website ? <Text style={u.muted}>🌐 {o.website}</Text> : null}
              {!o.phone && !o.email && !o.website ? <Text style={u.muted}>—</Text> : null}

              {o.description ? (
                <Text style={[u.muted, { marginTop: 8 }]} numberOfLines={4}>
                  {o.description}
                </Text>
              ) : null}

              <Text style={[u.strong, { marginTop: 8 }]}>Documentos ({item.documents.length})</Text>
              {item.documents.length === 0 ? (
                <Text style={u.muted}>Sem documentos.</Text>
              ) : (
                item.documents.map((doc: any) => (
                  <View key={doc.id} style={{ marginTop: 6 }}>
                    <Text>{doc.name}</Text>
                    <Text style={u.muted}>{labelOf(catalog.documentKinds, doc.kind)}</Text>
                    <Btn small kind="outline" label="Abrir documento" onPress={() => Linking.openURL(doc.url)} />
                  </View>
                ))
              )}

              {item.owner ? (
                <View style={u.row}>
                  <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: item.owner.id, userName: o.name })} />
                  {item.owner.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${item.owner.phone}`)} /> : null}
                  <Btn small kind="outline" label="Ver perfil público" onPress={() => navigation.navigate("NgoPublicOrganization", { id: o.ownerId })} />
                </View>
              ) : null}

              <View style={u.row}>
                <Btn small label="✅ Aprovar" onPress={() => approve(item)} disabled={busy} />
                <Btn
                  small
                  kind="danger"
                  label={isRejecting ? "Cancelar recusa" : "Recusar"}
                  onPress={() => {
                    setRejecting(isRejecting ? "" : o.ownerId);
                    setNote("");
                  }}
                  disabled={busy}
                />
              </View>

              {isRejecting ? (
                <View style={{ marginTop: 8 }}>
                  <Field
                    label="Motivo da recusa (a organização vê)"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    placeholder="Ex: O documento do registo está ilegível. Envie uma foto mais clara."
                  />
                  <Btn kind="danger" label={busy ? "A enviar..." : "Enviar recusa"} onPress={() => reject(item)} disabled={busy} />
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Page>
  );
}
