import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert, Linking, Share, Switch, Platform, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getTrEmergencyContacts, saveTrEmergencyContacts, createTrIncident, listTrIncidents, getTrSettings } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { getPosition } from "../utils/trLocation";
import { labelOf } from "../utils/ngoCatalog";
import { OFFICIAL_EMERGENCY_NUMBERS } from "../constants/emergencyNumbers";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

const KIND_ICON: Record<string, string> = { SOS: "🆘", ACIDENTE: "💥", AVARIA: "🔧", ASSISTENCIA: "🚨", OCORRENCIA: "📝" };
const STATUS_COLOR: Record<string, string> = { ABERTA: "#F9A825", EM_ATENDIMENTO: "#1565C0", RESOLVIDA: "#2E7D32" };

interface Contact {
  name: string;
  phone: string;
}

function smsUrl(phone: string, text: string) {
  return `sms:${phone}${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(text)}`;
}

function waUrl(phone: string, text: string): string | null {
  const base = whatsappUrl(phone);
  if (!base) return null;
  return `${base}${base.includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}`;
}

export default function TrEmergencyScreen({ navigation, route }: any) {
  const catalog = useTrCatalog();
  const deliveryId: string | undefined = route?.params?.deliveryId;

  const contactsLoader = useLoader(getTrEmergencyContacts, { contacts: [] as Contact[] });
  const incidents = useLoader(listTrIncidents, { open: 0, items: [] as any[] });
  const settings = useLoader(getTrSettings, { support: { email: "", phones: [] as string[] } } as any);

  const [kind, setKind] = useState<string>(route?.params?.kind ?? "");
  const [description, setDescription] = useState("");
  const [share, setShare] = useState(true);
  const [markBroken, setMarkBroken] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [savingContacts, setSavingContacts] = useState(false);

  useEffect(() => {
    setContacts(contactsLoader.data.contacts ?? []);
  }, [contactsLoader.data]);

  useFocusEffect(
    useCallback(() => {
      contactsLoader.reload();
      incidents.reload();
      settings.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function fire(incidentKind: string, withLocation: boolean) {
    setSending(true);
    try {
      let pos = null;
      if (withLocation) {
        pos = await getPosition(true);
        if (!pos) Alert.alert("Localização desligada", "Não consegui ver onde está. O pedido vai sem localização.");
      }

      const r = await createTrIncident({
        kind: incidentKind,
        description: description.trim() || undefined,
        shareLocation: !!pos,
        lat: pos?.lat,
        lng: pos?.lng,
        deliveryId,
        markVehicleBroken: incidentKind === "AVARIA" ? markBroken : undefined,
      });

      setResult(r);
      setDescription("");
      setKind("");
      incidents.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar o pedido. Se for urgente, ligue para o suporte."));
    } finally {
      setSending(false);
    }
  }

  function sos() {
    Alert.alert("🚨 Enviar SOS?", "A equipa NÔDJUNTA é avisada agora. Quer partilhar a sua localização com ela?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sem localização", onPress: () => fire("SOS", false) },
      { text: "Com localização", style: "destructive", onPress: () => fire("SOS", true) },
    ]);
  }

  function sendIncident() {
    if (!kind) return Alert.alert("Atenção", "Escolha o que aconteceu.");
    if (kind !== "SOS" && description.trim().length < 5) return Alert.alert("Atenção", "Descreva o que se passou (pelo menos 5 letras).");
    fire(kind, share);
  }

  async function saveContacts(list: Contact[]) {
    setSavingContacts(true);
    try {
      const r = await saveTrEmergencyContacts(list);
      setContacts(r.contacts);
      setNewName("");
      setNewPhone("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar os contactos."));
    } finally {
      setSavingContacts(false);
    }
  }

  function addContact() {
    const phone = newPhone.replace(/[\s-]/g, "");
    if (newName.trim().length < 2) return Alert.alert("Atenção", "Escreva o nome.");
    if (!/^\+?\d{7,15}$/.test(phone)) return Alert.alert("Atenção", "Telefone inválido.");
    if (contacts.length >= 5) return Alert.alert("Atenção", "Pode guardar até 5 contactos.");
    saveContacts([...contacts, { name: newName.trim(), phone }]);
  }

  function removeContact(index: number) {
    saveContacts(contacts.filter((_, i) => i !== index));
  }

  const support: string[] = settings.data.support?.phones ?? [];
  const supportEmail: string = settings.data.support?.email ?? "";
  const shareText: string = result?.shareText ?? "";
  const sendKinds = catalog.incidentKinds.filter((k) => k.value !== "SOS");

  return (
    <TrLayout active="TrProfile">
      <Page>
        <Title>🆘 Emergência</Title>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={sos}
          disabled={sending}
          style={{ backgroundColor: "#C62828", borderRadius: 14, paddingVertical: 22, alignItems: "center", marginTop: 6, opacity: sending ? 0.6 : 1 }}
        >
          <Text style={{ fontSize: 34 }}>🆘</Text>
          <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "bold" }}>{sending ? "A enviar..." : "SOS"}</Text>
          <Text style={{ color: "#FFFFFF", marginTop: 2 }}>Toque para pedir ajuda urgente</Text>
        </TouchableOpacity>
        <Text style={u.muted}>Avisa agora a equipa NÔDJUNTA. A sua localização só vai se o autorizar. Em perigo de vida, ligue também para os serviços de emergência.</Text>

        {result ? (
          <Card>
            <Text style={{ color: "#2E7D32", fontWeight: "bold" }}>✅ Pedido enviado. A equipa foi avisada.</Text>
            <Text style={u.muted}>Pode avisar também as pessoas de confiança:</Text>
            {result.contacts.length === 0 ? (
              <Text style={u.muted}>Ainda não tem contactos de emergência guardados. Guarde-os mais abaixo.</Text>
            ) : (
              result.contacts.map((c: Contact) => (
                <View key={c.phone} style={{ marginTop: 6 }}>
                  <Text style={u.strong}>{c.name}</Text>
                  <View style={u.row}>
                    {waUrl(c.phone, shareText) ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(waUrl(c.phone, shareText) as string)} /> : null}
                    <Btn small kind="outline" label="SMS" onPress={() => Linking.openURL(smsUrl(c.phone, shareText))} />
                    <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${c.phone}`)} />
                  </View>
                </View>
              ))
            )}
            <View style={u.row}>
              <Btn small kind="outline" label="📤 Partilhar a mensagem" onPress={() => Share.share({ message: shareText }).catch(() => {})} />
              <Btn small kind="outline" label="Fechar" onPress={() => setResult(null)} />
            </View>
          </Card>
        ) : null}

        <SubTitle>Ligar para pedir ajuda</SubTitle>
        <Card>
          {OFFICIAL_EMERGENCY_NUMBERS.map((n) => (
            <View key={n.phone} style={[u.between, { marginBottom: 6 }]}>
              <Text style={{ flex: 1, marginRight: 8 }}>
                {n.label} · <Text style={{ fontWeight: "bold" }}>{n.phone}</Text>
              </Text>
              <Btn small label="📞 Ligar" onPress={() => Linking.openURL(`tel:${n.phone}`)} />
            </View>
          ))}
          <Text style={u.strong}>Suporte NÔDJUNTA AGRO</Text>
          {support.map((p) => (
            <View key={p} style={[u.between, { marginTop: 6 }]}>
              <Text style={{ flex: 1, marginRight: 8 }}>{p}</Text>
              <View style={u.row}>
                <Btn small label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p}`)} />
                {whatsappUrl(p) ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(whatsappUrl(p) as string)} /> : null}
              </View>
            </View>
          ))}
          {supportEmail ? <Btn small kind="outline" label={`📧 ${supportEmail}`} onPress={() => Linking.openURL(`mailto:${supportEmail}`)} /> : null}
        </Card>

        <SubTitle>Comunicar acidente, avaria ou ocorrência</SubTitle>
        <Card>
          <ChipGroup label="O que aconteceu?" options={sendKinds.map((k) => ({ ...k, icon: KIND_ICON[k.value] }))} value={kind} onChange={setKind} />
          <Field label="Descreva" value={description} onChangeText={setDescription} multiline placeholder="Ex: O pneu rebentou perto de Bafatá. Estou em segurança, com a carga." />
          {deliveryId ? <Text style={u.muted}>Fica ligado à entrega que tem aberta.</Text> : null}

          <View style={[u.between, { marginTop: 6 }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={u.strong}>Partilhar a minha localização</Text>
              <Text style={u.muted}>Só a equipa a vê, para o ajudar mais depressa.</Text>
            </View>
            <Switch value={share} onValueChange={setShare} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
          </View>

          {kind === "AVARIA" ? (
            <View style={[u.between, { marginTop: 6 }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={u.strong}>Marcar o veículo como avariado</Text>
                <Text style={u.muted}>Fica indisponível e deixa de receber cargas até o pôr operacional.</Text>
              </View>
              <Switch value={markBroken} onValueChange={setMarkBroken} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
            </View>
          ) : null}

          <Btn label={sending ? "A enviar..." : "Enviar à equipa"} onPress={sendIncident} disabled={sending} />
          <Text style={u.muted}>Acidentes e avarias a meio de uma entrega avisam também o comprador e o vendedor.</Text>
        </Card>

        <SubTitle>Os meus contactos de emergência ({contacts.length}/5)</SubTitle>
        <Card>
          {contacts.length === 0 ? <Text style={u.muted}>Guarde pessoas de confiança. Depois de um SOS, o app oferece avisá-las com a sua localização.</Text> : null}
          {contacts.map((c, i) => (
            <View key={`${c.phone}-${i}`} style={[u.between, { marginTop: 6 }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={u.strong}>{c.name}</Text>
                <Text style={u.muted}>{c.phone}</Text>
              </View>
              <View style={u.row}>
                <Btn small kind="outline" label="📞" onPress={() => Linking.openURL(`tel:${c.phone}`)} />
                {editing ? <Btn small kind="danger" label="Tirar" onPress={() => removeContact(i)} disabled={savingContacts} /> : null}
              </View>
            </View>
          ))}
          <Btn small kind="outline" label={editing ? "Fechar" : "✏️ Gerir os contactos"} onPress={() => setEditing(!editing)} />
          {editing && contacts.length < 5 ? (
            <View style={{ marginTop: 8 }}>
              <Field label="Nome" value={newName} onChangeText={setNewName} placeholder="Ex: Maria (esposa)" />
              <Field label="Telefone" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
              <Btn small label={savingContacts ? "A guardar..." : "➕ Juntar o contacto"} onPress={addContact} disabled={savingContacts} />
            </View>
          ) : null}
        </Card>

        <SubTitle>As minhas ocorrências ({incidents.data.items.length})</SubTitle>
        {incidents.data.items.length === 0 ? (
          <Empty text="Ainda não registou ocorrências." />
        ) : (
          incidents.data.items.map((i: any) => (
            <TouchableOpacity key={i.id} activeOpacity={0.85} onPress={() => navigation.navigate("TrIncident", { id: i.id })}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                    {KIND_ICON[i.kind] ?? "📝"} {i.kindLabel}
                  </Text>
                  <Badge label={labelOf(catalog.incidentStatus, i.status) || i.status} color={STATUS_COLOR[i.status] ?? "#757575"} />
                </View>
                {i.description ? <Text style={{ marginTop: 2 }} numberOfLines={2}>{i.description}</Text> : null}
                <Text style={u.muted}>{formatDateTime(i.createdAt)}</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}
        <Btn kind="outline" label="🦺 Dicas de segurança" onPress={() => navigation.navigate("TrSafety")} />
      </Page>
    </TrLayout>
  );
}
