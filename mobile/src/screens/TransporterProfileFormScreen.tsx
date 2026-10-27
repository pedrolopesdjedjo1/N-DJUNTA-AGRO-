import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { Page, Title, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getTransporterProfile, saveTransporterProfile } from "../api/transporter";
import { getGovRegions } from "../api/gov";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { useTransportCatalog } from "../utils/transportCatalog";
import { VEHICLE_ICON } from "../constants/transporter";
import { getApiErrorMessage } from "../api/errorMessage";

export default function TransporterProfileFormScreen({ navigation }: any) {
  const catalog = useTransportCatalog();
  const loader = useLoader(getTransporterProfile, null as any);

  const [filled, setFilled] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [plate, setPlate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [regionKeys, setRegionKeys] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
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
    setVehicleType(profile.vehicleType ?? "");
    setBrand(profile.vehicleBrand ?? "");
    setModel(profile.vehicleModel ?? "");
    setYear(profile.vehicleYear ? String(profile.vehicleYear) : "");
    setPlate(profile.plate ?? "");
    setCapacity(profile.capacityKg ? String(profile.capacityKg) : "");
    setRegionKeys(profile.regions ?? []);
    setBio(profile.bio ?? "");
    setPhotoUri(user.photoUrl ?? null);
    setFilled(true);
  }, [loader.loading, loader.data]);

  function toggleRegion(key: string) {
    setRegionKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : prev.length >= 12 ? prev : [...prev, key]));
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
    if (!vehicleType) {
      Alert.alert("Atenção", "Escolha o tipo de veículo.");
      return;
    }
    if (year.trim() && (year.trim().length !== 4 || Number(year) < 1950 || Number(year) > new Date().getFullYear() + 1)) {
      Alert.alert("Atenção", "Escreva o ano do veículo com 4 números (ex: 2015).");
      return;
    }
    const capacityNumber = capacity.trim() ? Number(capacity.replace(",", ".")) : null;
    if (capacityNumber !== null && (isNaN(capacityNumber) || capacityNumber <= 0)) {
      Alert.alert("Atenção", "A capacidade deve ser um número de quilos maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        location: location.trim(),
        vehicleType,
        vehicleBrand: brand.trim(),
        vehicleModel: model.trim(),
        vehicleYear: year.trim() ? Number(year) : null,
        plate: plate.trim(),
        capacityKg: capacityNumber,
        regions: regionKeys,
        bio: bio.trim(),
      };
      if (photoBase64) body.photoUrl = await uploadImageBase64(photoBase64, "transportador-");

      await saveTransporterProfile(body);
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
      <Title>✏️ Perfil e veículo</Title>

      <View style={[u.row, { alignItems: "center" }]}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={[u.photo, { width: 84, height: 84, borderRadius: 42 }]} />
        ) : (
          <View style={[u.photo, { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 34 }}>🚚</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Btn small kind="outline" label="Escolher foto" onPress={choosePhoto} />
          {photoBase64 ? <Text style={u.muted}>A nova foto é enviada ao guardar.</Text> : null}
        </View>
      </View>

      <Field label="Nome" value={name} onChangeText={setName} />
      <Field label="Onde vive" value={location} onChangeText={setLocation} placeholder="Ex: Bafatá" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r.key} label={r.name} active={location === r.name} onPress={() => setLocation(r.name)} />
          ))}
        </View>
      ) : null}

      <ChipGroup
        label="Tipo de veículo"
        options={catalog.vehicleTypes.map((v) => ({ ...v, icon: VEHICLE_ICON[v.value] }))}
        value={vehicleType}
        onChange={setVehicleType}
      />

      <Field label="Marca (opcional)" value={brand} onChangeText={setBrand} placeholder="Ex: Toyota" />
      <Field label="Modelo (opcional)" value={model} onChangeText={setModel} placeholder="Ex: Hilux" />
      <Field
        label="Ano (opcional)"
        value={year}
        onChangeText={(v) => setYear(v.replace(/\D/g, "").slice(0, 4))}
        keyboardType="numeric"
        placeholder="Ex: 2015"
      />
      <Field
        label={vehicleType === "BARCO" ? "Registo da embarcação (opcional)" : "Matrícula"}
        value={plate}
        onChangeText={setPlate}
        autoCapitalize="characters"
        placeholder="Ex: BI-12-34"
      />
      <Field label="Capacidade de carga em kg (opcional)" value={capacity} onChangeText={setCapacity} keyboardType="numeric" placeholder="Ex: 800" />
      <Text style={u.muted}>Com a capacidade, o app avisa quando uma carga é maior do que o seu veículo aguenta.</Text>

      <Text style={u.label}>Regiões onde trabalha (até 12)</Text>
      <View style={u.row}>
        {regions.map((r) => (
          <Chip key={r.key} label={r.name} active={regionKeys.includes(r.key)} onPress={() => toggleRegion(r.key)} />
        ))}
      </View>

      <Field label="Sobre mim (opcional)" value={bio} onChangeText={setBio} multiline placeholder="Ex: Transporto arroz e caju há 6 anos entre Bafatá e Gabú" />

      <Text style={[u.muted, { marginTop: 8 }]}>Os documentos e o pedido de verificação fazem-se na tela de Verificação. Mudar a matrícula depois de verificado pede nova verificação.</Text>

      <Btn label={saving ? "A guardar..." : "Guardar perfil"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
