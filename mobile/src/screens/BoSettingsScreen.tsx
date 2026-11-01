import React, { useCallback, useState } from "react";
import { View, Text, Image, Switch, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { listBoSettings, updateBoSetting } from "../api/backoffice";
import { adminCan } from "../utils/adminSession";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { SETTING_GROUP_ICON } from "../constants/backofficeComms";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

const LANGUAGE_NAMES: Record<string, string> = { pt: "Português", kri: "Crioulo", en: "Inglês", fr: "Francês" };

function initial(item: any): any {
  if (item.type === "number") return String(item.value ?? "");
  if (item.type === "list" && !item.options) return (item.value as string[]).join("\n");
  return item.value;
}

function SettingRow({ item, onSaved }: { item: any; onSaved: () => void }) {
  const [draft, setDraft] = useState<any>(initial(item));
  const [busy, setBusy] = useState(false);

  const original = initial(item);
  const changed = JSON.stringify(draft) !== JSON.stringify(original);
  const editable = item.canEdit;

  function value(): any {
    if (item.type === "number") return Number(String(draft).replace(",", "."));
    if (item.type === "list" && !item.options) return String(draft).split("\n").map((x) => x.trim()).filter(Boolean);
    return draft;
  }

  async function save() {
    if (item.type === "number" && isNaN(Number(String(draft).replace(",", ".")))) {
      Alert.alert("Atenção", "Escreva um número.");
      return;
    }

    setBusy(true);
    try {
      await updateBoSetting(item.key, value());
      onSaved();
      Alert.alert("Pronto", "Guardado. Fica registado no histórico de alterações.");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar."));
    } finally {
      setBusy(false);
    }
  }

  async function chooseLogo() {
    const picked = await pickImage(false, [1, 1]);
    if (!picked) return;

    setBusy(true);
    try {
      setDraft(await uploadImageBase64(picked.base64, "logo-"));
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a imagem."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{item.label}</Text>
        {!editable ? <Badge label="Só leitura" color="#757575" /> : item.custom ? <Badge label="Personalizado" color="#00838F" /> : null}
      </View>
      {item.hint ? <Text style={u.muted}>{item.hint}</Text> : null}

      {item.type === "boolean" ? (
        <View style={[u.between, { marginTop: 6 }]}>
          <Text style={{ flex: 1, marginRight: 8 }}>{draft ? "Ligado" : "Desligado"}</Text>
          <Switch value={!!draft} onValueChange={setDraft} disabled={!editable} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
        </View>
      ) : null}

      {item.type === "list" && item.options ? (
        <View style={u.row}>
          {(item.options as string[]).map((o) => (
            <Chip
              key={o}
              label={LANGUAGE_NAMES[o] ?? o}
              active={(draft as string[]).includes(o)}
              onPress={() => editable && setDraft((draft as string[]).includes(o) ? (draft as string[]).filter((x) => x !== o) : [...(draft as string[]), o])}
            />
          ))}
        </View>
      ) : null}

      {item.type === "list" && !item.options ? <Field value={draft} onChangeText={setDraft} multiline editable={editable} placeholder="Um por linha" /> : null}

      {item.type === "number" ? (
        <Field value={draft} onChangeText={(v: string) => setDraft(v.replace(/[^\d.,]/g, ""))} keyboardType="numeric" editable={editable} placeholder={item.min !== null && item.max !== null ? `Entre ${item.min} e ${item.max}` : undefined} />
      ) : null}

      {item.type === "string" || item.type === "url" || item.type === "text" ? (
        <>
          {item.key === "platform.logoUrl" && draft ? <Image source={{ uri: draft }} resizeMode="contain" style={{ width: 90, height: 90, marginTop: 6, backgroundColor: "#ECEFF1", borderRadius: 8 }} /> : null}
          <Field value={draft} onChangeText={setDraft} multiline={item.type === "text"} editable={editable} autoCapitalize="none" />
          {item.key === "platform.logoUrl" && editable ? (
            <View style={u.row}>
              <Btn small kind="outline" label="Escolher imagem" onPress={chooseLogo} disabled={busy} />
              {draft ? <Btn small kind="outline" label="Tirar o logo" onPress={() => setDraft("")} /> : null}
            </View>
          ) : null}
          {item.maxLength ? <Text style={u.muted}>{String(draft ?? "").length}/{item.maxLength}</Text> : null}
        </>
      ) : null}

      {editable && changed ? (
        <View style={u.row}>
          <Btn small label={busy ? "A guardar..." : "Guardar"} onPress={save} disabled={busy} />
          <Btn small kind="outline" label="Desfazer" onPress={() => setDraft(original)} />
        </View>
      ) : null}
    </Card>
  );
}

export default function BoSettingsScreen({ navigation }: any) {
  const loader = useLoader(listBoSettings, [] as any[]);
  const groups: any[] = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <Title>⚙️ Configurações do sistema</Title>
        <Text style={u.muted}>Cada configuração só pode ser mudada por quem tem a permissão certa. Todas as mudanças ficam no registo de atividades, com o valor antes e depois.</Text>

        <View style={u.row}>
          {adminCan("market.moderate") ? <Btn small kind="outline" label="🏷️ Categorias do mercado" onPress={() => navigation.navigate("BoCategories")} /> : null}
          <Btn small kind="outline" label="🔐 A minha segurança" onPress={() => navigation.navigate("BoSecurity")} />
          <Btn small kind="outline" label="🧾 Histórico de alterações" onPress={() => navigation.navigate("BoAudit", { action: "SETTING_UPDATE" })} />
        </View>

        <Card>
          <Text style={u.strong}>📍 Regiões</Text>
          <Text style={u.muted}>As regiões do país são fixas no app. Se precisar de acrescentar uma, fale comigo na próxima atualização.</Text>
        </Card>

        {groups.length === 0 && !loader.loading ? (
          <Empty text="Sem configurações para mostrar." />
        ) : (
          groups.map((g) => (
            <View key={g.group}>
              <SubTitle>
                {SETTING_GROUP_ICON[g.group] ?? "⚙️"} {g.group}
              </SubTitle>
              {g.items.map((item: any) => (
                <SettingRow key={`${item.key}-${JSON.stringify(item.value)}`} item={item} onSaved={() => loader.reload()} />
              ))}
            </View>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
