import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { Page, Title, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getMyAgentProfile, saveMyAgentProfile } from "../api/agent";
import { getGovRegions } from "../api/gov";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { getPosition } from "../utils/location";
import { useAgentCatalog } from "../utils/agentCatalog";
import { getApiErrorMessage } from "../api/errorMessage";

const PHONE = /^[+\d][\d\s-]{5,19}$/;

export default function AgentProfileFormScreen({ navigation }: any) {
  const catalog = useAgentCatalog();
  const loader = useLoader(getMyAgentProfile, null as any);

  const [filled, setFilled] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [agentType, setAgentType] = useState("COMUNITARIO");
  const [areas, setAreas] = useState<string[]>([]);
  const [regionKeys, setRegionKeys] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [schedule, setSchedule] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (filled || loader.loading || !loader.data) return;
    const { profile, user } = loader.data;
    setName(user.name ?? "");
    setLocation(user.location ?? "");
    setAgentType(profile.agentType ?? "COMUNITARIO");
    setAreas(profile.areas ?? []);
    setRegionKeys(profile.regions ?? []);
    setBio(profile.bio ?? "");
    setWhatsapp(profile.whatsapp ?? "");
    setServiceAddress(profile.serviceAddress ?? "");
    setSchedule(profile.schedule ?? "");
    setCoords(profile.serviceLat !== null && profile.serviceLng !== null && profile.serviceLat !== undefined ? { lat: profile.serviceLat, lng: profile.serviceLng } : null);
    setPhotoUri(user.photoUrl ?? null);
    setFilled(true);
  }, [loader.loading, loader.data]);

  function toggle(list: string[], value: string, setList: (v: string[]) => void, max: number) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : list.length >= max ? list : [...list, value]);
  }

  async function choosePhoto() {
    const picked = await pickImage(false, [1, 1]);
    if (picked) {
      setPhotoUri(picked.uri);
      setPhotoBase64(picked.base64);
    }
  }

  async function useMyLocation() {
    setLocating(true);
    const position = await getPosition();
    setLocating(false);
    if (position) {
      setCoords(position);
    } else {
      Alert.alert("Localização não disponível", "Ative a localização (GPS) e dê permissão ao app. Estando no seu ponto de atendimento, o ponto fica exato no mapa.");
    }
  }

  async function save() {
    if (name.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o seu nome.");
      return;
    }
    if (whatsapp.trim() && !PHONE.test(whatsapp.trim())) {
      Alert.alert("Atenção", "Número de WhatsApp inválido.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        location: location.trim(),
        agentType,
        areas,
        regions: regionKeys,
        bio: bio.trim(),
        whatsapp: whatsapp.trim(),
        serviceAddress: serviceAddress.trim(),
        schedule: schedule.trim(),
        serviceLat: coords ? coords.lat : null,
        serviceLng: coords ? coords.lng : null,
      };
      if (photoBase64) body.photoUrl = await uploadImageBase64(photoBase64, "agente-");

      await saveMyAgentProfile(body);
      Alert.alert("Pronto", "Perfil guardado.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o perfil."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>✏️ Editar perfil de agente</Title>

      <View style={[u.row, { alignItems: "center" }]}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={[u.photo, { width: 84, height: 84, borderRadius: 42 }]} />
        ) : (
          <View style={[u.photo, { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 34 }}>🤝</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Btn small kind="outline" label="Escolher foto" onPress={choosePhoto} />
          {photoBase64 ? <Text style={u.muted}>A nova foto é enviada ao guardar.</Text> : null}
        </View>
      </View>

      <Field label="Nome" value={name} onChangeText={setName} />
      <Field label="Onde vive ou trabalha" value={location} onChangeText={setLocation} placeholder="Ex: Gabú" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r.key} label={r.name} active={location === r.name} onPress={() => setLocation(r.name)} />
          ))}
        </View>
      ) : null}

      <ChipGroup label="Tipo de agente" options={catalog.agentTypes} value={agentType} onChange={setAgentType} />

      <Text style={u.label}>Áreas de atuação</Text>
      <View style={u.row}>
        {catalog.agentAreas.map((a) => (
          <Chip key={a.value} label={a.label} active={areas.includes(a.value)} onPress={() => toggle(areas, a.value, setAreas, 5)} />
        ))}
      </View>

      <Text style={u.label}>Regiões onde atua (até 12)</Text>
      <View style={u.row}>
        {regions.map((r) => (
          <Chip key={r.key} label={r.name} active={regionKeys.includes(r.key)} onPress={() => toggle(regionKeys, r.key, setRegionKeys, 12)} />
        ))}
      </View>

      <Field label="Apresentação (opcional)" value={bio} onChangeText={setBio} multiline placeholder="Ex: Ajudo agricultores de Gabú a vender o arroz e o caju" />
      <Field label="WhatsApp (opcional)" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />

      <Text style={u.label}>📌 Ponto de atendimento (opcional)</Text>
      <Field label="Endereço" value={serviceAddress} onChangeText={setServiceAddress} multiline placeholder="Ex: Junto ao mercado de Gabú" />
      <Field label="Horário" value={schedule} onChangeText={setSchedule} multiline placeholder="Ex: Segunda a sábado, das 8h às 14h" />
      <Text style={u.muted}>{coords ? `Ponto GPS guardado: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Sem ponto GPS. Aparece no centro da região."}</Text>
      <View style={u.row}>
        <Btn small kind="outline" label={locating ? "A procurar o sinal GPS..." : "📡 Usar a minha localização"} onPress={useMyLocation} disabled={locating} />
        {coords ? <Btn small kind="danger" label="Remover" onPress={() => setCoords(null)} /> : null}
      </View>

      <Text style={[u.muted, { marginTop: 8 }]}>O documento de identificação junta-se no seu perfil. O telefone muda-se nas configurações da conta.</Text>

      <Btn label={saving ? "A guardar..." : "Guardar perfil"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
