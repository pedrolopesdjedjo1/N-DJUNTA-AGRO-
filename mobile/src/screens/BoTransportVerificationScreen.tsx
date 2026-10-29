import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { listBoTransportVerification, reviewBoTransportVerification } from "../api/backoffice";
import { useTransportCatalog } from "../utils/transportCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { VEHICLE_ICON, VERIFICATION_COLOR } from "../constants/transporter";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY = { counts: {} as Record<string, number>, items: [] as any[] };

// Verificar documentos e veículos dos transportadores
export default function BoTransportVerificationScreen({ navigation }: any) {
  const tcatalog = useTransportCatalog();
  const [status, setStatus] = useState("PENDENTE");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [rejecting, setRejecting] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loader = useLoader(() => listBoTransportVerification({ status, q }), EMPTY, [status, q]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function approve(item: any) {
    const expired = (item.documents as any[]).filter((x) => x.expired);
    if (expired.length > 0) {
      Alert.alert("Atenção", `Há documentos fora do prazo: ${expired.map((x) => x.name).join(", ")}. Peça documentos válidos.`);
      return;
    }

    Alert.alert("Aprovar transportador", `Confirma que os documentos de ${item.user?.name ?? "este transportador"} estão corretos? Ele recebe o selo de verificado.`, [
      { text: "Não", style: "cancel" },
      {
        text: "Aprovar",
        onPress: async () => {
          setBusy(true);
          try {
            await reviewBoTransportVerification(item.profile.userId, { approve: true });
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
      Alert.alert("Atenção", "Explique o motivo da recusa, para o transportador corrigir.");
      return;
    }

    setBusy(true);
    try {
      await reviewBoTransportVerification(item.profile.userId, { approve: false, note: note.trim() });
      setRejecting("");
      setNote("");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível recusar."));
    } finally {
      setBusy(false);
    }
  }

  const tabs = tcatalog.verificationStatus.filter((s) => s.value !== "RASCUNHO");

  return (
    <AdminLayout active="BoTransport">
      <Page loader={loader}>
        <Title>🆔 Verificar transportadores</Title>
        <Text style={u.muted}>Confira a identificação, a carta de condução ou o registo do veículo e os prazos. Ao aprovar, o transportador recebe o selo de verificado.</Text>

        <View style={u.row}>
          {tabs.map((s) => (
            <Chip key={s.value} label={`${s.label} (${d.counts[s.value] ?? 0})`} active={status === s.value} onPress={() => setStatus(s.value)} />
          ))}
        </View>

        <Field
          placeholder="Procurar por nome ou telefone"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        {d.items.length === 0 && !loader.loading ? (
          <Empty text={status === "PENDENTE" ? "Não há transportadores à espera de verificação." : "Nenhum transportador com este estado."} />
        ) : (
          d.items.map((i: any) => {
            const p = i.profile;
            const isRejecting = rejecting === p.userId;
            return (
              <Card key={p.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{i.user?.name ?? "Transportador"}</Text>
                  <Badge label={labelOf(tcatalog.verificationStatus, p.verificationStatus) || p.verificationStatus} color={VERIFICATION_COLOR[p.verificationStatus] ?? "#757575"} />
                </View>

                {i.user?.location ? <Text style={u.muted}>📍 {i.user.location}</Text> : null}
                {i.user?.phone ? <Text style={u.muted}>📞 {i.user.phone}</Text> : null}
                <Text style={u.muted}>
                  {VEHICLE_ICON[p.vehicleType ?? "OUTRO"]} {p.vehicleType ? labelOf(tcatalog.vehicleTypes, p.vehicleType) : "Sem veículo"}
                  {p.plate ? ` · ${p.plate}` : ""}
                  {p.capacityKg ? ` · ${p.capacityKg} kg` : ""}
                </Text>
                <Text style={u.muted}>🚚 {i.delivered} entrega(s) concluída(s)</Text>
                {p.submittedAt && p.verificationStatus === "PENDENTE" ? <Text style={u.muted}>Enviado em {formatDate(p.submittedAt)}</Text> : null}
                {p.verificationNote ? <Text style={[u.muted, { marginTop: 4 }]}>📝 {p.verificationNote}</Text> : null}

                <Text style={[u.strong, { marginTop: 8 }]}>Documentos ({i.documents.length})</Text>
                {i.documents.length === 0 ? (
                  <Text style={u.muted}>Sem documentos.</Text>
                ) : (
                  i.documents.map((doc: any) => (
                    <View key={doc.id} style={{ marginTop: 6 }}>
                      <Text>{doc.name}</Text>
                      <Text style={u.muted}>
                        {labelOf(tcatalog.documentKinds, doc.kind)}
                        {doc.expiresAt ? ` · válido até ${formatDate(doc.expiresAt)}` : ""}
                      </Text>
                      {doc.expired ? <Text style={{ color: "#C62828" }}>⛔ Fora do prazo</Text> : doc.expiringSoon ? <Text style={{ color: "#EF6C00" }}>⚠️ Termina em breve</Text> : null}
                      <Btn small kind="outline" label="Abrir documento" onPress={() => Linking.openURL(doc.url)} />
                    </View>
                  ))
                )}

                <View style={u.row}>
                  {i.user ? <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: i.user.id })} /> : null}
                  {i.user ? <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: i.user.id, userName: i.user.name })} /> : null}
                  {i.user?.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${i.user.phone}`)} /> : null}
                </View>

                {p.verificationStatus === "PENDENTE" ? (
                  <View style={u.row}>
                    <Btn small label="✅ Aprovar" onPress={() => approve(i)} disabled={busy} />
                    <Btn
                      small
                      kind="danger"
                      label={isRejecting ? "Cancelar recusa" : "Recusar"}
                      onPress={() => {
                        setRejecting(isRejecting ? "" : p.userId);
                        setNote("");
                      }}
                      disabled={busy}
                    />
                  </View>
                ) : null}

                {isRejecting ? (
                  <View style={{ marginTop: 8 }}>
                    <Field
                      label="Motivo da recusa (o transportador vê)"
                      value={note}
                      onChangeText={setNote}
                      multiline
                      placeholder="Ex: A carta de condução está ilegível. Envie uma foto mais clara."
                    />
                    <Btn kind="danger" label={busy ? "A enviar..." : "Enviar recusa"} onPress={() => reject(i)} disabled={busy} />
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </Page>
    </AdminLayout>
  );
}
