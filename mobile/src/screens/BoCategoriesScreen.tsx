import React, { useCallback, useState } from "react";
import { View, Text, Alert, Switch } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Field, useLoader, u } from "../components/ui";
import { getBoCategories, saveBoCategory } from "../api/backoffice";
import { adminCan } from "../utils/adminSession";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

// Editar as categorias do mercado: nome, ícone, ordem, ativa ou não e subcategorias
export default function BoCategoriesScreen() {
  const loader = useLoader(getBoCategories, [] as any[]);
  const items: any[] = loader.data;
  const canEdit = adminCan("market.moderate");

  const [editing, setEditing] = useState("");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");
  const [order, setOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [subs, setSubs] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function startEdit(c: any) {
    setEditing(c.department);
    setLabel(c.label);
    setIcon(c.icon ?? "");
    setOrder(String(c.sortOrder));
    setIsActive(c.isActive);
    setSubs((c.subcategories as string[]).join("\n"));
  }

  async function save() {
    if (label.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o nome da categoria.");
      return;
    }
    const n = Math.floor(Number(order));
    if (isNaN(n) || n < 0 || n > 99) {
      Alert.alert("Atenção", "A ordem deve ser um número de 0 a 99.");
      return;
    }

    setBusy(true);
    try {
      loader.setData(
        await saveBoCategory(editing, {
          label: label.trim(),
          icon: icon.trim(),
          sortOrder: n,
          isActive,
          subcategories: subs.split("\n").map((s) => s.trim()).filter(Boolean),
        })
      );
      setEditing("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a categoria."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout active="BoMarket">
      <Page loader={loader}>
        <Title>🏷️ Categorias do mercado</Title>
        <Text style={u.muted}>
          Os cinco departamentos do mercado. Pode mudar o nome, o ícone, a ordem e as subcategorias. Uma categoria desativada deixa de aparecer a quem publica produtos, mas os produtos que já tem continuam.
        </Text>

        {items.map((c) => (
          <Card key={c.department}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                {c.icon} {c.label}
              </Text>
              <Badge label={c.isActive ? "Ativa" : "Desativada"} color={c.isActive ? "#2E7D32" : "#757575"} />
            </View>
            <Text style={u.muted}>
              {c.products} produto(s)
              {c.hiddenProducts > 0 ? ` (${c.hiddenProducts} escondido(s))` : ""} · ordem {c.sortOrder}
            </Text>
            <Text style={u.muted} numberOfLines={2}>
              {c.subcategories.length === 0 ? "Sem subcategorias definidas." : `Subcategorias: ${c.subcategories.join(", ")}`}
            </Text>
            {canEdit ? <Btn small kind="outline" label={editing === c.department ? "Fechar" : "✏️ Editar"} onPress={() => (editing === c.department ? setEditing("") : startEdit(c))} /> : null}

            {editing === c.department ? (
              <View style={{ marginTop: 8 }}>
                <Field label="Nome" value={label} onChangeText={setLabel} />
                <Field label="Ícone (um emoji)" value={icon} onChangeText={setIcon} placeholder="🌾" />
                <Field label="Ordem (0 a 99)" value={order} onChangeText={(v) => setOrder(v.replace(/\D/g, ""))} keyboardType="numeric" />
                <View style={[u.between, { marginTop: 4 }]}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={u.strong}>Categoria ativa</Text>
                    <Text style={u.muted}>{isActive ? "Aparece a quem publica produtos." : "Não aparece a quem publica produtos."}</Text>
                  </View>
                  <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
                </View>
                <Field label="Subcategorias (uma por linha)" value={subs} onChangeText={setSubs} multiline placeholder={"Arroz\nCaju\nMilho"} />
                <Btn label={busy ? "A guardar..." : "Guardar categoria"} onPress={save} disabled={busy} />
              </View>
            ) : null}
          </Card>
        ))}

        <Text style={[u.muted, { marginTop: 10 }]}>
          Os nomes e as subcategorias novas passam a aparecer nas telas de publicar produto quando a ligação final estiver feita.
        </Text>
      </Page>
    </AdminLayout>
  );
}
