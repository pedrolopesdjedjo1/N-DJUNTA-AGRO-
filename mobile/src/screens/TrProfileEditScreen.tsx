import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, Card, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getTrProfile, saveTrProfile } from "../api/transporterV2";
import { getGovRegions } from "../api/gov";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { TR_KIND_ICON } from "../constants/transporterV2";
import { getApiErrorMessage } from "../api/errorMessage";

export default function TrProfileEditScreen({ navigation }: any) {
  const catalog = useTrCatalog();
  const loader = useLoader(getTrProfile, null as any);

  const [filled, setFilled] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [kind, setKind] = useState("INDEPENDENTE");
  const [bio, setBio] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [allRegions, setAllRegions] = useState<{ key: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setAllRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (filled || loader.loading || !loader.data) return;
    const d = loader.data;
    setName(d.user.name ?? "");
    setLocation(d.user.location ?? "");
    setKind(d.profile.transporterKind ?? "INDEPENDENTE");
    setBio(d.profile.bio ?? "");
    setRegions(d.profile.regionKeys ?? []);
    setPhotoUri(d.user.photoUrl ?? null);
    setFilled(true);
  }, [loader.loading, loader.data]);

  function toggleRegion(key: string) {
    setRegions((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  async function choosePhoto() {
    const picked = await pickImage(false, [1, 1]);
    if (picked) {
      setPhotoUri(picked.uri);
      setPhotoBase64(picked.base64);
    }
  }

  async function save() {
    if (name.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o seu nome.");
      return;
    }
    if (regions.length === 0) {
      Alert.alert("Atenção", "Escolha pelo menos uma região onde trabalha. É com ela que vê as cargas certas.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        location: location.trim(),
        transporterKind: kind,
        bio: bio.trim(),
        regions,
      };
      if (photoBase64) body.photoUrl = await uploadImageBase64(photoBase64, "transporter-");

      await saveTrProfile(body);
      Alert.alert("Pronto", "Perfil atualizado.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o perfil."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <TrLayout active="TrProfile">
      <Page loader={loader}>
        <Title>✏️ Editar o perfil</Title>

        <View style={[u.row, { alignItems: "center" }]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={[u.photo, { width: 84, height: 84, borderRadius: 42 }]} />
          ) : (
            <View style={[u.photo, { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 34 }}>👤</Text>
            </View>
          )}
          <Btn small kind="outline" label={photoUri ? "Trocar a foto" : "Escolher foto"} onPress={choosePhoto} />
        </View>

        <Field label="Nome completo" value={name} onChangeText={setName} />
        <Text style={u.muted}>O número de telefone é o que usa para entrar. Para o mudar, fale com o suporte.</Text>
        <Field label="Onde vive ou trabalha" value={location} onChangeText={setLocation} placeholder="Ex: Gabú" />

        <ChipGroup
          label="Tipo de transportador"
          options={catalog.transporterKinds.map((k) => ({ ...k, icon: TR_KIND_ICON[k.value] }))}
          value={kind}
          onChange={setKind}
        />

        <Text style={u.label}>Regiões onde trabalha</Text>
        <View style={u.row}>
          {allRegions.map((r) => (
            <Chip key={r.key} label={r.name} active={regions.includes(r.key)} onPress={() => toggleRegion(r.key)} />
          ))}
        </View>
        <Text style={u.muted}>Vê as cargas que saem ou chegam a estas regiões e recebe avisos delas.</Text>

        <Field label="Sobre si (opcional)" value={bio} onChangeText={setBio} multiline placeholder="Ex: 10 anos de experiência. Faço entregas de peixe e fruta com gelo." />

        <Btn label={saving ? "A guardar..." : "Guardar alterações"} onPress={save} disabled={saving} />
        <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
      </Page>
    </TrLayout>
  );
}
