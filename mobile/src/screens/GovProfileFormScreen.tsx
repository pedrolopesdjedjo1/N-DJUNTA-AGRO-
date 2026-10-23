import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { Page, Title, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getOrganization, saveOrganization } from "../api/ngo";
import { getGovRegions } from "../api/gov";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { useGovCatalog } from "../utils/govCatalog";
import { getApiErrorMessage } from "../api/errorMessage";

const PHONE = /^[+\d][\d\s-]{5,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GovProfileFormScreen({ navigation }: any) {
  const ngo = useNgoCatalog();
  const gov = useGovCatalog();
  const loader = useLoader(getOrganization, null as any);

  const [filled, setFilled] = useState(false);
  const [name, setName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [parentInstitution, setParentInstitution] = useState("");
  const [description, setDescription] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (filled || loader.loading || !loader.data) return;
    const o = loader.data.organization;
    setName(o.name ?? "");
    setAcronym(o.acronym ?? "");
    setInstitutionType(o.institutionType ?? "");
    setParentInstitution(o.parentInstitution ?? "");
    setDescription(o.description ?? "");
    setAreas(o.areas ?? []);
    setRegion(o.region ?? "");
    setAddress(o.address ?? "");
    setPhone(o.phone ?? "");
    setWhatsapp(o.whatsapp ?? "");
    setEmail(o.email ?? "");
    setWebsite(o.website ?? "");
    setFacebook(o.facebook ?? "");
    setInstagram(o.instagram ?? "");
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
      Alert.alert("Atenção", "Escreva o nome da instituição.");
      return;
    }
    if (!institutionType) {
      Alert.alert("Atenção", "Escolha o tipo de instituição (ministério, direção, município...).");
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
        Alert.alert("Atenção", "Escreva o ano de criação com 4 números (ex: 1998).");
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        acronym: acronym.trim(),
        institutionType,
        parentInstitution: parentInstitution.trim(),
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
      if (logoBase64) body.logoUrl = await uploadImageBase64(logoBase64, "gov-");

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
      <Title>✏️ Editar perfil da instituição</Title>

      <View style={[u.row, { alignItems: "center" }]}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={[u.photo, { width: 84, height: 84, borderRadius: 42 }]} />
        ) : (
          <View style={[u.photo, { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 34 }}>🏛️</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Btn small kind="outline" label="Escolher logo" onPress={chooseLogo} />
          {logoBase64 ? <Text style={u.muted}>O novo logo é enviado ao guardar.</Text> : null}
        </View>
      </View>

      <Field label="Nome da instituição" value={name} onChangeText={setName} placeholder="Ex: Direção Geral das Pescas" />
      <Field label="Sigla (opcional)" value={acronym} onChangeText={setAcronym} autoCapitalize="characters" placeholder="Ex: DGP" />

      <ChipGroup label="Tipo de instituição" options={gov.institutionTypes} value={institutionType} onChange={setInstitutionType} />
      <Field
        label="Ministério ou instituição de tutela (opcional)"
        value={parentInstitution}
        onChangeText={setParentInstitution}
        placeholder="Ex: Ministério da Agricultura e Desenvolvimento Rural"
      />

      <Field label="Descrição" value={description} onChangeText={setDescription} multiline placeholder="O que faz a instituição e a quem serve" />

      <Text style={u.label}>Áreas de atuação (escolha até 8)</Text>
      <View style={u.row}>
        {ngo.areas.map((a) => (
          <Chip key={a.value} label={`${a.icon ?? ""} ${a.label}`.trim()} active={areas.includes(a.value)} onPress={() => toggleArea(a.value)} />
        ))}
      </View>

      <Field label="Região onde atua ou tem a sede" value={region} onChangeText={setRegion} placeholder="Ex: Bissau" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(region === r ? "" : r)} />
          ))}
        </View>
      ) : null}

      <Field label="Endereço da sede (opcional)" value={address} onChangeText={setAddress} multiline />
      <Field
        label="Ano de criação (opcional)"
        value={foundedYear}
        onChangeText={(v) => setFoundedYear(v.replace(/\D/g, "").slice(0, 4))}
        keyboardType="numeric"
        placeholder="Ex: 1998"
      />

      <Text style={u.label}>Contactos</Text>
      <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="WhatsApp (opcional)" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
      <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Website (opcional)" value={website} onChangeText={setWebsite} autoCapitalize="none" placeholder="www.exemplo.gov" />
      <Field label="Facebook (opcional)" value={facebook} onChangeText={setFacebook} autoCapitalize="none" placeholder="Link ou nome da página" />
      <Field label="Instagram (opcional)" value={instagram} onChangeText={setInstagram} autoCapitalize="none" placeholder="@nome_da_instituição" />

      <Text style={u.muted}>
        O diploma de criação, o número do registo oficial e os dados do responsável preenchem-se em Verificação oficial. Os contactos e a descrição são públicos.
      </Text>

      <Btn label={saving ? "A guardar..." : "Guardar perfil"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
