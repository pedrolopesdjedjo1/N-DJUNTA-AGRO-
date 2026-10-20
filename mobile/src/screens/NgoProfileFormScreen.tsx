import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { Page, Title, Btn, Chip, Field, useLoader, u } from "../components/ui";
import { getOrganization, saveOrganization } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";

const PHONE = /^[+\d][\d\s-]{5,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NgoProfileFormScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const loader = useLoader(getOrganization, null as any);

  const [filled, setFilled] = useState(false);
  const [name, setName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [description, setDescription] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (filled || loader.loading || !loader.data) return;
    const o = loader.data.organization;
    setName(o.name ?? "");
    setAcronym(o.acronym ?? "");
    setDescription(o.description ?? "");
    setAreas(o.areas ?? []);
    setRegion(o.region ?? "");
    setAddress(o.address ?? "");
    setPhone(o.phone ?? "");
    setEmail(o.email ?? "");
    setWebsite(o.website ?? "");
    setFacebook(o.facebook ?? "");
    setInstagram(o.instagram ?? "");
    setWhatsapp(o.whatsapp ?? "");
    setFoundedYear(o.foundedYear ? String(o.foundedYear) : "");
    setLogoUri(o.logoUrl ?? null);
    setFilled(true);
  }, [loader.loading, loader.data]);

  function toggleArea(value: string) {
    setAreas((prev) => (prev.includes(value) ? prev.filter((a) => a !== value) : prev.length >= 8 ? prev : [...prev, value]));
  }

  async function chooseLogo() {
    const picked = await pickImage(false, [1, 1]);
    if (picked) {
      setLogoUri(picked.uri);
      setLogoBase64(picked.base64);
    }
  }

  async function save() {
    if (name.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o nome da organização.");
      return;
    }
    if (phone.trim() && !PHONE.test(phone.trim())) {
      Alert.alert("Atenção", "Telefone inválido.");
      return;
    }
    if (whatsapp.trim() && !PHONE.test(whatsapp.trim())) {
      Alert.alert("Atenção", "Número de WhatsApp inválido.");
      return;
    }
    if (email.trim() && !EMAIL.test(email.trim())) {
      Alert.alert("Atenção", "E-mail inválido.");
      return;
    }

    let year: number | null = null;
    if (foundedYear.trim()) {
      year = parseInt(foundedYear, 10);
      if (foundedYear.trim().length !== 4 || isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
        Alert.alert("Atenção", "Escreva o ano de fundação com 4 números (ex: 2012).");
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        acronym: acronym.trim(),
        description: description.trim(),
        areas,
        region: region.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        whatsapp: whatsapp.trim(),
        foundedYear: year === null ? "" : year,
      };
      if (logoBase64) body.logoUrl = await uploadImageBase64(logoBase64, "ong-");

      await saveOrganization(body);
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
      <Title>✏️ Editar perfil da ONG</Title>

      <View style={[u.row, { alignItems: "center" }]}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={[u.photo, { width: 84, height: 84, borderRadius: 42 }]} />
        ) : (
          <View style={[u.photo, { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 34 }}>🏢</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Btn small kind="outline" label="Escolher logo" onPress={chooseLogo} />
          {logoBase64 ? <Text style={u.muted}>O novo logo é enviado ao guardar.</Text> : null}
        </View>
      </View>

      <Field label="Nome da organização" value={name} onChangeText={setName} />
      <Field label="Sigla (opcional)" value={acronym} onChangeText={setAcronym} autoCapitalize="characters" placeholder="Ex: ADPP" />
      <Field label="Descrição" value={description} onChangeText={setDescription} multiline placeholder="O que a organização faz, a quem ajuda e onde trabalha" />

      <Text style={u.label}>Áreas de atuação (escolha até 8)</Text>
      <View style={u.row}>
        {catalog.areas.map((a) => (
          <Chip key={a.value} label={`${a.icon ?? ""} ${a.label}`.trim()} active={areas.includes(a.value)} onPress={() => toggleArea(a.value)} />
        ))}
      </View>

      <Field label="Região principal" value={region} onChangeText={setRegion} placeholder="Ex: Bissau" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(region === r ? "" : r)} />
          ))}
        </View>
      ) : null}

      <Field label="Morada da sede (opcional)" value={address} onChangeText={setAddress} multiline />
      <Field
        label="Ano de fundação (opcional)"
        value={foundedYear}
        onChangeText={(v) => setFoundedYear(v.replace(/\D/g, "").slice(0, 4))}
        keyboardType="numeric"
        placeholder="Ex: 2012"
      />

      <Text style={u.label}>Contactos</Text>
      <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="WhatsApp (opcional)" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
      <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Website (opcional)" value={website} onChangeText={setWebsite} autoCapitalize="none" placeholder="www.exemplo.org" />
      <Field label="Facebook (opcional)" value={facebook} onChangeText={setFacebook} autoCapitalize="none" placeholder="Link ou nome da página" />
      <Field label="Instagram (opcional)" value={instagram} onChangeText={setInstagram} autoCapitalize="none" placeholder="@nome_da_organização" />

      <Text style={u.muted}>O registo oficial e os dados do responsável preenchem-se em Verificação da organização. Os contactos e a descrição são públicos.</Text>

      <Btn label={saving ? "A guardar..." : "Guardar perfil"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
