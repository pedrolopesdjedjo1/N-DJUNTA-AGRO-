import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getBoIncident, handleBoIncident } from "../api/backofficeTransport";
import { useBoTransportCatalog } from "../utils/boTransportCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { TR_VEHICLE_ICON } from "../constants/transporterV2";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

const STATUS_COLOR: Record<string, string> = { ABERTA: "#F9A825", EM_ATENDIMENTO: "#1565C0", RESOLVIDA: "#2E7D32" };

export default function BoIncidentScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoTransportCatalog();
  const loader = useLoader(() => getBoIncident(id), null as any, [id]);
  const d: any = loader.data;
  const canManage = adminCan("transport.manage");

  const [mode, setMode] = useState<"" | "EM_ATENDIMENTO" | "RESOLVIDA">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!d) {
    return (
      <AdminLayout active="BoTransport">
        <Page loader={loader}>
          <Title>Ocorrência</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const i = d.incident;
  const t = i.transporter;
  const wa = whatsappUrl(t?.phone);
  const open = i.status !== "RESOLVIDA";

  async function submit() {
    if (mode === "RESOLVIDA" && note.trim().length < 3) {
      Alert.alert("Atenção", "Explique como o caso foi resolvido.");
      return;
    }

    setBusy(true);
    try {
      await handleBoIncident(id, { status: mode, note: note.trim() || undefined });
      setMode("");
      setNote("");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout active="BoTransport">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>{i.kindLabel}</Title>
          </View>
          <Badge label={labelOf(catalog.incidentStatus, i.status) || i.status} color={STATUS_COLOR[i.status] ?? "#757575"} />
        </View>
        <Text style={u.muted}>
          Recebida em {formatDateTime(i.createdAt)}
          {open ? ` · há ${i.ageMinutes < 60 ? `${i.ageMinutes} min` : `${Math.floor(i.ageMinutes / 60)} h`}` : ""}
        </Text>

        {i.description ? (
          <Card>
            <Text style={{ lineHeight: 21 }}>{i.description}</Text>
          </Card>
        ) : null}

        <SubTitle>Transportador</SubTitle>
        <Card>
          {t ? (
            <>
              <Text style={u.strong}>{t.name}</Text>
              {t.location ? <Text style={u.muted}>📍 {t.location}</Text> : null}
              {t.phone ? <Text style={u.muted}>📞 {t.phone}</Text> : null}
              <View style={u.row}>
                {t.phone ? <Btn small label="📞 Ligar" onPress={() => Linking.openURL(`tel:${t.phone}`)} /> : null}
                {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: t.id, userName: t.name })} />
                <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: t.id })} />
              </View>
            </>
          ) : (
            <Text style={u.muted}>Conta removida.</Text>
          )}
          {d.vehicle ? (
            <Text style={[u.muted, { marginTop: 6 }]}>
              {TR_VEHICLE_ICON[d.vehicle.type ?? "OUTRO"] ?? "🚚"} {d.vehicle.type ?? "Veículo por registar"}
              {d.vehicle.plate ? ` · ${d.vehicle.plate}` : ""}
              {d.vehicle.capacityKg ? ` · ${d.vehicle.capacityKg} kg` : ""} · {d.vehicle.status}
            </Text>
          ) : null}
          {d.otherIncidents > 0 ? <Text style={u.muted}>Outras ocorrências deste transportador: {d.otherIncidents}</Text> : null}
        </Card>

        <SubTitle>Localização</SubTitle>
        <Card>
          {i.locationShared ? (
            <>
              <Text style={{ color: "#2E7D32" }}>📍 O transportador partilhou a localização.</Text>
              {i.mapUrl ? <Btn small label="🗺️ Abrir no mapa" onPress={() => Linking.openURL(i.mapUrl)} /> : null}
            </>
          ) : (
            <Text style={u.muted}>O transportador não partilhou a localização. Pergunte-lhe onde está.</Text>
          )}
        </Card>

        {open && d.emergencyContacts.length > 0 ? (
          <>
            <SubTitle>Contactos de emergência dele(a)</SubTitle>
            <Text style={u.muted}>Só se mostram enquanto a ocorrência está aberta. Use-os se não conseguir falar com o transportador.</Text>
            {d.emergencyContacts.map((c: any) => (
              <Card key={c.phone}>
                <Text style={u.strong}>{c.name}</Text>
                <Btn small kind="outline" label={`📞 ${c.phone}`} onPress={() => Linking.openURL(`tel:${c.phone}`)} />
              </Card>
            ))}
          </>
        ) : null}

        {i.deliveryId ? (
          <Btn kind="outline" label="📦 Abrir a entrega ligada" onPress={() => navigation.navigate("BoDelivery", { id: i.deliveryId })} />
        ) : null}

        {i.adminNote ? (
          <Card>
            <Text style={u.strong}>Nota da equipa{d.handledByName ? ` (${d.handledByName})` : ""}</Text>
            <Text style={{ marginTop: 2 }}>{i.adminNote}</Text>
            {i.resolvedAt ? <Text style={u.muted}>Resolvida em {formatDateTime(i.resolvedAt)}</Text> : null}
          </Card>
        ) : null}

        {canManage && open ? (
          <>
            <SubTitle>Ações</SubTitle>
            <View style={u.row}>
              {i.status === "ABERTA" ? <Btn small label="🙋 Passar a atender" onPress={() => { setMode("EM_ATENDIMENTO"); setNote(""); }} /> : null}
              <Btn small kind="outline" label="✅ Marcar como resolvida" onPress={() => { setMode("RESOLVIDA"); setNote(""); }} />
            </View>
          </>
        ) : null}

        {mode ? (
          <Card>
            <Text style={u.strong}>{mode === "RESOLVIDA" ? "Resolver a ocorrência" : "Passar a atender"}</Text>
            <Text style={u.muted}>O transportador recebe a nota como notificação.</Text>
            <Field label={mode === "RESOLVIDA" ? "Como foi resolvida (obrigatório)" : "Nota (opcional)"} value={note} onChangeText={setNote} multiline placeholder={mode === "EM_ATENDIMENTO" ? "Ex: Estamos a tratar. Fique onde está." : ""} />
            <View style={u.row}>
              <Btn label={busy ? "A guardar..." : "Confirmar"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setMode("")} />
            </View>
          </Card>
        ) : null}
      </Page>
    </AdminLayout>
  );
}
