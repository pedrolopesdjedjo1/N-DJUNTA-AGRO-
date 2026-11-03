import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createBoServicePoint, updateBoServicePoint } from "../api/backofficeTransport";
import { getGovRegions } from "../api/gov";
import { getPosition } from "../utils/trLocation";
import { useBoTransportCatalog } from "../utils/boTransportCatalog";
import { SERVICE_ICON } from "../constants/transporterTools";
import { getApiErrorMessage } from "../api/errorMessage";

export default function BoServicePointFormScreen({ navigation, route }: any) {
  const editing = route?.params?.point;
  const catalog = useBoTransportCatalog();

  const [kind, setKind] = useState<string>(editing?.kind ?? "");
  const [name, setName] = useState<string>(editing?.name ?? "");
  const [address, setAddress] = useState<string>(editing?.address ?? "");
  const [region, setRegion] = useState<string>(editing?.regionKey ?? "");
  const [phone, setPhone] = useState<string>(editing?.phone ?? "");
  const [hours, setHours] = useState<string>(editing?.hours ?? "");
  const [notes, setNotes] = useState<string>(editing?.notes ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(editing?.exact ? { lat: editing.lat, lng: editing.lng } : null);
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  async function useHere() {
    const pos = await getPosition(true);
    if (!pos) return Alert.alert("Localização desligada", "Ative a localização do telemóvel para marcar o local onde está.");
    setCoords(pos);
  }

  async function save() {
    if (!kind) return Alert.alert("Atenção", "Escolha o tipo de serviço.");
    if (name.trim().length < 3) return Alert.alert("Atenção", "Escreva o nome do local.");
    if (!region) return Alert.alert("Atenção", "Escolha a região onde fica.");
    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (cleanPhone && !/^\+?\d{7,15}$/.test(cleanPhone)) return Alert.alert("Atenção", "Telefone inválido.");

    setSaving(true);
    try {
      const body = {
        kind,
        name: name.trim(),
        address: address.trim(),
        regionKey: region,
        phone: cleanPhone || undefined,
        hours: hours.trim() || undefined,
        notes: notes.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      };
      if (editing) await updateBoServicePoint(editing.id, body);
      else await createBoServicePoint(body);

      Alert.alert("Pronto", editing ? "Local atualizado." : "Local criado e publicado.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o local."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout active="BoTransport">
      <Page>
        <Title>{editing ? "✏️ Editar o local" : "➕ Criar um local"}</Title>
        {!editing ? <Text style={u.muted}>Um local criado pela equipa fica logo publicado.</Text> : null}

        <ChipGroup label="Tipo de serviço" options={catalog.serviceKinds.map((k) => ({ ...k, icon: SERVICE_ICON[k.value] }))} value={kind} onChange={setKind} />
        <Field label="Nome" value={name} onChangeText={setName} />
        <Field label="Endereço ou como chegar" value={address} onChangeText={setAddress} multiline />

        <Text style={u.label}>Região</Text>
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r.key} label={r.name} active={region === r.key} onPress={() => setRegion(r.key)} />
          ))}
        </View>

        <Field label="Telefone (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Horário (opcional)" value={hours} onChangeText={setHours} placeholder="Ex: Todos os dias, 7h às 20h" />
        <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline />

        <Card>
          {coords ? <Text style={{ color: "#2E7D32" }}>📍 Localização exata marcada.</Text> : <Text style={u.muted}>Se estiver no local, marque-o. Sem localização exata, o local aparece pela região.</Text>}
          <View style={u.row}>
            <Btn small kind="outline" label={coords ? "🔄 Marcar de novo" : "📍 Estou neste local"} onPress={useHere} />
            {coords ? <Btn small kind="outline" label="Tirar a marca" onPress={() => setCoords(null)} /> : null}
          </View>
        </Card>

        <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Criar o local"} onPress={save} disabled={saving} />
        <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
      </Page>
    </AdminLayout>
  );
}
