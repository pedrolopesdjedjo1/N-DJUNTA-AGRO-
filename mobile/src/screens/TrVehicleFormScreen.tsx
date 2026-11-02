import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert, TouchableOpacity } from "react-native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, Card, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getTrProfile, saveTrProfile } from "../api/transporterV2";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { TR_CARGO_ICON, TR_VEHICLE_ICON } from "../constants/transporterV2";
import { getApiErrorMessage } from "../api/errorMessage";

const MAX_PHOTOS = 6;

interface Photo {
  uri: string;
  base64?: string | null;
}

export default function TrVehicleFormScreen({ navigation }: any) {
  const catalog = useTrCatalog();
  const loader = useLoader(getTrProfile, null as any);

  const [filled, setFilled] = useState(false);
  const [type, setType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [plate, setPlate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [cargo, setCargo] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [approved, setApproved] = useState(false);
  const [originalPlate, setOriginalPlate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (filled || loader.loading || !loader.data) return;
    const p = loader.data.profile;
    setType(p.vehicleType ?? "");
    setBrand(p.vehicleBrand ?? "");
    setModel(p.vehicleModel ?? "");
    setYear(p.vehicleYear ? String(p.vehicleYear) : "");
    setPlate(p.plate ?? "");
    setOriginalPlate(p.plate ?? "");
    setCapacity(p.capacityKg ? String(p.capacityKg) : "");
    setCargo(p.cargoTypes ?? []);
    setPhotos((p.vehiclePhotos ?? []).map((uri: string) => ({ uri })));
    setApproved(p.verificationStatus === "APROVADO");
    setFilled(true);
  }, [loader.loading, loader.data]);

  function toggleCargo(value: string) {
    setCargo((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  async function addPhoto() {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("Atenção", `Pode ter até ${MAX_PHOTOS} fotos.`);
      return;
    }
    const picked = await pickImage(false, [4, 3]);
    if (picked) setPhotos((prev) => [...prev, { uri: picked.uri, base64: picked.base64 }]);
  }

  async function save() {
    if (!type) return Alert.alert("Atenção", "Escolha o tipo de veículo.");

    const kg = Number(capacity.replace(",", "."));
    if (!capacity.trim() || isNaN(kg) || kg <= 0) return Alert.alert("Atenção", "Indique a capacidade de carga em quilos. É com ela que o app sabe que entregas pode aceitar.");

    const yearNumber = year.trim() ? Math.floor(Number(year)) : null;
    if (yearNumber !== null && (isNaN(yearNumber) || yearNumber < 1950 || yearNumber > new Date().getFullYear() + 1)) {
      return Alert.alert("Atenção", "Ano do veículo inválido.");
    }

    const plateChanged = plate.trim().toUpperCase() !== originalPlate.toUpperCase();

    const go = async () => {
      setSaving(true);
      try {
        const urls: string[] = [];
        for (const photo of photos) {
          urls.push(photo.base64 ? await uploadImageBase64(photo.base64, "vehicle-") : photo.uri);
        }

        await saveTrProfile({
          vehicleType: type,
          vehicleBrand: brand.trim(),
          vehicleModel: model.trim(),
          vehicleYear: yearNumber,
          plate: plate.trim(),
          capacityKg: kg,
          cargoTypes: cargo,
          vehiclePhotos: urls,
        });

        Alert.alert("Pronto", "Veículo atualizado.");
        navigation.goBack();
      } catch (e) {
        Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o veículo."));
      } finally {
        setSaving(false);
      }
    };

    if (approved && plateChanged) {
      return Alert.alert("Mudar a matrícula", "A sua conta está verificada. Se mudar a matrícula, a verificação volta a ser pedida. Continuar?", [
        { text: "Não", style: "cancel" },
        { text: "Continuar", onPress: go },
      ]);
    }
    return go();
  }

  const noPlate = type === "BARCO";

  return (
    <TrLayout active="TrProfile">
      <Page loader={loader}>
        <Title>🚚 {type || originalPlate ? "Editar o veículo" : "Registar o veículo"}</Title>

        <ChipGroup
          label="Tipo de veículo"
          options={catalog.vehicleTypes.map((t) => ({ ...t, icon: TR_VEHICLE_ICON[t.value] }))}
          value={type}
          onChange={setType}
        />

        <View style={u.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Field label="Marca" value={brand} onChangeText={setBrand} placeholder="Ex: Toyota" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Modelo" value={model} onChangeText={setModel} placeholder="Ex: Hilux" />
          </View>
        </View>

        <View style={u.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Field label="Ano (opcional)" value={year} onChangeText={(v) => setYear(v.replace(/\D/g, "").slice(0, 4))} keyboardType="numeric" placeholder="2018" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={noPlate ? "Matrícula (se tiver)" : "Matrícula"} value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholder="Ex: BS-12-34" />
          </View>
        </View>

        <Field label="Capacidade de carga (kg)" value={capacity} onChangeText={(v) => setCapacity(v.replace(/[^\d.,]/g, ""))} keyboardType="numeric" placeholder="Ex: 800" />
        <Text style={u.muted}>Só vê e aceita entregas cuja carga cabe nesta capacidade.</Text>

        <Text style={u.label}>Que produtos pode transportar</Text>
        <View style={u.row}>
          {catalog.cargoTypes.map((c) => (
            <Chip key={c.value} label={`${TR_CARGO_ICON[c.value] ?? "📦"} ${c.label}`} active={cargo.includes(c.value)} onPress={() => toggleCargo(c.value)} />
          ))}
        </View>
        <Text style={u.muted}>{cargo.length === 0 ? "Nenhum escolhido: aceita todos os tipos de carga." : `Só aceita ${cargo.length} tipo(s) de carga.`}</Text>

        <Text style={[u.label, { marginTop: 8 }]}>
          Fotos do veículo ({photos.length}/{MAX_PHOTOS})
        </Text>
        <View style={u.row}>
          {photos.map((photo, i) => (
            <View key={`${photo.uri}-${i}`} style={{ marginRight: 8, marginTop: 8 }}>
              <Image source={{ uri: photo.uri }} style={{ width: 96, height: 72, borderRadius: 8, backgroundColor: "#ECEFF1" }} />
              <TouchableOpacity onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))} style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#C62828", borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "bold" }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <Btn small kind="outline" label="📷 Juntar foto" onPress={addPhoto} disabled={photos.length >= MAX_PHOTOS} />
        <Text style={u.muted}>Tire uma foto da frente e uma de lado, com o veículo limpo e a matrícula visível.</Text>

        {approved ? (
          <Card>
            <Text style={u.muted}>A sua conta está verificada. Só mudar a matrícula obriga a nova verificação.</Text>
          </Card>
        ) : null}

        <Btn label={saving ? "A guardar..." : "Guardar o veículo"} onPress={save} disabled={saving} />
        <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
      </Page>
    </TrLayout>
  );
}
