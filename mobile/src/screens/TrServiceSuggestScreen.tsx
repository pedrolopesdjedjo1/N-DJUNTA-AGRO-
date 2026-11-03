import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { suggestTrService, listMyTrServiceSuggestions } from "../api/transporterV2";
import { getGovRegions } from "../api/gov";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { getPosition } from "../utils/trLocation";
import { labelOf } from "../utils/ngoCatalog";
import { SERVICE_ICON, SERVICE_STATUS_COLOR } from "../constants/transporterTools";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

// Sugerir um posto, uma oficina ou outro serviço que falta. A equipa analisa antes de publicar.
export default function TrServiceSuggestScreen({ navigation }: any) {
  const catalog = useTrCatalog();
  const mine = useLoader(listMyTrServiceSuggestions, [] as any[]);
  const suggestions: any[] = mine.data;

  const [kind, setKind] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      mine.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function useHere() {
    const pos = await getPosition(true);
    if (!pos) return Alert.alert("Localização desligada", "Ative a localização do telemóvel para marcar o local onde está.");
    setCoords(pos);
  }

  async function send() {
    if (!kind) return Alert.alert("Atenção", "Escolha o tipo de serviço.");
    if (name.trim().length < 3) return Alert.alert("Atenção", "Escreva o nome do local.");
    if (!region) return Alert.alert("Atenção", "Escolha a região onde fica.");
    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (cleanPhone && !/^\+?\d{7,15}$/.test(cleanPhone)) return Alert.alert("Atenção", "Telefone inválido.");

    setSaving(true);
    try {
      await suggestTrService({
        kind,
        name: name.trim(),
        address: address.trim(),
        regionKey: region,
        phone: cleanPhone || undefined,
        hours: hours.trim() || undefined,
        notes: notes.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      Alert.alert("Obrigado!", "A sua sugestão foi enviada. Depois de a equipa a analisar, aparece para todos os transportadores.");
      setKind("");
      setName("");
      setAddress("");
      setRegion("");
      setPhone("");
      setHours("");
      setNotes("");
      setCoords(null);
      mine.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a sugestão."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <TrLayout active="TrProfile">
      <Page loader={mine}>
        <Title>➕ Sugerir um local</Title>
        <Text style={u.muted}>Conhece um posto, uma oficina ou outro serviço que falta na lista? Sugira-o. Pode ter até 5 sugestões em análise.</Text>

        <ChipGroup label="Tipo de serviço" options={catalog.serviceKinds.map((k) => ({ ...k, icon: SERVICE_ICON[k.value] }))} value={kind} onChange={setKind} />
        <Field label="Nome do local" value={name} onChangeText={setName} placeholder="Ex: Posto de combustível da entrada de Gabú" />
        <Field label="Endereço ou como chegar (opcional)" value={address} onChangeText={setAddress} multiline placeholder="Ex: Junto ao mercado central, à esquerda." />

        <Text style={u.label}>Região onde fica</Text>
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r.key} label={r.name} active={region === r.key} onPress={() => setRegion(r.key)} />
          ))}
        </View>

        <Field label="Telefone (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Horário (opcional)" value={hours} onChangeText={setHours} placeholder="Ex: Todos os dias, 7h às 20h" />
        <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline placeholder="Ex: Aceita dinheiro móvel. Tem gasóleo e gasolina." />

        <Card>
          {coords ? <Text style={{ color: "#2E7D32" }}>📍 A localização exata foi marcada.</Text> : <Text style={u.muted}>Se estiver agora no local, marque-o: ajuda os colegas a encontrá-lo.</Text>}
          <View style={u.row}>
            <Btn small kind="outline" label={coords ? "🔄 Marcar de novo" : "📍 Estou neste local"} onPress={useHere} />
            {coords ? <Btn small kind="outline" label="Tirar a marca" onPress={() => setCoords(null)} /> : null}
          </View>
        </Card>

        <Btn label={saving ? "A enviar..." : "Enviar a sugestão"} onPress={send} disabled={saving} />

        <SubTitle>As minhas sugestões ({suggestions.length})</SubTitle>
        {suggestions.length === 0 ? (
          <Empty text="Ainda não sugeriu nenhum local." />
        ) : (
          suggestions.map((s) => (
            <Card key={s.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {SERVICE_ICON[s.kind] ?? "📍"} {s.name}
                </Text>
                <Badge label={labelOf(catalog.serviceStatus, s.status) || s.status} color={SERVICE_STATUS_COLOR[s.status] ?? "#757575"} />
              </View>
              <Text style={u.muted}>
                {s.regionName ? `${s.regionName} · ` : ""}
                {formatDate(s.createdAt)}
              </Text>
              {s.reviewNote ? <Text style={{ marginTop: 4 }}>📝 {s.reviewNote}</Text> : null}
            </Card>
          ))
        )}
        <Btn kind="outline" label="Voltar" onPress={() => navigation.goBack()} />
      </Page>
    </TrLayout>
  );
}
