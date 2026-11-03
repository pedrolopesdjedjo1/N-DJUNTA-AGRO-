import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, Btn, Chip, Field, useLoader, u } from "../components/ui";
import { createTrOffer, updateTrOffer, getTrProfile } from "../api/transporterV2";
import { getGovRegions } from "../api/gov";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { TR_CARGO_ICON } from "../constants/transporterV2";
import { dateToIso, isDateText, isoToDateText, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";

const QUICK = [0, 1, 2, 7];

export default function TrOfferFormScreen({ navigation, route }: any) {
  const editing = route?.params?.offer;
  const catalog = useTrCatalog();
  const profile = useLoader(getTrProfile, null as any);
  const capacityMax: number | null = profile.data?.profile?.capacityKg ?? null;

  const [fromText, setFromText] = useState<string>(editing?.fromText ?? "");
  const [fromKey, setFromKey] = useState<string>(editing?.fromRegionKey ?? "");
  const [toText, setToText] = useState<string>(editing?.toText ?? "");
  const [toKey, setToKey] = useState<string>(editing?.toRegionKey ?? "");
  const [date, setDate] = useState<string>(editing ? isoToDateText(editing.departureDate) : todayText(1));
  const [capacity, setCapacity] = useState<string>(editing ? String(editing.capacityKg) : "");
  const [cargo, setCargo] = useState<string[]>(editing?.cargoTypes ?? []);
  const [price, setPrice] = useState<string>(editing?.price ? String(editing.price) : "");
  const [notes, setNotes] = useState<string>(editing?.notes ?? "");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  function toggleCargo(value: string) {
    setCargo((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  async function save() {
    if (fromText.trim().length < 2 || toText.trim().length < 2) return Alert.alert("Atenção", "Indique de onde parte e para onde vai.");
    if (!isDateText(date.trim())) return Alert.alert("Atenção", "Escreva a data assim: AAAA-MM-DD.");

    const kg = Number(capacity.replace(",", "."));
    if (!capacity.trim() || isNaN(kg) || kg <= 0) return Alert.alert("Atenção", "Indique quantos quilos tem livres.");
    if (capacityMax && kg > capacityMax) return Alert.alert("Atenção", `Não pode oferecer mais do que a capacidade do seu veículo (${capacityMax} kg).`);

    const value = price.trim() ? Number(price.replace(",", ".")) : null;
    if (value !== null && (isNaN(value) || value < 0)) return Alert.alert("Atenção", "Preço inválido.");

    setSaving(true);
    try {
      const body = {
        fromText: fromText.trim(),
        fromRegionKey: fromKey || undefined,
        toText: toText.trim(),
        toRegionKey: toKey || undefined,
        departureDate: date.trim(),
        capacityKg: kg,
        cargoTypes: cargo,
        price: value,
        notes: notes.trim() || undefined,
      };
      if (editing) await updateTrOffer(editing.id, body);
      else await createTrOffer(body);

      Alert.alert("Pronto", editing ? "Oferta atualizada." : "Oferta publicada. Quem procura transporte já a vê.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a oferta."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <TrLayout active="TrProfile">
      <Page loader={profile}>
        <Title>{editing ? "✏️ Editar a oferta" : "➕ Nova oferta de transporte"}</Title>
        <Text style={u.muted}>Diga que viagem vai fazer e quanto espaço tem livre.</Text>

        <Field label="Parte de" value={fromText} onChangeText={(v) => { setFromText(v); setFromKey(""); }} placeholder="Ex: Gabú" />
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r.key} label={r.name} active={fromKey === r.key} onPress={() => { setFromKey(r.key); setFromText(r.name); }} />
          ))}
        </View>

        <Field label="Vai para" value={toText} onChangeText={(v) => { setToText(v); setToKey(""); }} placeholder="Ex: Bissau" />
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r.key} label={r.name} active={toKey === r.key} onPress={() => { setToKey(r.key); setToText(r.name); }} />
          ))}
        </View>

        <Field label="Data de partida (AAAA-MM-DD)" value={date} onChangeText={setDate} />
        <View style={u.row}>
          {QUICK.map((n) => (
            <Chip key={n} label={n === 0 ? "Hoje" : n === 1 ? "Amanhã" : `Daqui a ${n} dias`} active={date === todayText(n)} onPress={() => setDate(todayText(n))} />
          ))}
        </View>

        <Field label={`Quilos livres${capacityMax ? ` (máximo ${capacityMax})` : ""}`} value={capacity} onChangeText={(v) => setCapacity(v.replace(/[^\d.,]/g, ""))} keyboardType="numeric" placeholder="Ex: 300" />

        <Text style={u.label}>Que produtos aceita (vazio = os do seu veículo)</Text>
        <View style={u.row}>
          {catalog.cargoTypes.map((c) => (
            <Chip key={c.value} label={`${TR_CARGO_ICON[c.value] ?? "📦"} ${c.label}`} active={cargo.includes(c.value)} onPress={() => toggleCargo(c.value)} />
          ))}
        </View>

        <Field label="Preço em FCFA (opcional)" value={price} onChangeText={(v) => setPrice(v.replace(/[^\d.,]/g, ""))} keyboardType="numeric" placeholder="Deixe vazio para combinar" />
        <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline placeholder="Ex: Saio às 6h. Levo gelo para peixe." />

        <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Publicar a oferta"} onPress={save} disabled={saving} />
        <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
      </Page>
    </TrLayout>
  );
}
