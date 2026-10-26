import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert, Linking, Switch } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import {
  getTransporterDelivery,
  acceptDelivery,
  declineDelivery,
  releaseDelivery,
  collectDelivery,
  deliverDelivery,
  shareDeliveryLocation,
  reportDeliveryProblem,
} from "../api/transporter";
import { getPosition } from "../utils/location";
import { useTransportCatalog } from "../utils/transportCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { EVENT_ICON, PHASE_COLOR, PHASE_ICON, PROBLEM_ICON, directionsUrl, kmText, minutesSince, placeLabel, weightText } from "../constants/transporter";
import { humanize, minutesText } from "../constants/agentOps";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate, formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

type Panel = "" | "collect" | "deliver" | "release" | "problem";

const AUTO_SHARE_MS = 60000;

export default function TransporterDeliveryScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useTransportCatalog();

  const loader = useLoader(() => getTransporterDelivery(id), null as any, [id]);
  const d: any = loader.data;

  const [panel, setPanel] = useState<Panel>("");
  const [message, setMessage] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [lastShared, setLastShared] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  const canShare = !!d?.actions?.canShareLocation;

  async function shareNow(silent: boolean) {
    setSharing(true);
    try {
      const position = await getPosition();
      if (!position) {
        if (!silent) Alert.alert("Localização não disponível", "Ative a localização (GPS) e dê permissão ao app.");
        return;
      }
      await shareDeliveryLocation(id, { lat: position.lat, lng: position.lng });
      setLastShared(Date.now());
    } catch (e) {
      if (!silent) Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível partilhar a localização."));
    } finally {
      setSharing(false);
    }
  }

  // Partilha a localização de minuto a minuto, enquanto o app está aberto nesta entrega
  useEffect(() => {
    if (!auto || !canShare) return;
    let alive = true;

    const tick = () => {
      if (alive) shareNow(true);
    };
    tick();
    const timer = setInterval(tick, AUTO_SHARE_MS);

    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, canShare, id]);

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>Entrega</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const c = d.delivery;
  const a = d.actions;
  const phaseLabel = labelOf(catalog.deliveryPhases, c.phase) || c.phase;
  const km = kmText(c.distanceKm, c.distanceApprox);
  const weight = weightText(c.weightKg, c.weightPartial);
  const minutes = minutesSince(c.lastLocationAt);
  const pickupUrl = directionsUrl(c.pickup);
  const destUrl = directionsUrl(c.destination);

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setMessage("");
    setReceivedBy("");
    setReason("");
    setCategory("");
  }

  async function run(work: () => Promise<any>, fail: string, ok?: (r: any) => void) {
    setBusy(true);
    try {
      const r = await work();
      if (r?.delivery) loader.setData(r);
      setPanel("");
      setMessage("");
      if (ok) ok(r);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
      loader.reload();
    } finally {
      setBusy(false);
    }
  }

  function accept() {
    Alert.alert("Aceitar a entrega", `Depois de aceitar, fica responsável pela entrega ${c.orderCode}. O comprador e o vendedor são avisados.`, [
      { text: "Não", style: "cancel" },
      { text: "Aceitar", onPress: () => run(() => acceptDelivery(id), "Não foi possível aceitar a entrega.") },
    ]);
  }

  function decline() {
    Alert.alert("Recusar a entrega", "Esta entrega deixa de aparecer na sua lista.", [
      { text: "Não", style: "cancel" },
      {
        text: "Recusar",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await declineDelivery(id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível recusar."));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  function collect() {
    run(() => collectDelivery(id, { message: message.trim() || undefined }), "Não foi possível confirmar a recolha.", () => setAuto(true));
  }

  async function deliver() {
    setBusy(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const position = await getPosition();
        if (position) {
          lat = position.lat;
          lng = position.lng;
        }
      } catch (e) {
        // a localização é opcional
      }

      const r = await deliverDelivery(id, { receivedBy: receivedBy.trim() || undefined, message: message.trim() || undefined, lat, lng });
      setAuto(false);
      loader.setData(r);
      setPanel("");
      setMessage("");
      setReceivedBy("");
      Alert.alert("Entrega concluída ✅", "O comprador foi avisado para confirmar a receção. Obrigado!");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível concluir a entrega."));
    } finally {
      setBusy(false);
    }
  }

  function release() {
    if (!reason) {
      Alert.alert("Atenção", "Escolha o motivo.");
      return;
    }
    Alert.alert("Desistir da entrega", "A entrega volta a ficar disponível para os outros transportadores e o comprador e o vendedor são avisados.", [
      { text: "Não", style: "cancel" },
      {
        text: "Desistir",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await releaseDelivery(id, { reason, message: message.trim() || undefined });
            navigation.goBack();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível desistir da entrega."));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  function problem() {
    if (!category) {
      Alert.alert("Atenção", "Escolha o tipo de problema.");
      return;
    }
    if (message.trim().length < 5) {
      Alert.alert("Atenção", "Explique o problema (pelo menos 5 letras).");
      return;
    }
    run(() => reportDeliveryProblem(id, { category, message: message.trim() }), "Não foi possível comunicar o problema.", () =>
      Alert.alert("Problema comunicado", "O comprador e o vendedor foram avisados.")
    );
  }

  function person(title: string, p: any) {
    if (!p) return null;
    const wa = whatsappUrl(p.phone);
    return (
      <View style={{ marginTop: 8 }}>
        <Text style={u.muted}>{title}</Text>
        <Text style={u.strong}>
          {p.name} {p.isVerified ? "✅" : ""}
        </Text>
        {p.location ? <Text style={u.muted}>📍 {p.location}</Text> : null}
        {c.mine ? (
          <View style={u.row}>
            {p.id ? <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: p.id, userName: p.name })} /> : null}
            {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
            {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>
            {PHASE_ICON[c.phase] ?? "📦"} Entrega {c.orderCode}
          </Title>
        </View>
        <Badge label={phaseLabel} color={PHASE_COLOR[c.phase] ?? "#757575"} />
      </View>

      {d.notAvailableReason ? (
        <Card>
          <Text style={{ color: "#C62828", fontWeight: "bold" }}>🔴 {d.notAvailableReason}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primary }}>{c.payout ? `💰 ${money(c.payout)}` : "💰 Valor a combinar"}</Text>
        <Text style={u.muted}>Valor do transporte desta entrega</Text>
        {c.orderTotal ? <Text style={u.muted}>Valor da encomenda: {money(c.orderTotal)}</Text> : null}
        {c.paymentMethod ? <Text style={u.muted}>💳 Pagamento da encomenda: {humanize(c.paymentMethod)}</Text> : null}
        {c.desiredDate ? <Text style={u.muted}>🗓️ Data pretendida: {formatDate(c.desiredDate)}</Text> : null}
        {km ? <Text style={u.muted}>📏 Distância: {km}{c.distanceApprox ? " (estimativa entre regiões)" : ""}</Text> : null}
        {weight ? <Text style={u.muted}>⚖️ Carga: {weight}</Text> : null}
        {c.overCapacity ? <Text style={{ color: "#C62828", marginTop: 4 }}>⚠️ A carga é maior do que a capacidade do seu veículo.</Text> : null}
        {c.phase === "DISPONIVEL" && !c.matchesMyRegions ? <Text style={{ color: "#757575", marginTop: 4 }}>Fora das regiões onde trabalha.</Text> : null}
      </Card>

      <SubTitle>📍 Recolha</SubTitle>
      <Card>
        <Text style={u.strong}>{placeLabel(c.pickup, "Local por confirmar")}</Text>
        {!c.pickup.exact ? <Text style={u.muted}>Posição aproximada. Combine o ponto exato com o vendedor.</Text> : null}
        {pickupUrl ? <Btn small label="🧭 Rota até à recolha" onPress={() => Linking.openURL(pickupUrl)} /> : null}
        {person("Vendedor", c.seller)}
      </Card>

      <SubTitle>🏁 Destino</SubTitle>
      <Card>
        <Text style={u.strong}>{placeLabel(c.destination, "Local por confirmar")}</Text>
        {!c.destination.exact ? <Text style={u.muted}>Posição aproximada. Peça o endereço ao comprador.</Text> : null}
        {destUrl ? <Btn small label="🧭 Rota até ao destino" onPress={() => Linking.openURL(destUrl)} /> : null}
        {person("Comprador", c.buyer)}
      </Card>
      {!c.mine ? <Text style={u.muted}>🔒 Os telefones e o chat aparecem depois de aceitar a entrega.</Text> : null}

      <SubTitle>📦 Produtos e quantidades ({c.itemsCount})</SubTitle>
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

      {canShare ? (
        <>
          <SubTitle>📡 Localização</SubTitle>
          <Card>
            <Text style={u.muted}>
              {c.lastLocationAt ? `Última localização partilhada ${minutesText(minutes)}${c.lastLocation ? `: ${c.lastLocation}` : ""}.` : "Ainda não partilhou onde está."}
              {lastShared ? ` Agora mesmo: enviada.` : ""}
            </Text>
            <Btn small label={sharing ? "A enviar..." : "📡 Partilhar onde estou"} onPress={() => shareNow(false)} disabled={sharing} />
            <View style={[u.between, { marginTop: 8 }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={u.strong}>Partilhar sempre, de minuto a minuto</Text>
                <Text style={u.muted}>O comprador acompanha a entrega. Funciona enquanto o app estiver aberto nesta tela.</Text>
              </View>
              <Switch value={auto} onValueChange={setAuto} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
            </View>
          </Card>
        </>
      ) : null}

      <SubTitle>O que fazer</SubTitle>
      <View style={u.row}>
        {a.canAccept ? <Btn label={busy ? "..." : "✅ Aceitar a entrega"} onPress={accept} disabled={busy} /> : null}
        {a.canDecline ? <Btn small kind="outline" label="Recusar" onPress={decline} disabled={busy} /> : null}
        {a.canCollect ? <Btn small label="📦 Já recolhi os produtos" onPress={() => open("collect")} /> : null}
        {a.canDeliver ? <Btn small label="🏁 Entreguei" onPress={() => open("deliver")} /> : null}
        {a.canReportProblem ? <Btn small kind="outline" label="⚠️ Comunicar problema" onPress={() => open("problem")} /> : null}
        {a.canRelease ? <Btn small kind="danger" label="↩️ Desistir" onPress={() => open("release")} /> : null}
      </View>
      {!a.canAccept && !a.canDecline && !a.canCollect && !a.canDeliver && !a.canRelease && c.phase === "ENTREGUE" ? (
        <Text style={{ color: "#2E7D32" }}>✅ Entrega concluída{c.deliveredAt ? ` em ${formatDateTime(c.deliveredAt)}` : ""}.</Text>
      ) : null}

      {panel === "collect" ? (
        <Card>
          <Text style={u.strong}>Confirmar a recolha</Text>
          <Text style={u.muted}>O comprador é avisado de que a encomenda está a caminho.</Text>
          <Field label="Nota (opcional)" value={message} onChangeText={setMessage} multiline placeholder="Ex: Recolhi 3 sacos de arroz" />
          <View style={u.row}>
            <Btn label={busy ? "A guardar..." : "Confirmar recolha"} onPress={collect} disabled={busy} />
            <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
          </View>
        </Card>
      ) : null}

      {panel === "deliver" ? (
        <Card>
          <Text style={u.strong}>Confirmar a entrega</Text>
          <Text style={u.muted}>O comprador é avisado para confirmar a receção. Guardamos o ponto onde está agora, se o GPS estiver ligado.</Text>
          <Field label="Quem recebeu (opcional)" value={receivedBy} onChangeText={setReceivedBy} placeholder="Ex: Maria Gomes" />
          <Field label="Nota (opcional)" value={message} onChangeText={setMessage} multiline placeholder="Ex: Entregue à porta de casa" />
          <View style={u.row}>
            <Btn label={busy ? "A guardar..." : "Confirmar entrega"} onPress={deliver} disabled={busy} />
            <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
          </View>
        </Card>
      ) : null}

      {panel === "release" ? (
        <Card>
          <Text style={u.strong}>Desistir da entrega</Text>
          <Text style={u.muted}>Só se pode desistir antes de recolher os produtos.</Text>
          <ChipGroup label="Motivo" options={catalog.releaseReasons} value={reason} onChange={setReason} />
          <Field label="Explicação (opcional)" value={message} onChangeText={setMessage} multiline />
          <View style={u.row}>
            <Btn kind="danger" label={busy ? "A enviar..." : "Desistir"} onPress={release} disabled={busy} />
            <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
          </View>
        </Card>
      ) : null}

      {panel === "problem" ? (
        <Card>
          <Text style={u.strong}>Comunicar um problema</Text>
          <Text style={u.muted}>O comprador e o vendedor são avisados.</Text>
          <ChipGroup
            label="Tipo de problema"
            options={catalog.problemKinds.map((k) => ({ ...k, icon: PROBLEM_ICON[k.value] }))}
            value={category}
            onChange={setCategory}
          />
          <Field label="O que se passa" value={message} onChangeText={setMessage} multiline placeholder="Ex: O comprador não atende o telefone" />
          <View style={u.row}>
            <Btn label={busy ? "A enviar..." : "Enviar"} onPress={problem} disabled={busy} />
            <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
          </View>
        </Card>
      ) : null}

      <SubTitle>Andamento ({d.events.length})</SubTitle>
      {d.events.length === 0 ? (
        <Text style={u.muted}>Ainda não há registos.</Text>
      ) : (
        d.events.map((e: any) => (
          <Card key={e.id}>
            <Text style={u.strong}>
              {EVENT_ICON[e.kind] ?? "•"} {labelOf(catalog.eventKinds, e.kind) || e.kind}
            </Text>
            {e.message ? <Text style={{ marginTop: 2, lineHeight: 20 }}>{e.message}</Text> : null}
            <Text style={u.muted}>
              {e.authorName} · {formatDateTime(e.createdAt)}
            </Text>
          </Card>
        ))
      )}
    </Page>
  );
}
