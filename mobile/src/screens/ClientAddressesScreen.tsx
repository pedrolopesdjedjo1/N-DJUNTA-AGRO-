import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getAddresses, createAddress, updateAddress, makeAddressDefault, deleteAddress } from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

const TIPOS = [
  { value: "CASA", label: "Casa", icon: "home-outline" },
  { value: "TRABALHO", label: "Trabalho", icon: "briefcase-outline" },
  { value: "OUTRO", label: "Outro", icon: "location-outline" },
] as const;

function iconeDe(label: string): any {
  return TIPOS.find((t) => t.value === label)?.icon ?? "location-outline";
}
function nomeDe(label: string): string {
  return TIPOS.find((t) => t.value === label)?.label ?? "Endereço";
}

export default function ClientAddressesScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Formulário (criar ou editar)
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("CASA");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getAddresses();
      setItems(Array.isArray(data) ? data : data?.addresses ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Não foi possível carregar os endereços."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openNew() {
    setEditingId(null);
    setLabel("CASA");
    setName("");
    setAddress("");
    setRegion("");
    setFormOpen(true);
  }

  function openEdit(a: any) {
    setEditingId(a.id);
    setLabel(a.label ?? "CASA");
    setName(a.name ?? "");
    setAddress(a.address ?? "");
    setRegion(a.region ?? "");
    setFormOpen(true);
  }

  async function save() {
    if (address.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o endereço.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        label,
        name: name.trim() || undefined,
        address: address.trim(),
        region: region.trim() || undefined,
      };
      if (editingId) await updateAddress(editingId, body);
      else await createAddress(body);
      setFormOpen(false);
      load();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar o endereço."));
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(a: any) {
    try {
      await makeAddressDefault(a.id);
      load();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível mudar o endereço padrão."));
    }
  }

  function remove(a: any) {
    Alert.alert("Apagar endereço", "Quer mesmo apagar este endereço?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAddress(a.id);
            load();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar o endereço."));
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          colors={[colors.primary]}
        />
      }
    >
      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Ionicons name="location" size={26} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.heroTitle}>Os meus endereços</Text>
          <Text style={s.heroSub}>Para entregas mais rápidas e ofertas perto de si.</Text>
        </View>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      {items.length === 0 && !error ? (
        <View style={s.empty}>
          <Ionicons name="map-outline" size={44} color={colors.muted} />
          <Text style={s.emptyText}>Ainda não tem endereços guardados.</Text>
        </View>
      ) : null}

      {items.map((a) => (
        <View key={a.id} style={[s.card, a.isDefault && s.cardDefault]}>
          <View style={s.cardTop}>
            <View style={s.cardIcon}>
              <Ionicons name={iconeDe(a.label)} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{a.name || nomeDe(a.label)}</Text>
              <Text style={s.cardAddress}>{a.address}</Text>
              {a.region ? <Text style={s.cardRegion}>{a.region}</Text> : null}
            </View>
            {a.isDefault ? (
              <View style={s.defaultTag}>
                <Text style={s.defaultText}>Padrão</Text>
              </View>
            ) : null}
          </View>
          <View style={s.cardActions}>
            {!a.isDefault ? (
              <TouchableOpacity style={s.action} onPress={() => setDefault(a)}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                <Text style={s.actionText}>Tornar padrão</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={s.action} onPress={() => openEdit(a)}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={s.actionText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.action} onPress={() => remove(a)}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[s.actionText, { color: colors.error }]}>Apagar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {formOpen ? (
        <View style={s.form}>
          <Text style={s.formTitle}>{editingId ? "Editar endereço" : "Novo endereço"}</Text>

          <View style={s.tipos}>
            {TIPOS.map((t) => {
              const on = label === t.value;
              return (
                <TouchableOpacity key={t.value} style={[s.tipo, on && s.tipoOn]} onPress={() => setLabel(t.value)}>
                  <Ionicons name={t.icon as any} size={16} color={on ? colors.white : colors.primary} />
                  <Text style={[s.tipoText, on && s.tipoTextOn]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.fieldLabel}>Nome (opcional)</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ex: Casa da família" placeholderTextColor={colors.muted} />

          <Text style={s.fieldLabel}>Endereço</Text>
          <TextInput
            style={[s.input, { minHeight: 70, textAlignVertical: "top" }]}
            value={address}
            onChangeText={setAddress}
            placeholder="Ex: Bairro de Bandim, perto do mercado"
            placeholderTextColor={colors.muted}
            multiline
          />

          <Text style={s.fieldLabel}>Região / Cidade</Text>
          <TextInput style={s.input} value={region} onChangeText={setRegion} placeholder="Ex: Bissau" placeholderTextColor={colors.muted} />

          <View style={s.formButtons}>
            <TouchableOpacity style={[s.formBtn, s.formCancel]} onPress={() => setFormOpen(false)}>
              <Text style={s.formCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.formBtn, s.formSave, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.black} /> : <Text style={s.formSaveText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.addBtn} onPress={openNew} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={22} color={colors.black} />
          <Text style={s.addText}>Adicionar endereço</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 14, paddingBottom: 50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  heroTitle: { color: colors.white, fontSize: 18, fontWeight: "900" },
  heroSub: { color: colors.primarySoft, fontSize: 12, marginTop: 2 },
  error: { color: colors.error, textAlign: "center", marginBottom: 10 },
  empty: { alignItems: "center", paddingVertical: 36 },
  emptyText: { color: colors.textSecondary, marginTop: 10, fontSize: 15 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  cardDefault: { borderColor: colors.primary },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  cardAddress: { fontSize: 14, color: colors.textSecondary, marginTop: 3 },
  cardRegion: { fontSize: 12, color: colors.primary, fontWeight: "700", marginTop: 3 },
  defaultTag: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  defaultText: { fontSize: 11, fontWeight: "900", color: colors.black },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
    paddingTop: 10,
  },
  action: { flexDirection: "row", alignItems: "center", marginRight: 18, paddingVertical: 2 },
  actionText: { color: colors.primary, fontWeight: "700", fontSize: 13, marginLeft: 5 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  addText: { color: colors.black, fontWeight: "900", fontSize: 16, marginLeft: 8 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: 16,
    marginTop: 4,
  },
  formTitle: { fontSize: 17, fontWeight: "900", color: colors.text, marginBottom: 12 },
  tipos: { flexDirection: "row", marginBottom: 6 },
  tipo: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  tipoOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tipoText: { marginLeft: 5, color: colors.text, fontWeight: "700", fontSize: 13 },
  tipoTextOn: { color: colors.white },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.text, marginTop: 10, marginBottom: 5 },
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
  formButtons: { flexDirection: "row", marginTop: 16 },
  formBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  formCancel: { borderWidth: 1.5, borderColor: colors.border, marginRight: 8 },
  formCancelText: { color: colors.textSecondary, fontWeight: "800" },
  formSave: { backgroundColor: colors.gold },
  formSaveText: { color: colors.black, fontWeight: "900", fontSize: 15 },
});
