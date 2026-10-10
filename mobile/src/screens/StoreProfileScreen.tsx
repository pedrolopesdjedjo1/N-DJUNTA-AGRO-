import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { MerchantLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Field, Chip, Btn, Card, Badge, useLoader, u } from "../components/ui";
import { getMyStore, saveStore } from "../api/merchant";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { getApiErrorMessage } from "../api/errorMessage";
import { DEPARTMENTS } from "../constants/market";

interface Photo {
  uri: string;
  base64?: string | null;
}

export default function StoreProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const loader = useLoader(getMyStore, null as any);

  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [logo, setLogo] = useState<Photo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loader.loading || ready) return;
    const s = loader.data;
    if (s) {
      setName(s.name ?? "");
      setDescription(s.description ?? "");
      setContact(s.contact ?? "");
      setLocation(s.location ?? "");
      setOpeningHours(s.openingHours ?? "");
      setCategories(s.categories ?? []);
      setLogo(s.logoUrl ? { uri: s.logoUrl } : null);
      setPhotos((s.photoUrls ?? []).map((url: string) => ({ uri: url })));
    } else {
      setName(user?.name ? `Loja de ${user.name}` : "");
    }
    setReady(true);
  }, [loader.loading]);

  function toggleCategory(value: string) {
    setCategories((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  async function chooseLogo() {
    const picked = await pickImage(false, [1, 1]);
    if (picked) setLogo({ uri: picked.uri, base64: picked.base64 });
  }

  async function addPhoto(fromCamera: boolean) {
    if (photos.length >= 6) {
      Alert.alert("Atenção", "Pode ter até 6 fotos.");
      return;
    }
    const picked = await pickImage(fromCamera);
    if (picked) setPhotos((prev) => [...prev, { uri: picked.uri, base64: picked.base64 }]);
  }

  async function save() {
    if (!name.trim()) {
      Alert.alert("Atenção", "Escreva o nome da loja.");
      return;
    }

    setSaving(true);
    try {
      let logoUrl: string | undefined;
      if (logo) {
        logoUrl = logo.base64 ? await uploadImageBase64(logo.base64, "logo-") : logo.uri;
      }

      const photoUrls: string[] = [];
      for (const photo of photos) {
        photoUrls.push(photo.base64 ? await uploadImageBase64(photo.base64, "loja-") : photo.uri);
      }

      const saved = await saveStore({
        name: name.trim(),
        description,
        contact,
        location,
        openingHours,
        categories,
        logoUrl,
        photoUrls,
      });

      setLogo(saved.logoUrl ? { uri: saved.logoUrl } : null);
      setPhotos((saved.photoUrls ?? []).map((url: string) => ({ uri: url })));
      Alert.alert("Pronto", "Perfil da loja guardado.");
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar a loja."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <MerchantLayout active="StoreProfile">
      <Page loader={loader}>
        <Title>👤 Perfil da loja</Title>

        <View style={u.row}>
          <Badge
            label={user?.isVerified ? "Comerciante verificado ✅" : "Ainda não verificado"}
            color={user?.isVerified ? "#2E7D32" : "#757575"}
          />
        </View>

        <Text style={u.label}>Logo</Text>
        <View style={u.row}>
          {logo ? <Image source={{ uri: logo.uri }} style={[u.photo, { width: 80, height: 80 }]} /> : <View style={[u.photo, { width: 80, height: 80 }]} />}
          <Btn small kind="outline" label="Escolher logo" onPress={chooseLogo} />
          {logo ? <Btn small kind="danger" label="Remover" onPress={() => setLogo(null)} /> : null}
        </View>

        <Field label="Nome da loja" value={name} onChangeText={setName} />
        <Field label="Descrição" value={description} onChangeText={setDescription} multiline />
        <Field label="Contacto" value={contact} onChangeText={setContact} keyboardType="phone-pad" />
        <Field label="Localização" value={location} onChangeText={setLocation} placeholder="Ex: Bissau, Bairro de Bandim" />
        <Field label="Horário" value={openingHours} onChangeText={setOpeningHours} placeholder="Ex: Seg a Sáb, 8h às 18h" />

        <Text style={u.label}>Categorias da loja</Text>
        <View style={u.row}>
          {DEPARTMENTS.map((d) => (
            <Chip key={d.value} label={`${d.icon} ${d.label}`} active={categories.includes(d.value)} onPress={() => toggleCategory(d.value)} />
          ))}
        </View>

        <Text style={u.label}>Fotos da loja</Text>
        <View style={u.row}>
          {photos.map((p, index) => (
            <View key={`${p.uri}-${index}`} style={{ marginRight: 8, marginBottom: 8, alignItems: "center" }}>
              <Image source={{ uri: p.uri }} style={u.photo} />
              <Text style={{ color: "#B71C1C" }} onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}>
                Remover
              </Text>
            </View>
          ))}
        </View>
        <View style={u.row}>
          <Btn small kind="outline" label="Galeria" onPress={() => addPhoto(false)} />
          <Btn small kind="outline" label="Câmera" onPress={() => addPhoto(true)} />
        </View>

        <Btn label={saving ? "A guardar..." : "Guardar loja"} onPress={save} disabled={saving} />

        <SubTitle>Mais</SubTitle>
        <Card>
          <View style={u.row}>
            <Btn small kind="outline" label="✅ Verificação" onPress={() => navigation.navigate("Verification")} />
            <Btn small kind="outline" label="⭐ Avaliações" onPress={() => navigation.navigate("Reviews", { userId: user?.id, userName: user?.name })} />
            <Btn small kind="outline" label="🆘 Suporte" onPress={() => navigation.navigate("Support")} />
            <Btn small kind="outline" label="🌐 Idioma" onPress={() => navigation.navigate("Language")} />
            <Btn small kind="danger" label="Sair" onPress={logout} />
          </View>
        </Card>
      </Page>
    </MerchantLayout>
  );
}
