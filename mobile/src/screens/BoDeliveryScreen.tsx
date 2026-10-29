import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getBoDelivery, handleBoDelivery } from "../api/backoffice";
import { useTransportCatalog } from "../utils/transportCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { PHASE_COLOR, PHASE_ICON, VEHICLE_ICON, directionsUrl, kmText, minutesSince, placeLabel, weightText } from "../constants/transporter";
import { BO_EVENT_ICON, HANDLE_NOTIFY } from "../constants/backofficeTransport";
import { humanize, minutesText } from "../constants/agentOps";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate, formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

export default function BoDeliveryScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const tcatalog = useTransportCatalog();
  const loader = useLoader(() => getBoDelivery(id), null as any, [id]);
  const d: any = loader.data;

  const [panel, setPanel] = useState(false);
  const [message, setMessage] = useState("");
  const [notify, setNotify] = useState<string[]>([]);
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
          <Title>Entrega</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const c = d.delivery;
  const profile = d.transporterProfile;
  const canManage = adminCan("transport.manage");
  const phaseLabel = labelOf(tcatalog.deliveryPhases, c.phase) || c.phase;
  const km = kmText(c.distanceKm, c.distanceApprox);
  const weight = weightText(c.weightKg, c.weightPartial);
  const minutes = minutesSince(c.lastLocationAt);
  const hasCoords = c.lastLat !== null && c.lastLat !== undefined && c.lastLng !== null && c.lastLng !== undefined;
  const pickupUrl = directionsUrl(c.pickup);
  const destUrl = directionsUrl(c.destination);

  const available = HANDLE_NOTIFY.filter((o) => (o.value === "TRANSPORTER" ? !!c.transporter : o.value === "BUYER" ? !!c.buyer : !!c.seller));

  function toggle(value: string) {
    setNotify((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  async function submit() {
    if (message.trim().length < 5) {
      Alert.alert("Atenção", "Explique o que foi feito (pelo menos 5 letras).");
      return;
    }

    setBusy(true);
    try {
      loader.setData(await handleBoDelivery(id, { message: message.trim(), notify }));
      setPanel(false);
      setMessage("");
      setNotify([]);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o registo."));
    } finally {
      setBusy(false);
    }
  }

  function person(title: string, p: any) {
    if (!p) return null;
    const wa = whatsappUrl(p.phone);
    return (
      <Card>
        <Text style={u.muted}>{title}</Text>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
            {p.name} {p.isVerified ? "✅" : ""}
          </Text>
          {!p.isActive ? <Badge label="Conta inativa" color="#C62828" /> : null}
        </View>
        <Text style={u.muted}>
          {p.roleName}
          {p.location ? ` · 📍 ${p.location}` : ""}
        </Text>
        <View style={u.row}>
          <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: p.id })} />
          <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: p.id, userName: p.name })} />
          {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
          {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
        </View>
      </Card>
    );
  }

  return (
    <AdminLayout active="BoTransport">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>
              {PHASE_ICON[c.phase] ?? "📦"} Entrega {c.orderCode}
            </Title>
          </View>
          <Badge label={phaseLabel} color={PHASE_COLOR[c.phase] ?? "#757575"} />
        </View>
        <Text style={u.muted}>Estado no sistema: {humanize(c.status)}</Text>

        <Card>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary }}>{c.payout ? `💰 ${money(c.payout)}` : "💰 Valor a combinar"}</Text>
          <Text style={u.muted}>Valor do transporte desta entrega</Text>
          {c.orderTotal ? <Text style={u.muted}>Valor da encomenda: {money(c.orderTotal)}</Text> : null}
          {c.paymentMethod ? <Text style={u.muted}>💳 Pagamento da encomenda: {humanize(c.paymentMethod)}</Text> : null}
          {c.desiredDate ? <Text style={u.muted}>🗓️ Data pretendida: {formatDate(c.desiredDate)}</Text> : null}
          {km ? <Text style={u.muted}>📏 Distância: {km}{c.distanceApprox ? " (estimativa entre regiões)" : ""}</Text> : null}
          {weight ? <Text style={u.muted}>⚖️ Carga: {weight}</Text> : null}
          {c.overCapacity ? <Text style={{ color: "#C62828", marginTop: 4 }}>⚠️ A carga é maior do que a capacidade do veículo.</Text> : null}
          <Btn small kind="outline" label="Abrir a encomenda" onPress={() => navigation.navigate("BoOrder", { id: c.orderId })} />
        </Card>

        <SubTitle>📍 Recolha e 🏁 destino</SubTitle>
        <Card>
          <Text style={u.strong}>📍 {placeLabel(c.pickup, "Recolha por confirmar")}</Text>
          {pickupUrl ? <Btn small kind="outline" label="🧭 Ver no mapa" onPress={() => Linking.openURL(pickupUrl)} /> : null}
          <Text style={[u.strong, { marginTop: 10 }]}>🏁 {placeLabel(c.destination, "Destino por confirmar")}</Text>
          {destUrl ? <Btn small kind="outline" label="🧭 Ver no mapa" onPress={() => Linking.openURL(destUrl)} /> : null}
        </Card>

        <SubTitle>📦 Produtos ({c.itemsCount})</SubTitle>
        {c.items.length === 0 ? (
          <Text style={u.muted}>Sem produtos para mostrar.</Text>
        ) : (
          <Card>
            {c.items.map((i: any) => (
              <View key={i.id} style={[u.between, { marginTop: 4 }]}>
                <Text style={{ flex: 1, marginRight: 8 }}>{i.title}</Text>
                <Text style={{ fontWeight: "bold" }}>
                  {i.quantity}
                  {i.unit ? ` ${i.unit}` : "×"}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {c.phase === "EM_TRANSPORTE" || c.phase === "ACEITE" ? (
          <>
            <SubTitle>📡 Localização</SubTitle>
            <Card>
              {c.lastLocationAt ? (
                <>
                  <Text style={u.strong}>{c.lastLocation ?? "Localização partilhada"}</Text>
                  <Text style={{ color: minutes !== null && minutes > 60 ? "#EF6C00" : u.muted.color }}>
                    {formatDateTime(c.lastLocationAt)} ({minutesText(minutes)})
                  </Text>
                  {hasCoords ? <Btn small label="🗺️ Ver no mapa" onPress={() => Linking.openURL(`https://www.google.com/maps?q=${c.lastLat},${c.lastLng}`)} /> : null}
                </>
              ) : (
                <Text style={{ color: "#EF6C00" }}>O transportador ainda não partilhou a localização.</Text>
              )}
            </Card>
          </>
        ) : null}

        {person("Transportador", c.transporter)}
        {profile ? (
          <Card>
            <Text style={u.strong}>
              {VEHICLE_ICON[profile.vehicleType ?? "OUTRO"] ?? "🚚"} {profile.vehicleType ? labelOf(tcatalog.vehicleTypes, profile.vehicleType) : "Veículo por indicar"}
            </Text>
            <Text style={u.muted}>
              {profile.plate ? `Matrícula ${profile.plate}` : "Sem matrícula"}
              {profile.capacityKg ? ` · ${profile.capacityKg} kg` : ""}
            </Text>
            <Text style={u.muted}>Verificação: {labelOf(tcatalog.verificationStatus, profile.verificationStatus) || profile.verificationStatus}</Text>
          </Card>
        ) : null}
        {!c.transporter && c.phase !== "CANCELADA" && c.phase !== "ENTREGUE" ? (
          <Card>
            <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>⏳ Ainda sem transportador</Text>
            <Text style={u.muted}>Os transportadores das regiões da recolha e do destino veem esta entrega na lista de disponíveis.</Text>
            {adminCan("transport.view") ? <Btn small kind="outline" label="Ver transportadores" onPress={() => navigation.navigate("BoTransporters")} /> : null}
          </Card>
        ) : null}

        {person("Vendedor", c.seller)}
        {person("Comprador", c.buyer)}

        {canManage ? (
          <>
            <SubTitle>Tratar um problema</SubTitle>
            <Btn label={panel ? "Fechar" : "🛡️ Registar o que a equipa fez"} onPress={() => setPanel(!panel)} />
          </>
        ) : null}

        {panel ? (
          <Card>
            <Field
              label="O que foi feito (fica no histórico da entrega)"
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="Ex: Falei com o comprador, vai receber amanhã de manhã."
            />
            <Text style={u.label}>Avisar também (opcional)</Text>
            <View style={u.row}>
              {available.map((o) => (
                <Chip key={o.value} label={o.label} active={notify.includes(o.value)} onPress={() => toggle(o.value)} />
              ))}
            </View>
            <Text style={u.muted}>Quem escolher recebe o texto acima como notificação.</Text>
            <View style={u.row}>
              <Btn label={busy ? "A guardar..." : "Guardar"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel(false)} />
            </View>
          </Card>
        ) : null}

        <SubTitle>Andamento ({d.events.length})</SubTitle>
        {d.events.length === 0 ? (
          <Text style={u.muted}>Ainda não há registos.</Text>
        ) : (
          d.events.map((e: any) => (
            <Card key={e.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {BO_EVENT_ICON[e.kind] ?? "•"} {labelOf(tcatalog.eventKinds, e.kind) || (e.kind === "TRATADO" ? "Tratado pela equipa" : e.kind)}
                </Text>
                {e.byTeam ? <Badge label="Equipa" color="#6A1B9A" /> : null}
              </View>
              {e.category ? <Text style={u.muted}>{labelOf(tcatalog.problemKinds, e.category) || labelOf(tcatalog.releaseReasons, e.category) || e.category}</Text> : null}
              {e.message ? <Text style={{ marginTop: 2, lineHeight: 20 }}>{e.message}</Text> : null}
              <Text style={u.muted}>
                {e.authorName} · {formatDateTime(e.createdAt)}
              </Text>
            </Card>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
