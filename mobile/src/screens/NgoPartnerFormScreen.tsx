import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createPartner, updatePartner } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";

const PHONE = /^[+\d][\d\s-]{5,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NgoPartnerFormScreen({ navigation, route }: any) {
  const editing = route?.params?.partner;
  const preset = route?.params ?? {};
  const catalog = useNgoCatalog();

  const [name, setName] = useState<string>(editing?.name ?? preset.name ?? "");
  const [type, setType] = useState<string>(editing?.type ?? preset.type ?? "LOCAL");
  const [status, setStatus] = useState<string>(editing?.status ?? "ATIVO");
  const [contactName, setContactName] = useState<string>(editing?.contactName ?? "");
  const [phone, setPhone] = useState<string>(editing?.phone ?? "");
  const [email, setEmail] = useState<string>(editing?.email ?? "");
  const [website, setWebsite] = useState<string>(editing?.website ?? "");
  const [region, setRegion] = useState<string>(editing?.region ?? preset.region ?? "");
  const [notes, setNotes] = useState<string>(editing?.notes ?? "");
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const linkedUserId: string | undefined = editing?.linkedUserId ?? preset.linkedUserId ?? undefined;

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  async function save() {
    if (name.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o nome do parceiro.");
      return;
    }
    if (phone.trim() && !PHONE.test(phone.trim())) {
      Alert.alert("Atenção", "Telefone inválido.");
      return;
    }
    if (email.trim() && !EMAIL.test(email.trim())) {
      Alert.alert("Atenção", "E-mail inválido.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        type,
        status,
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        region: region.trim(),
        notes: notes.trim(),
      };
      if (!editing && linkedUserId) body.linkedUserId = linkedUserId;

      if (editing) await updatePartner(editing.id, body);
      else await createPartner(body);

      Alert.alert("Pronto", editing ? "Parceiro atualizado." : "Parceiro registado.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o parceiro."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>{editing ? "✏️ Editar parceiro" : "🤝 Novo parceiro"}</Title>

      {linkedUserId ? (
        <Card>
          <Text style={u.strong}>✅ Tem conta no app</Text>
          <Text style={u.muted}>Pode enviar-lhe mensagens pelo chat.</Text>
        </Card>
      ) : null}

      <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex: Cooperativa Mon Ku Mon" />
      <ChipGroup label="Tipo de parceiro" options={catalog.partnerTypes} value={type} onChange={setType} />
      <ChipGroup label="Estado da parceria" options={catalog.partnerStatus} value={status} onChange={setStatus} />

      <Field label="Pessoa de contacto (opcional)" value={contactName} onChangeText={setContactName} />
      <Field label="Telefone (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="E-mail (opcional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Website (opcional)" value={website} onChangeText={setWebsite} autoCapitalize="none" placeholder="www.exemplo.org" />

      <Field label="Região (opcional)" value={region} onChangeText={setRegion} placeholder="Ex: Bissau" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(region === r ? "" : r)} />
          ))}
        </View>
      ) : null}

      <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline placeholder="O que fazem juntos, acordos, datas importantes" />

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Registar parceiro"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
