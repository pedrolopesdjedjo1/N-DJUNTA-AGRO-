import React, { useEffect, useState } from "react";
import { View, Text, Image, Switch, Alert } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createBoBanner, updateBoBanner } from "../api/backoffice";
import { getGovRegions } from "../api/gov";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { useBoCatalog } from "../utils/boCatalog";
import { dateToIso, isDateText, isoToDateText, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

const END_QUICK = [7, 14, 30, 60, 90];

export default function BoBannerFormScreen({ navigation, route }: any) {
  const editing = route?.params?.banner;
  const catalog = useBoCatalog();

  const [title, setTitle] = useState<string>(editing?.title ?? "");
  const [body, setBody] = useState<string>(editing?.body ?? "");
  const [imageUri, setImageUri] = useState<string | null>(editing?.imageUrl ?? null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [linkKind, setLinkKind] = useState<string>(editing?.linkKind ?? "NONE");
  const [linkTarget, setLinkTarget] = useState<string>(editing?.linkTarget ?? "");
  const [audiences, setAudiences] = useState<string[]>(editing?.audiences ?? []);
  const [regionKeys, setRegionKeys] = useState<string[]>(editing?.regionKeys ?? []);
  const [startText, setStartText] = useState<string>(editing ? isoToDateText(editing.startsAt) : todayText());
  const [endText, setEndText] = useState<string>(editing ? isoToDateText(editing.endsAt) : todayText(14));
  const [sortOrder, setSortOrder] = useState<string>(String(editing?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState<boolean>(editing ? !!editing.isActive : true);
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function choose() {
    const picked = await pickImage(false, [16, 9]);
    if (picked) {
      setImageUri(picked.uri);
      setImageBase64(picked.base64);
    }
  }

  async function save() {
    if (title.trim().length < 3) return Alert.alert("Atenção", "Escreva o título (pelo menos 3 letras).");
    if (!isDateText(startText.trim()) || !isDateText(endText.trim())) return Alert.alert("Atenção", "As datas devem ser assim: AAAA-MM-DD.");
    if (endText.trim() <= startText.trim()) return Alert.alert("Atenção", "A data de fim deve ser depois da de início.");
    if (linkKind === "SCREEN" && !/^[A-Za-z]{3,40}$/.test(linkTarget.trim())) return Alert.alert("Atenção", "Indique o nome da tela do app (só letras).");
    if (linkKind === "URL" && !/^https:\/\/\S{4,300}$/i.test(linkTarget.trim())) return Alert.alert("Atenção", "O endereço deve começar por https://");

    const order = Math.floor(Number(sortOrder));
    if (isNaN(order) || order < 0 || order > 99) return Alert.alert("Atenção", "A ordem deve ser um número de 0 a 99.");

    setSaving(true);
    try {
      let imageUrl: string | null = editing?.imageUrl ?? null;
      if (imageBase64) imageUrl = await uploadImageBase64(imageBase64, "banner-");
      if (!imageUri) imageUrl = null;

      const data = {
        title: title.trim(),
        body: body.trim(),
        imageUrl,
        linkKind,
        linkTarget: linkKind === "NONE" ? null : linkTarget.trim(),
        audiences,
        regionKeys,
        startsAt: dateToIso(startText.trim()),
        endsAt: dateToIso(endText.trim()),
        sortOrder: order,
        isActive,
      };

      if (editing) await updateBoBanner(editing.id, data);
      else await createBoBanner(data);

      Alert.alert("Pronto", editing ? "Banner atualizado." : "Banner criado.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o banner."));
    } finally {
      setSaving(false);
    }
  }

  const audienceOptions = catalog.audiences.filter((a) => a.value !== "TODOS");

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>{editing ? "✏️ Editar banner" : "➕ Novo banner"}</Title>

        <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: Feira agrícola de Gabú" />
        <Field label="Texto curto (opcional)" value={body} onChangeText={setBody} multiline placeholder="Ex: Sábado, das 8h às 16h. Entrada livre." />

        <Text style={u.label}>Imagem (opcional)</Text>
        {imageUri ? <Image source={{ uri: imageUri }} resizeMode="cover" style={{ width: "100%", height: 140, borderRadius: 8, backgroundColor: "#ECEFF1" }} /> : null}
        <View style={u.row}>
          <Btn small kind="outline" label={imageUri ? "Trocar a imagem" : "Escolher imagem"} onPress={choose} />
          {imageUri ? <Btn small kind="danger" label="Tirar a imagem" onPress={() => { setImageUri(null); setImageBase64(null); }} /> : null}
        </View>

        <ChipGroup label="Ao tocar no banner" options={catalog.bannerLinks} value={linkKind} onChange={setLinkKind} />
        {linkKind !== "NONE" ? (
          <Field
            label={linkKind === "SCREEN" ? "Nome da tela do app" : "Endereço (https://...)"}
            value={linkTarget}
            onChangeText={setLinkTarget}
            autoCapitalize="none"
            placeholder={linkKind === "SCREEN" ? "Ex: Events" : "https://..."}
          />
        ) : null}

        <Text style={u.label}>Quem vê (deixe vazio para todos)</Text>
        <View style={u.row}>
          {audienceOptions.map((a) => (
            <Chip key={a.value} label={a.label} active={audiences.includes(a.value)} onPress={() => toggle(audiences, a.value, setAudiences)} />
          ))}
        </View>

        <Text style={u.label}>Regiões (deixe vazio para todas)</Text>
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r.key} label={r.name} active={regionKeys.includes(r.key)} onPress={() => toggle(regionKeys, r.key, setRegionKeys)} />
          ))}
        </View>

        <Field label="Começa em (AAAA-MM-DD)" value={startText} onChangeText={setStartText} />
        <Field label="Termina em (AAAA-MM-DD)" value={endText} onChangeText={setEndText} />
        <View style={u.row}>
          {END_QUICK.map((n) => (
            <Chip key={n} label={`${n} dias`} active={endText === todayText(n)} onPress={() => setEndText(todayText(n))} />
          ))}
        </View>
        <Text style={u.muted}>Um banner pode durar no máximo 180 dias.</Text>

        <Field label="Ordem (0 aparece primeiro)" value={sortOrder} onChangeText={(v) => setSortOrder(v.replace(/\D/g, ""))} keyboardType="numeric" />

        <Card>
          <View style={u.between}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={u.strong}>Banner ligado</Text>
              <Text style={u.muted}>{isActive ? "Aparece nas datas escolhidas." : "Fica guardado, mas não aparece."}</Text>
            </View>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
          </View>
        </Card>

        <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Criar banner"} onPress={save} disabled={saving} />
        <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
      </Page>
    </AdminLayout>
  );
}
