import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { FisherLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Field, Chip, Btn, Card, Badge, useLoader, u } from "../components/ui";
import { getFisherProfile, saveFisherProfile } from "../api/fisher";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { getApiErrorMessage } from "../api/errorMessage";
import { BOAT_TYPES, FISHER_TYPES, FISH_EQUIPMENT, formatDateTime } from "../constants/market";

function kg(value: number) {
  return `${Math.round((Number(value) || 0) * 10) / 10} kg`;
}

export default function FisherProfileScreen({ navigation }: any) {
  const { logout } = useAuth();
  const loader = useLoader(getFisherProfile, null as any);
  const profile: any = loader.data;

  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [fisherType, setFisherType] = useState("");
  const [boatType, setBoatType] = useState("");
  const [registration, setRegistration] = useState("");
  const [capacity, setCapacity] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [otherEquipment, setOtherEquipment] = useState("");
  const [species, setSpecies] = useState("");
  const [description, setDescription] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function fill(p: any) {
    const stored: string[] = p.store?.equipment ?? [];
    setName(p.user?.name ?? "");
    setLocation(p.user?.location ?? "");
    setFisherType(p.store?.fisherType ?? "");
    setBoatType(p.store?.boatType ?? "");
    setRegistration(p.store?.boatRegistration ?? "");
    setCapacity(p.store?.boatCapacity ?? "");
    setEquipment(stored.filter((e) => FISH_EQUIPMENT.includes(e)));
    setOtherEquipment(stored.filter((e) => !FISH_EQUIPMENT.includes(e)).join(", "));
    setSpecies((p.store?.mainSpecies ?? []).join(", "));
    setDescription(p.store?.description ?? "");
    setLogoUri(p.store?.logoUrl ?? null);
    setLogoBase64(null);
  }

  useEffect(() => {
    if (loader.loading || ready || !profile) return;
    fill(profile);
    setReady(true);
  }, [loader.loading, profile]);

  function toggleEquipment(item: string) {
    setEquipment((prev) => (prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]));
  }

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
      const extra = otherEquipment
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      const saved = await saveFisherProfile({
        name: name.trim(),
        location: location.trim(),
        fisherType,
        boatType,
        boatRegistration: registration.trim(),
        boatCapacity: capacity.trim(),
        equipment: [...equipment, ...extra],
        mainSpecies: species
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        description,
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

  const history = profile?.history;

  return (
    <FisherLayout active="FisherProfile">
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
              🤝 Cooperativa: {profile.cooperatives.length > 0 ? profile.cooperatives.map((c: any) => c.name).join(", ") : "nenhuma"}
            </Text>
          </Card>
        ) : null}

        <Field label="Nome" value={name} onChangeText={setName} />
        <Field label="Localização" value={location} onChangeText={setLocation} placeholder="Ex: Bubaque" />

        <Text style={u.label}>Tipo de pescador</Text>
        <View style={u.row}>
          {FISHER_TYPES.map((t) => (
            <Chip key={t} label={t} active={fisherType === t} onPress={() => setFisherType(fisherType === t ? "" : t)} />
          ))}
        </View>

        <Text style={u.label}>Tipo de barco</Text>
        <View style={u.row}>
          {BOAT_TYPES.map((t) => (
            <Chip key={t} label={t} active={boatType === t} onPress={() => setBoatType(boatType === t ? "" : t)} />
          ))}
        </View>

        <Field label="Matrícula do barco" value={registration} onChangeText={setRegistration} autoCapitalize="characters" />
        <Field label="Capacidade" value={capacity} onChangeText={setCapacity} placeholder="Ex: 6 pessoas, 500 kg" />

        <Text style={u.label}>Equipamentos</Text>
        <View style={u.row}>
          {FISH_EQUIPMENT.map((e) => (
            <Chip key={e} label={e} active={equipment.includes(e)} onPress={() => toggleEquipment(e)} />
          ))}
        </View>
        <Field label="Outros equipamentos (separe com vírgulas)" value={otherEquipment} onChangeText={setOtherEquipment} />

        <Field label="Principais espécies pescadas (separe com vírgulas)" value={species} onChangeText={setSpecies} placeholder="Ex: bagre, tainha, camarão" />
        <Field label="Sobre mim" value={description} onChangeText={setDescription} multiline />

        <Btn label={saving ? "A guardar..." : "Guardar perfil"} onPress={save} disabled={saving} />

        <SubTitle>🎣 Histórico de pesca</SubTitle>
        {history ? (
          <>
            <Card>
              <Text style={u.strong}>
                {history.catches} captura(s) · {kg(history.totalWeightKg)}
              </Text>
              {history.topSpecies.map((s: any) => (
                <Text key={s.species} style={u.muted}>
                  {s.species}: {s.count} vez(es)
                </Text>
              ))}
            </Card>
            {history.recent.map((c: any) => (
              <Card key={c.id}>
                <Text style={u.strong}>{c.species}</Text>
                <Text style={u.muted}>
                  {c.quantity} {c.unit}
                  {c.weightKg ? ` · ${kg(c.weightKg)}` : ""} · {formatDateTime(c.caughtAt)}
                </Text>
              </Card>
            ))}
            <Btn small kind="outline" label="Ver todas as capturas" onPress={() => navigation.navigate("FisherCatches")} />
          </>
        ) : null}

        <SubTitle>Mais</SubTitle>
        <Card>
          <View style={u.row}>
            <Btn small kind="outline" label="✅ Verificação" onPress={() => navigation.navigate("Verification")} />
            <Btn small kind="outline" label="💰 Vendas e ganhos" onPress={() => navigation.navigate("MerchantSales")} />
            <Btn small kind="outline" label="⭐ Avaliações" onPress={() => navigation.navigate("ArtisanReviews")} />
            <Btn small kind="outline" label="🤝 Cooperativas" onPress={() => navigation.navigate("FisherCooperatives")} />
            <Btn small kind="outline" label="⚙️ Configurações" onPress={() => navigation.navigate("Settings")} />
            <Btn small kind="outline" label="🆘 Ajuda" onPress={() => navigation.navigate("Help")} />
            <Btn small kind="outline" label="🌐 Idioma" onPress={() => navigation.navigate("Language")} />
            <Btn small kind="danger" label="Sair" onPress={logout} />
          </View>
        </Card>
      </Page>
    </FisherLayout>
  );
}
