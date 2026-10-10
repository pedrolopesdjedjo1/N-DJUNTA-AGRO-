import React, { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getPromotions, createPromotion, deletePromotion, getMyProducts } from "../api/merchant";
import { getApiErrorMessage } from "../api/errorMessage";
import { PROMOTION_KINDS, money, formatDate } from "../constants/market";

export default function MerchantPromotionsScreen() {
  const loader = useLoader(
    async () => {
      const [promotions, products] = await Promise.all([getPromotions(), getMyProducts()]);
      return { promotions, products };
    },
    { promotions: [] as any[], products: [] as any[] }
  );

  const [kind, setKind] = useState("DESCONTO");
  const [title, setTitle] = useState("");
  const [discount, setDiscount] = useState("");
  const [productId, setProductId] = useState("");
  const [description, setDescription] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      Alert.alert("Atenção", "Escreva o título da promoção.");
      return;
    }
    if (kind === "DESCONTO" && !discount.trim()) {
      Alert.alert("Atenção", "Informe o desconto em percentagem.");
      return;
    }

    let end: string | undefined;
    if (endsAt.trim()) {
      const date = new Date(endsAt.trim());
      if (isNaN(date.getTime())) {
        Alert.alert("Atenção", "Use a data final no formato AAAA-MM-DD.");
        return;
      }
      date.setHours(23, 59, 59, 0);
      end = date.toISOString();
    }

    setSaving(true);
    try {
      await createPromotion({
        kind,
        title: title.trim(),
        description: description.trim() || undefined,
        discountPercent: discount.trim() ? Number(discount.replace(",", ".")) : undefined,
        productId: productId || undefined,
        endsAt: end,
      });
      setTitle("");
      setDiscount("");
      setProductId("");
      setDescription("");
      setEndsAt("");
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível criar a promoção."));
    } finally {
      setSaving(false);
    }
  }

  function remove(p: any) {
    Alert.alert("Apagar promoção", `Apagar "${p.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePromotion(p.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  const now = Date.now();

  return (
    <Page loader={loader}>
      <Title>📢 Promoções</Title>

      <SubTitle>Criar promoção</SubTitle>
      <View style={u.row}>
        {PROMOTION_KINDS.map((k) => (
          <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
        ))}
      </View>

      <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: Semana do arroz" />
      <Field label="Desconto (%)" value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholder="Ex: 10" />

      <Text style={u.label}>Produto (opcional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip label="Nenhum" active={productId === ""} onPress={() => setProductId("")} />
        {loader.data.products.map((p: any) => (
          <Chip key={p.id} label={p.title} active={productId === p.id} onPress={() => setProductId(p.id)} />
        ))}
      </ScrollView>

      <Field label="Descrição" value={description} onChangeText={setDescription} multiline />
      <Field label="Termina em (AAAA-MM-DD, opcional)" value={endsAt} onChangeText={setEndsAt} placeholder="2026-10-31" />
      <Btn label={saving ? "A guardar..." : "Criar promoção"} onPress={save} disabled={saving} />

      <SubTitle>As minhas promoções</SubTitle>
      {loader.data.promotions.length === 0 ? (
        <Empty text="Ainda não criou promoções." />
      ) : (
        loader.data.promotions.map((p: any) => {
          const ended = p.endsAt && new Date(p.endsAt).getTime() < now;
          const label = ended ? "Terminada" : p.isActive ? "Ativa" : "Pausada";
          const color = ended ? "#757575" : p.isActive ? "#2E7D32" : "#F9A825";
          return (
            <Card key={p.id}>
              <View style={u.between}>
                <Text style={u.strong}>{p.title}</Text>
                <Badge label={label} color={color} />
              </View>
              <Text style={u.muted}>{PROMOTION_KINDS.find((k) => k.value === p.kind)?.label ?? p.kind}</Text>
              {p.discountPercent ? <Text style={u.muted}>Desconto: {p.discountPercent}%</Text> : null}
              {p.productTitle ? <Text style={u.muted}>Produto: {p.productTitle}</Text> : null}
              <Text style={u.muted}>
                De {formatDate(p.startsAt)}
                {p.endsAt ? ` até ${formatDate(p.endsAt)}` : " (sem data final)"}
              </Text>
              {p.description ? <Text style={{ marginTop: 4 }}>{p.description}</Text> : null}
              <Btn small kind="danger" label="Apagar" onPress={() => remove(p)} />
            </Card>
          );
        })
      )}
    </Page>
  );
}
