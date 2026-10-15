import React, { useEffect, useState } from "react";
import { View, Text, Alert, Linking, Share, Switch } from "react-native";
import { useAuth } from "../context/AuthContext";
import { FisherLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { createSos, getMySos, sendSosLocation, closeSos } from "../api/sos";
import { listContacts } from "../api/contacts";
import { getApiErrorMessage } from "../api/errorMessage";
import { getPosition, mapsLink, Coords } from "../utils/location";
import { SOS_KINDS, SOS_STATUS, SUPPORT, formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

const ACTIVE = ["ABERTO", "EM_RESGATE"];
const EMPTY = { mine: [] as any[], contacts: [] as any[] };

export default function FisherSosScreen({ navigation }: any) {
  const { user } = useAuth();

  const loader = useLoader(async () => {
    const [mine, sea, security] = await Promise.all([
      getMySos(),
      listContacts({ kind: "MAR" }).catch(() => []),
      listContacts({ kind: "SEGURANCA" }).catch(() => []),
    ]);
    return { mine, contacts: [...(sea as any[]), ...(security as any[])] };
  }, EMPTY);

  const active: any = (loader.data.mine as any[]).find((a) => ACTIVE.includes(a.status));
  const past: any[] = (loader.data.mine as any[]).filter((a) => !ACTIVE.includes(a.status)).slice(0, 5);
  const contacts: any[] = loader.data.contacts;

  const [kind, setKind] = useState("SOS");
  const [message, setMessage] = useState("");
  const [place, setPlace] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [sending, setSending] = useState(false);
  const [autoShare, setAutoShare] = useState(true);

  async function fetchLocation() {
    setLocating(true);
    const position = await getPosition();
    setLocating(false);
    if (position) {
      setCoords(position);
    } else {
      Alert.alert(
        "Localização não disponível",
        "Ative a localização (GPS) e dê permissão ao app. Pode também escrever onde está no campo de texto."
      );
    }
    return position;
  }

  async function doSend() {
    setSending(true);
    try {
      const position = coords ?? (await getPosition());
      if (position) setCoords(position);

      await createSos({
        kind,
        message: message.trim() || undefined,
        lat: position?.lat,
        lng: position?.lng,
        location: place.trim() || undefined,
      });

      setMessage("");
      loader.reload();

      if (!position && !place.trim()) {
        Alert.alert(
          "SOS enviado sem localização",
          "A equipa foi avisada, mas não sabe onde está. Ative o GPS e toque em Enviar localização, ou ligue para o suporte."
        );
      } else {
        Alert.alert("SOS enviado", "A equipa foi avisada. Mantenha o telefone ligado e partilhe a sua localização.");
      }
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível enviar o SOS. Ligue já para o suporte."));
    } finally {
      setSending(false);
    }
  }

  function send() {
    Alert.alert("Enviar pedido de socorro", "A equipa NÔDJUNTA AGRO será avisada com a sua localização. Enviar agora?", [
      { text: "Não", style: "cancel" },
      { text: "ENVIAR SOS", style: "destructive", onPress: doSend },
    ]);
  }

  async function shareLocation(silent: boolean) {
    if (!active) return;
    const position = await getPosition();
    if (!position && silent) return;
    if (!position && !place.trim()) {
      Alert.alert("Localização não disponível", "Ative o GPS ou escreva onde está.");
      return;
    }
    try {
      await sendSosLocation(active.id, {
        lat: position?.lat,
        lng: position?.lng,
        location: place.trim() || undefined,
      });
      if (position) setCoords(position);
      loader.reload();
      if (!silent) Alert.alert("Pronto", "Localização enviada à equipa.");
    } catch (e) {
      if (!silent) Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível enviar a localização."));
    }
  }

  function close(status: "RESOLVIDO" | "CANCELADO") {
    if (!active) return;
    Alert.alert(
      status === "RESOLVIDO" ? "Estou a salvo" : "Cancelar SOS",
      status === "RESOLVIDO" ? "Encerrar o pedido de socorro porque está a salvo?" : "Foi um alarme falso? O pedido será cancelado.",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim",
          onPress: async () => {
            try {
              await closeSos(active.id, status);
              loader.reload();
            } catch (e) {
              Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível encerrar."));
            }
          },
        },
      ]
    );
  }

  async function shareWithOthers() {
    const lat = active?.lat ?? coords?.lat;
    const lng = active?.lng ?? coords?.lng;
    const where =
      lat !== undefined && lat !== null && lng !== undefined && lng !== null
        ? mapsLink(lat, lng)
        : active?.locationText || place.trim() || "localização não disponível";
    const kindLabel = SOS_KINDS.find((k) => k.value === (active?.kind ?? kind))?.label ?? "SOS";

    try {
      await Share.share({
        message: `🆘 SOS NÔDJUNTA AGRO\n${user?.name ?? ""}${user?.phone ? ` (${user.phone})` : ""}\n${kindLabel}\nLocalização: ${where}`,
      });
    } catch (e) {
      // o utilizador fechou a janela de partilha
    }
  }

  // Enquanto o pedido está ativo e esta tela está aberta: atualiza o estado e partilha a localização
  useEffect(() => {
    if (!active) return;
    const refresh = setInterval(() => loader.reload(), 30000);
    return () => clearInterval(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  useEffect(() => {
    if (!active || !autoShare) return;
    const timer = setInterval(() => shareLocation(true), 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, autoShare]);

  const activeKind = active ? SOS_KINDS.find((k) => k.value === active.kind)?.label ?? active.kind : "";

  return (
    <FisherLayout active="FisherSea">
      <Page loader={loader}>
        <Title>🆘 Emergência no mar</Title>

        <Card>
          <Text style={u.muted}>
            O SOS do app avisa a equipa com a sua localização, mas não substitui os serviços de resgate. Se estiver em perigo, peça ajuda também por rádio, por telefone e aos barcos que estiverem perto.
          </Text>
        </Card>

        {active ? (
          <>
            <Card>
              <View style={u.between}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{activeKind}</Text>
                <Badge label={SOS_STATUS[active.status]?.label ?? active.status} color={SOS_STATUS[active.status]?.color ?? "#757575"} />
              </View>
              <Text style={u.muted}>Enviado: {formatDateTime(active.createdAt)}</Text>
              {active.status === "EM_RESGATE" ? (
                <Text style={[u.strong, { marginTop: 6 }]}>A equipa está a tratar do seu pedido. Mantenha o telefone ligado.</Text>
              ) : (
                <Text style={[u.strong, { marginTop: 6 }]}>A equipa foi avisada. Fique calmo e mantenha o telefone ligado.</Text>
              )}
              {active.message ? <Text style={{ marginTop: 6 }}>{active.message}</Text> : null}
              <Text style={[u.muted, { marginTop: 6 }]}>
                📍 {active.locationText || (active.lat !== null && active.lng !== null ? `${Number(active.lat).toFixed(4)}, ${Number(active.lng).toFixed(4)}` : "Localização ainda não enviada")}
              </Text>
              {active.locationUpdatedAt ? <Text style={u.muted}>Atualizada: {formatDateTime(active.locationUpdatedAt)}</Text> : null}
            </Card>

            <Field label="Onde está (opcional, ajuda a equipa)" value={place} onChangeText={setPlace} placeholder="Ex: a 3 km da ilha de Bubaque" />
            <Btn label="📍 Enviar localização agora" onPress={() => shareLocation(false)} />
            <Btn kind="outline" label="📤 Partilhar localização com outras pessoas" onPress={shareWithOthers} />

            <View style={[u.between, { marginTop: 10 }]}>
              <Text style={[u.muted, { flex: 1, marginRight: 8 }]}>Enviar a localização automaticamente a cada minuto (enquanto esta tela estiver aberta)</Text>
              <Switch value={autoShare} onValueChange={setAutoShare} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
            </View>

            <View style={u.row}>
              <Btn kind="outline" label="✅ Estou a salvo" onPress={() => close("RESOLVIDO")} />
              <Btn kind="danger" label="Cancelar (alarme falso)" onPress={() => close("CANCELADO")} />
            </View>
          </>
        ) : (
          <>
            <SubTitle>Qual é o problema?</SubTitle>
            <View style={u.row}>
              {SOS_KINDS.map((k) => (
                <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
              ))}
            </View>

            <Field label="Mensagem (opcional)" value={message} onChangeText={setMessage} multiline placeholder="Ex: 3 pessoas no barco, motor parou" />
            <Field label="Onde está (opcional)" value={place} onChangeText={setPlace} placeholder="Ex: perto da ilha de Bubaque" />

            <Text style={u.muted}>{coords ? "📍 Localização GPS obtida." : "A localização GPS será obtida quando enviar."}</Text>
            <Btn kind="outline" small label={locating ? "A procurar o sinal GPS..." : "📍 Obter a minha localização"} onPress={fetchLocation} disabled={locating} />

            <Btn kind="danger" label={sending ? "A enviar..." : "🆘 ENVIAR SOS"} onPress={send} disabled={sending} />
          </>
        )}

        <SubTitle>Contactar emergência e resgate</SubTitle>
        {contacts.length === 0 ? (
          <Card>
            <Text style={u.muted}>Ainda não há contactos de resgate registados no app. Ligue para o suporte NÔDJUNTA AGRO.</Text>
          </Card>
        ) : (
          contacts.map((c) => (
            <Card key={c.id}>
              <Text style={u.strong}>{c.name}</Text>
              {c.region ? <Text style={u.muted}>📍 {c.region}</Text> : null}
              {c.description ? <Text style={u.muted}>{c.description}</Text> : null}
              <Text style={{ marginTop: 4 }}>📞 {c.phone}</Text>
              <Btn small label="Ligar" onPress={() => Linking.openURL(`tel:${c.phone}`)} />
            </Card>
          ))
        )}

        <SubTitle>Contactar suporte NÔDJUNTA AGRO</SubTitle>
        {SUPPORT.phones.map((phone) => (
          <Card key={phone}>
            <Text style={u.strong}>📞 {phone}</Text>
            <View style={u.row}>
              <Btn small label="Ligar" onPress={() => Linking.openURL(`tel:${phone}`)} />
              <Btn small kind="outline" label="💬 WhatsApp" onPress={() => Linking.openURL(`https://wa.me/245${phone}`)} />
            </View>
          </Card>
        ))}

        <SubTitle>Histórico</SubTitle>
        {past.length === 0 ? (
          <Empty text="Nenhum pedido de socorro anterior." />
        ) : (
          past.map((a) => (
            <Card key={a.id}>
              <View style={u.between}>
                <Text style={u.strong}>{SOS_KINDS.find((k) => k.value === a.kind)?.label ?? a.kind}</Text>
                <Badge label={SOS_STATUS[a.status]?.label ?? a.status} color={SOS_STATUS[a.status]?.color ?? "#757575"} />
              </View>
              <Text style={u.muted}>{formatDateTime(a.createdAt)}</Text>
            </Card>
          ))
        )}

        <SubTitle>Prevenir</SubTitle>
        <View style={u.row}>
          <Btn small kind="outline" label="🌊 Condições do mar" onPress={() => navigation.navigate("FisherSea")} />
          <Btn small kind="outline" label="📚 Segurança no mar" onPress={() => navigation.navigate("Learning")} />
        </View>
      </Page>
    </FisherLayout>
  );
}
