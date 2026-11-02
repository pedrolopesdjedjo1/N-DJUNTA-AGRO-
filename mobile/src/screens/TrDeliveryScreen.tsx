import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import PhotoPicker from "../components/transporter/PhotoPicker";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import {
  getTrDelivery,
  acceptTrDelivery,
  declineTrDelivery,
  releaseTrDelivery,
  collectTrDelivery,
  startTrTrip,
  arriveTrDelivery,
  deliverTrDelivery,
  shareTrLocation,
  reportTrProblem,
  getTrDeliveryRoute,
  listTrToRate,
  rateTrParty,
  logTrContact,
} from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { getPosition } from "../utils/trLocation";
import { labelOf } from "../utils/ngoCatalog";
import { TR_CARGO_ICON, TR_PHASE_COLOR, TR_PHASE_ICON, trDirectionsUrl, trEtaText, trKmText, trPlaceLabel, trStars, trWeightText } from "../constants/transporterV2";
import { minutesText } from "../constants/agentOps";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate, formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

type Panel = "" | "collect" | "start" | "arrive" | "deliver" | "release" | "problem" | "route";

function Stepper({ steps }: { steps: { label: string; done: boolean }[] }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
      {steps.map((s, i) => (
        <View key={s.label} style={{ alignItems: "center", flex: 1 }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: s.done ? "#2E7D32" : "#CFD8DC", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold" }}>{s.done ? "✓" : i + 1}</Text>
          </View>
          <Text style={{ fontSize: 10, marginTop: 2, color: s.done ? "#2E7D32" : "#757575" }} numberOfLines={1}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Avaliar o comprador e o vendedor depois de entregar
function RatePanel({ deliveryId, onChanged }: { deliveryId: string; onChanged: () => void }) {
  const loader = useLoader(async () => {
    const list: any[] = await listTrToRate();
    return list.find((e) => e.deliveryId === deliveryId) ?? null;
  }, null as any, [deliveryId]);
  const entry: any = loader.data;

  const [stars, setStars] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  if (!entry) return null;
  const pending = (entry.parties as any[]).filter((p) => !p.rated);
  if (pending.length === 0) return null;

  async function send(p: any) {
    if (!stars[p.party]) {
      Alert.alert("Atenção", "Escolha de 1 a 5 estrelas.");
      return;
    }
    setBusy(p.party);
    try {
      await rateTrParty(deliveryId, { party: p.party, rating: stars[p.party], comment: comments[p.party]?.trim() || undefined });
      await loader.reload();
      onChanged();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a avaliação."));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <SubTitle>⭐ Avaliar esta entrega</SubTitle>
      {pending.map((p) => (
        <Card key={p.party}>
          <Text style={u.strong}>
            {p.party === "BUYER" ? "🛒 Comprador" : "🏪 Vendedor"}: {p.name}
          </Text>
          <View style={u.row}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Chip key={n} label={`${n} ★`} active={stars[p.party] === n} onPress={() => setStars((prev) => ({ ...prev, [p.party]: n }))} />
            ))}
          </View>
          <Field label="Comentário (opcional)" value={comments[p.party] ?? ""} onChangeText={(v) => setComments((prev) => ({ ...prev, [p.party]: v }))} multiline placeholder="Ex: Estava à espera e recebeu bem." />
          <Btn small label={busy === p.party ? "A enviar..." : "Enviar avaliação"} onPress={() => send(p)} disabled={busy === p.party} />
        </Card>
      ))}
    </>
  );
}

export default function TrDeliveryScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useTrCatalog();
  const loader = useLoader(() => getTrDelivery(id), null as any, [id]);
  const d: any = loader.data;

  const [panel, setPanel] = useState<Panel>("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [noProof, setNoProof] = useState(false);
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const [routeData, setRouteData] = useState<any>(null);
  const [autoShare, setAutoShare] = useState(true);
  const [privacyNote, setPrivacyNote] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  const phase = d?.delivery?.phase;
  const mine = !!d?.delivery?.mine;

  // Enquanto a entrega está em transporte e o app está aberto, partilha a localização de minuto a minuto
  useEffect(() => {
    if (!mine || phase !== "EM_TRANSPORTE" || !autoShare) return;

    let alive = true;
    async function tick() {
      const pos = await getPosition(false);
      if (!pos || !alive) return;
      try {
        const r = await shareTrLocation(id, { lat: pos.lat, lng: pos.lng });
        if (alive && r?.reason === "PRIVACIDADE") setPrivacyNote(true);
      } catch (e) {
        // tenta de novo no minuto seguinte
      }
    }
    tick();
    const timer = setInterval(tick, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [mine, phase, autoShare, id]);

  if (!d) {
    return (
      <TrLayout active="TrDeliveries">
        <Page loader={loader}>
          <Title>Entrega</Title>
          <Empty text="A carregar..." />
        </Page>
      </TrLayout>
    );
  }

  const c = d.delivery;
  const a = d.actions;
  const km = trKmText(c.distanceKm, c.distanceApprox);
  const eta = trEtaText(c.etaMinutes);
  const weight = trWeightText(c.weightKg, c.weightPartial);
  const pickupUrl = trDirectionsUrl(c.pickup);
  const destUrl = trDirectionsUrl(c.destination);
  const minutes = c.lastLocationAt ? Math.floor((Date.now() - new Date(c.lastLocationAt).getTime()) / 60000) : null;
  const collected = c.phase === "EM_TRANSPORTE" || c.phase === "ENTREGUE";
  const delivered = c.phase === "ENTREGUE";

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setPhoto(null);
    setText("");
    setReceivedBy("");
    setNoProof(false);
    setReason("");
    setCategory("");
  }

  async function run(work: () => Promise<any>, fail: string, after?: () => void) {
    setBusy(true);
    try {
      const r = await work();
      if (r?.delivery) loader.setData(r);
      else loader.reload();
      setPanel("");
      if (after) after();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  async function withPosition(ask: boolean) {
    const pos = await getPosition(ask);
    return pos ? { lat: pos.lat, lng: pos.lng } : {};
  }

  function accept() {
    Alert.alert("Aceitar a entrega", `Vai transportar a encomenda ${c.orderCode}${c.payout ? ` por ${money(c.payout)}` : ""}. Continuar?`, [
      { text: "Não", style: "cancel" },
      { text: "Aceitar", onPress: () => run(() => acceptTrDelivery(id), "Não foi possível aceitar a entrega.") },
    ]);
  }

  function decline() {
    Alert.alert("Recusar a entrega", "Esta entrega deixa de aparecer na sua lista.", [
      { text: "Não", style: "cancel" },
      {
        text: "Recusar",
        onPress: async () => {
          try {
            await declineTrDelivery(id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível recusar."));
          }
        },
      },
    ]);
  }

  async function submit() {
    const note = text.trim();

    if (panel === "collect") {
      return run(() => collectTrDelivery(id, { photoUrl: photo ?? undefined, message: note || undefined }), "Não foi possível confirmar a recolha.");
    }
    if (panel === "start") {
      const pos = await withPosition(true);
      return run(() => startTrTrip(id, pos), "Não foi possível iniciar a viagem.");
    }
    if (panel === "arrive") {
      const pos = await withPosition(true);
      return run(() => arriveTrDelivery(id, pos), "Não foi possível registar a chegada.");
    }
    if (panel === "deliver") {
      if (!photo && !noProof) return Alert.alert("Atenção", "Tire uma foto do comprovativo de entrega (a carga entregue ou o comprador a receber).");
      if (!photo && note.length < 5) return Alert.alert("Atenção", "Explique porque não há foto.");
      const pos = await withPosition(false);
      return run(
        () => deliverTrDelivery(id, { proofUrl: photo ?? undefined, noProofReason: !photo ? note : undefined, message: photo ? note || undefined : undefined, receivedBy: receivedBy.trim() || undefined, ...pos }),
        "Não foi possível confirmar a entrega."
      );
    }
    if (panel === "release") {
      if (!reason) return Alert.alert("Atenção", "Escolha o motivo do cancelamento.");
      const after = phase === "EM_TRANSPORTE";
      if (after && note.length < 10) return Alert.alert("Atenção", "Depois de recolher os produtos, explique o que se passou e onde estão (pelo menos 10 letras).");
      return Alert.alert(
        after ? "Cancelar com os produtos recolhidos?" : "Cancelar a entrega?",
        after ? "A equipa, o comprador e o vendedor são avisados e o caso fica registado. Só faça isto se não houver outra solução." : "A entrega volta a ficar disponível para outros transportadores.",
        [
          { text: "Não", style: "cancel" },
          {
            text: "Cancelar a entrega",
            style: "destructive",
            onPress: async () => {
              setBusy(true);
              try {
                await releaseTrDelivery(id, { reason, message: note || undefined });
                navigation.navigate("TrDeliveries", { tab: "available" });
              } catch (e) {
                Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível cancelar a entrega."));
              } finally {
                setBusy(false);
              }
            },
          },
        ]
      );
    }
    if (panel === "problem") {
      if (!category) return Alert.alert("Atenção", "Escolha o tipo de problema.");
      if (note.length < 5) return Alert.alert("Atenção", "Explique o problema (pelo menos 5 letras).");
      return run(() => reportTrProblem(id, { category, message: note, photoUrl: photo ?? undefined }), "Não foi possível comunicar o problema.");
    }
    return undefined;
  }

  async function openRoute() {
    if (panel === "route") {
      setPanel("");
      return;
    }
    setPanel("route");
    setRouteData(null);
    const pos = await getPosition(true);
    try {
      setRouteData(await getTrDeliveryRoute(id, pos ? { lat: pos.lat, lng: pos.lng } : {}));
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível calcular a rota."));
      setPanel("");
    }
  }

  async function shareNow() {
    const pos = await getPosition(true);
    if (!pos) return Alert.alert("Localização desligada", "Ative a localização do telemóvel para partilhar onde está.");
    try {
      const r = await shareTrLocation(id, { lat: pos.lat, lng: pos.lng });
      if (r?.reason === "PRIVACIDADE") {
        setPrivacyNote(true);
        Alert.alert("Localização não partilhada", "Desligou a partilha de localização nas configurações. O comprador não vê onde está.");
      } else {
        Alert.alert("Pronto", "O comprador e o vendedor veem onde está.");
        loader.reload();
      }
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível partilhar a localização."));
    }
  }

  function contact(p: any, via: "CHAMADA" | "WHATSAPP" | "MENSAGEM") {
    logTrContact({ targetId: p.id, deliveryId: id, via }).catch(() => {});
    if (via === "CHAMADA") Linking.openURL(`tel:${p.phone}`);
    else if (via === "WHATSAPP") Linking.openURL(whatsappUrl(p.phone) as string);
    else navigation.navigate("Chat", { userId: p.id, userName: p.name });
  }

  function person(title: string, p: any) {
    if (!p) return null;
    const wa = whatsappUrl(p.phone);
    return (
      <Card>
        <Text style={u.muted}>{title}</Text>
        <Text style={u.strong}>
          {p.name} {p.isVerified ? "✅" : ""}
        </Text>
        {p.location ? <Text style={u.muted}>📍 {p.location}</Text> : null}
        {c.mine && p.id ? (
          <View style={u.row}>
            <Btn small kind="outline" label="💬 Mensagem" onPress={() => contact(p, "MENSAGEM")} />
            {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => contact(p, "CHAMADA")} /> : null}
            {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => contact(p, "WHATSAPP")} /> : null}
          </View>
        ) : (
          <Text style={u.muted}>Depois de aceitar a entrega, vê os contactos.</Text>
        )}
      </Card>
    );
  }

  const steps = [
    { label: "Aceite", done: c.phase !== "DISPONIVEL" },
    { label: "Recolhida", done: collected },
    { label: "Viagem", done: d.tracking.started || delivered },
    { label: "Chegou", done: d.tracking.arrived || delivered },
    { label: "Entregue", done: delivered },
  ];

  const panelTitle: Record<string, string> = {
    collect: "Confirmar a recolha dos produtos",
    start: "Iniciar a viagem",
    arrive: "Cheguei ao destino",
    deliver: "Confirmar a entrega",
    release: phase === "EM_TRANSPORTE" ? "Cancelar a entrega (produtos já recolhidos)" : "Cancelar a entrega",
    problem: "Comunicar um problema",
  };

  return (
    <TrLayout active="TrDeliveries">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>
              {TR_PHASE_ICON[c.phase] ?? "📦"} Entrega {c.orderCode}
            </Title>
          </View>
          <Badge label={labelOf(catalog.deliveryPhases, c.phase) || c.phase} color={TR_PHASE_COLOR[c.phase] ?? "#757575"} />
        </View>

        {c.mine && c.phase !== "CANCELADA" ? <Stepper steps={steps} /> : null}

        <Card>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primary }}>{c.payout ? `💰 ${money(c.payout)}` : "💰 Valor a combinar"}</Text>
          <Text style={u.muted}>Valor do transporte desta entrega</Text>
          <Text style={[u.muted, { marginTop: 4 }]}>
            {[km ? `📏 ${km}` : "", eta ? `⏱️ ${eta}` : "", weight ? `⚖️ ${weight}` : ""].filter(Boolean).join(" · ")}
          </Text>
          {c.distanceApprox ? <Text style={u.muted}>Distância e tempo são estimativas entre regiões.</Text> : null}
          {c.desiredDate ? <Text style={u.muted}>🗓️ Data pretendida: {formatDate(c.desiredDate)}</Text> : null}
          {c.paymentMethod ? <Text style={u.muted}>💳 Pagamento da encomenda: {String(c.paymentMethod).toLowerCase().replace("_", " ")}</Text> : null}
          {c.ready ? <Text style={{ color: "#2E7D32", marginTop: 4 }}>✅ Os produtos estão prontos para recolher.</Text> : null}
        </Card>

        {d.compatibilityMessages.length > 0 && c.phase === "DISPONIVEL" ? (
          <Card>
            <Text style={{ color: "#C62828", fontWeight: "bold" }}>⛔ Não pode aceitar esta entrega</Text>
            {d.compatibilityMessages.map((m: string) => (
              <Text key={m} style={{ marginTop: 3 }}>
                • {m}
              </Text>
            ))}
            <Btn small kind="outline" label="Abrir o meu veículo" onPress={() => navigation.navigate("TrVehicle")} />
          </Card>
        ) : null}
        {d.notAvailableReason ? (
          <Card>
            <Text style={{ color: "#EF6C00" }}>{d.notAvailableReason}</Text>
          </Card>
        ) : null}

        <SubTitle>📍 Recolha e 🏁 destino</SubTitle>
        <Card>
          <Text style={u.strong}>📍 {trPlaceLabel(c.pickup, "Recolha por confirmar")}</Text>
          {pickupUrl ? <Btn small kind="outline" label="🧭 Abrir no mapa" onPress={() => Linking.openURL(pickupUrl)} /> : null}
          <Text style={[u.strong, { marginTop: 10 }]}>🏁 {trPlaceLabel(c.destination, "Destino por confirmar")}</Text>
          {destUrl ? <Btn small kind="outline" label="🧭 Abrir no mapa" onPress={() => Linking.openURL(destUrl)} /> : null}
          <Btn small label={panel === "route" ? "Fechar a rota" : "⏱️ Calcular tempo e rota"} onPress={openRoute} />
        </Card>

        {panel === "route" ? (
          <Card>
            {!routeData ? (
              <Text style={u.muted}>A calcular...</Text>
            ) : (
              <>
                {routeData.legs.map((l: any) => (
                  <View key={l.label} style={[u.between, { marginTop: 4 }]}>
                    <Text style={{ flex: 1, marginRight: 8 }}>{l.label}</Text>
                    <Text style={{ fontWeight: "bold" }}>
                      {trKmText(l.km, true) ?? "—"} · {trEtaText(l.minutes) ?? "—"}
                    </Text>
                  </View>
                ))}
                <Text style={[u.strong, { marginTop: 8 }]}>
                  Total: {trKmText(routeData.totalKm, true)} · {trEtaText(routeData.totalMinutes)}
                </Text>
                {routeData.alerts.map((al: any) => (
                  <Text key={al.id} style={{ color: "#EF6C00", marginTop: 4 }}>
                    ⚠️ {al.title} ({al.regions.join(", ") || "todo o país"})
                  </Text>
                ))}
                <Text style={[u.muted, { marginTop: 6 }]}>{routeData.note}</Text>
              </>
            )}
          </Card>
        ) : null}

        <SubTitle>📦 Produtos ({c.itemsCount})</SubTitle>
        {c.items.length === 0 ? (
          <Text style={u.muted}>Sem produtos para mostrar.</Text>
        ) : (
          <Card>
            {c.items.map((i: any) => (
              <View key={i.id} style={[u.between, { marginTop: 4 }]}>
                <Text style={{ flex: 1, marginRight: 8 }}>
                  {TR_CARGO_ICON[i.cargo] ?? "📦"} {i.title}
                </Text>
                <Text style={{ fontWeight: "bold" }}>
                  {i.quantity}
                  {i.unit ? ` ${i.unit}` : "×"}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {person("Vendedor", c.seller)}
        {person("Comprador", c.buyer)}

        {c.mine && (phase === "ACEITE" || phase === "EM_TRANSPORTE") ? (
          <>
            <SubTitle>📡 Localização</SubTitle>
            <Card>
              {c.lastLocationAt ? (
                <Text style={{ color: minutes !== null && minutes > 30 ? "#EF6C00" : undefined }}>
                  {c.lastLocation ?? "Localização partilhada"} · {minutesText(minutes)}
                </Text>
              ) : (
                <Text style={{ color: "#EF6C00" }}>Ainda não partilhou onde está.</Text>
              )}
              {privacyNote ? <Text style={{ color: "#EF6C00", marginTop: 4 }}>A partilha de localização está desligada nas suas configurações.</Text> : null}
              <View style={u.row}>
                <Btn small kind="outline" label="📍 Partilhar agora" onPress={shareNow} />
                {phase === "EM_TRANSPORTE" ? <Chip label={autoShare ? "🔄 Partilha automática ligada" : "Partilha automática desligada"} active={autoShare} onPress={() => setAutoShare(!autoShare)} /> : null}
              </View>
              {phase === "EM_TRANSPORTE" ? <Text style={u.muted}>Com o app aberto, a localização é enviada a cada minuto ao comprador e ao vendedor.</Text> : null}
            </Card>
          </>
        ) : null}

        <SubTitle>Ações</SubTitle>
        {a.canAccept ? <Btn label="✅ Aceitar esta entrega" onPress={accept} disabled={busy} /> : null}
        {a.canDecline ? <Btn small kind="outline" label="Recusar" onPress={decline} /> : null}

        {a.canCollect ? <Btn label="📦 Confirmar a recolha dos produtos" onPress={() => open("collect")} /> : null}
        {a.canStart ? <Btn label="🚚 Iniciar a viagem" onPress={() => open("start")} /> : null}
        {a.canArrive && d.tracking.started ? <Btn label="📍 Cheguei ao destino" onPress={() => open("arrive")} /> : null}
        {a.canDeliver ? <Btn label="🏁 Confirmar a entrega" onPress={() => open("deliver")} /> : null}

        {c.mine && (a.canReportProblem || a.canRelease) ? (
          <View style={u.row}>
            {a.canReportProblem ? <Btn small kind="outline" label="⚠️ Comunicar problema" onPress={() => open("problem")} /> : null}
            {a.canRelease ? <Btn small kind="danger" label="Cancelar a entrega" onPress={() => open("release")} /> : null}
            <Btn small kind="outline" label="🆘 Emergência" onPress={() => navigation.navigate("TrEmergency", { deliveryId: id })} />
          </View>
        ) : null}

        {(c.mine || c.phase === "DISPONIVEL") && c.phase !== "CANCELADA" && c.phase !== "ENTREGUE" ? (
          <Btn small kind="outline" label="🔗 Combinar com outras entregas" onPress={() => navigation.navigate("TrCombine", { id })} />
        ) : null}

        {panel && panel !== "route" ? (
          <Card>
            <Text style={u.strong}>{panelTitle[panel]}</Text>

            {panel === "collect" ? (
              <>
                <Text style={u.muted}>Confira os produtos com o vendedor. Uma foto da carga protege-o se houver reclamações.</Text>
                <PhotoPicker label="Foto da carga (opcional)" value={photo} onChange={setPhoto} />
                <Field label="Nota (opcional)" value={text} onChangeText={setText} multiline placeholder="Ex: 20 sacos, um deles rasgado." />
              </>
            ) : null}

            {panel === "start" ? (
              <Text style={u.muted}>Ao iniciar, o comprador é avisado com a hora estimada de chegada e a entrega fica acompanhada. Ative a localização do telemóvel.</Text>
            ) : null}

            {panel === "arrive" ? <Text style={u.muted}>O comprador é avisado de que chegou ao destino.</Text> : null}

            {panel === "deliver" ? (
              <>
                <Text style={u.muted}>O comprovativo é uma foto da carga entregue ou do comprador a receber. O comprador, o vendedor e a equipa podem vê-lo.</Text>
                {!noProof ? <PhotoPicker label="Foto do comprovativo" value={photo} onChange={setPhoto} /> : null}
                <Chip label={noProof ? "Sem foto (explique porquê)" : "Não consigo tirar foto"} active={noProof} onPress={() => { setNoProof(!noProof); setPhoto(null); }} />
                <Field label="Quem recebeu (opcional)" value={receivedBy} onChangeText={setReceivedBy} placeholder="Ex: Maria Gomes" />
                <Field label={noProof ? "Porque não há foto (obrigatório)" : "Nota (opcional)"} value={text} onChangeText={setText} multiline />
              </>
            ) : null}

            {panel === "release" ? (
              <>
                {phase === "EM_TRANSPORTE" ? (
                  <Text style={{ color: "#C62828" }}>Já recolheu os produtos. Explique o que se passou e onde estão: a equipa vai acompanhar.</Text>
                ) : (
                  <Text style={u.muted}>A entrega volta a ficar disponível para outros transportadores. Cancelar muitas entregas baixa a sua reputação.</Text>
                )}
                <ChipGroup label="Motivo" options={catalog.releaseReasons} value={reason} onChange={setReason} />
                <Field label={phase === "EM_TRANSPORTE" ? "O que se passou (obrigatório)" : "Nota (opcional)"} value={text} onChangeText={setText} multiline />
              </>
            ) : null}

            {panel === "problem" ? (
              <>
                <ChipGroup label="Que problema?" options={catalog.problemKinds} value={category} onChange={setCategory} />
                <Field label="Explique" value={text} onChangeText={setText} multiline placeholder="Ex: O comprador não atende o telefone há 30 minutos." />
                <PhotoPicker label="Foto (opcional)" value={photo} onChange={setPhoto} />
                <Text style={u.muted}>O comprador e o vendedor são avisados.</Text>
              </>
            ) : null}

            <View style={u.row}>
              <Btn kind={panel === "release" ? "danger" : "primary"} label={busy ? "A guardar..." : "Confirmar"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        {delivered && c.mine ? <RatePanel deliveryId={id} onChanged={() => {}} /> : null}

        {c.mine ? (
          <View style={u.row}>
            <Btn small kind="outline" label="🚩 Denunciar um problema" onPress={() => navigation.navigate("ReportCreate", { targetType: "DELIVERY", targetId: id })} />
          </View>
        ) : null}

        <SubTitle>Andamento ({d.events.length})</SubTitle>
        {d.events.length === 0 ? (
          <Text style={u.muted}>Ainda não há registos.</Text>
        ) : (
          d.events.map((e: any) => (
            <Card key={e.id}>
              <Text style={u.strong}>
                {labelOf(catalog.eventKinds, e.kind) || (e.kind === "TRATADO" ? "Tratado pela equipa" : e.kind)}
              </Text>
              {e.category ? <Text style={u.muted}>{labelOf(catalog.problemKinds, e.category) || labelOf(catalog.releaseReasons, e.category) || e.category}</Text> : null}
              {e.message ? <Text style={{ marginTop: 2, lineHeight: 20 }}>{e.message}</Text> : null}
              {e.photoUrl ? (
                <Image source={{ uri: e.photoUrl }} resizeMode="cover" style={{ width: "100%", height: 150, borderRadius: 8, marginTop: 6, backgroundColor: "#ECEFF1" }} />
              ) : null}
              <Text style={u.muted}>
                {e.authorName} · {formatDateTime(e.createdAt)}
              </Text>
            </Card>
          ))
        )}
      </Page>
    </TrLayout>
  );
}
