import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { FarmerLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Field, Chip, Btn, Card, Badge, useLoader, u } from "../components/ui";
import { getFarmerProfile, saveFarmerProfile } from "../api/farmer";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { getApiErrorMessage } from "../api/errorMessage";
import { FARM_TYPES } from "../constants/market";

export default function FarmerProfileScreen({ navigation }: any) {
  const { logout } = useAuth();
  const loader = useLoader(getFarmerProfile, null as any);
  const profile: any = loader.data;

  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [farmType, setFarmType] = useState("");
  const [area, setArea] = useState("");
  const [crops, setCrops] = useState("");
  const [description, setDescription] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function fill(p: any) {
    setName(p.user?.name ?? "");
    setLocation(p.user?.location ?? "");
    setFarmType(p.store?.farmType ?? "");
    setArea(p.store?.cultivatedArea ?? "");
    setCrops((p.store?.mainCrops ?? []).join(", "));
    setDescription(p.store?.description ?? "");
    setLogoUri(p.store?.logoUrl ?? null);
    setLogoBase64(null);
  }

  useEffect(() => {
    if (loader.loading || ready || !profile) return;
    fill(profile);
    setReady(true);
  }, [loader.loading, profile]);

  async function chooseLogo() {
    const picked = await pickImage(false, [1, 1]);
    if (picked) {
      setLogoUri(picked.uri);
      setLogoBase64(picked.base64);
    }
  }

  async function save() {
    if (!name.trim()) {
      Alert.alert("Atenção", "Escreva o seu nome.");
      return;
    }

    setSaving(true);
    try {
      const logoUrl = logoBase64 ? await uploadImageBase64(logoBase64, "perfil-") : undefined;
      const saved = await saveFarmerProfile({
        name: name.trim(),
        location: location.trim(),
        farmType,
        cultivatedArea: area.trim(),
        description,
        mainCrops: crops
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        ...(logoUrl ? { logoUrl } : {}),
      });
      loader.setData(saved);
      fill(saved);
      Alert.alert("Pronto", "Perfil guardado.");
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar o perfil."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FarmerLayout active="FarmerProfile">
      <Page loader={loader}>
        <Title>👤 Meu perfil</Title>

        <View style={u.row}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={[u.photo, { width: 90, height: 90, borderRadius: 45 }]} />
          ) : (
            <View style={[u.photo, { width: 90, height: 90, borderRadius: 45 }]} />
          )}
          <View style={{ flex: 1 }}>
            <Badge
              label={profile?.user?.isVerified ? "Conta verificada ✅" : "Ainda não verificado"}
              color={profile?.user?.isVerified ? "#2E7D32" : "#757575"}
            />
            <Btn small kind="outline" label="Mudar foto" onPress={chooseLogo} />
          </View>
        </View>

        {profile ? (
          <Card>
            <Text style={u.muted}>📞 Telefone: {profile.user?.phone || "—"} (altere em Configurações)</Text>
            <Text style={u.muted}>
              ⭐ {Number(profile.rating.average).toFixed(1)} ({profile.rating.count} avaliações)
            </Text>
            <Text style={u.muted}>
              🛍️ {profile.productsSold} unidade(s) vendida(s) · 📦 {profile.sales} venda(s)
            </Text>
            <Text style={u.muted}>
              🤝 Cooperativas: {profile.cooperatives.length > 0 ? profile.cooperatives.map((c: any) => c.name).join(", ") : "nenhuma"}
            </Text>
            {profile.producedProducts.length > 0 ? (
              <Text style={[u.muted, { marginTop: 4 }]}>🌱 Produtos produzidos: {profile.producedProducts.join(", ")}</Text>
            ) : null}
          </Card>
        ) : null}

        <Field label="Nome" value={name} onChangeText={setName} />
        <Field label="Localização" value={location} onChangeText={setLocation} placeholder="Ex: Bafatá" />

        <Text style={u.label}>Tipo de agricultor</Text>
        <View style={u.row}>
          {FARM_TYPES.map((t) => (
            <Chip key={t} label={t} active={farmType === t} onPress={() => setFarmType(farmType === t ? "" : t)} />
          ))}
        </View>

        <Field label="Área cultivada" value={area} onChangeText={setArea} placeholder="Ex: 2 hectares" />
        <Field label="Principais culturas (separe com vírgulas)" value={crops} onChangeText={setCrops} placeholder="Ex: arroz, caju, tomate" />
        <Field label="Sobre mim" value={description} onChangeText={setDescription} multiline />

        <Btn label={saving ? "A guardar..." : "Guardar perfil"} onPress={save} disabled={saving} />

        <SubTitle>Mais</SubTitle>
        <Card>
          <View style={u.row}>
            <Btn small kind="outline" label="💰 Histórico de vendas" onPress={() => navigation.navigate("MerchantSales")} />
            <Btn small kind="outline" label="⭐ Avaliações" onPress={() => navigation.navigate("ArtisanReviews")} />
            <Btn small kind="outline" label="🤝 Cooperativas" onPress={() => navigation.navigate("FarmerCooperatives")} />
            <Btn small kind="outline" label="✅ Verificação" onPress={() => navigation.navigate("Verification")} />
            <Btn small kind="outline" label="⚙️ Configurações" onPress={() => navigation.navigate("Settings")} />
            <Btn small kind="outline" label="🆘 Ajuda" onPress={() => navigation.navigate("FarmerHelp")} />
            <Btn small kind="outline" label="🌐 Idioma" onPress={() => navigation.navigate("Language")} />
            <Btn small kind="danger" label="Sair" onPress={logout} />
          </View>
        </Card>
      </Page>
    </FarmerLayout>
  );
}
