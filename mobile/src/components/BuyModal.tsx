import React, { useEffect, useState } from "react";
import { View, Text, Modal, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn, Chip, Field, Title, u } from "./ui";
import { createOrder } from "../api/orders";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";
import { colors } from "../theme/colors";

const CHOICES = ["Recolha no vendedor", "Entrega ao domicílio"];

export default function BuyModal({
  product,
  onClose,
  onDone,
}: {
  product: any | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [qty, setQty] = useState("1");
  const [delivery, setDelivery] = useState(CHOICES[0]);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (product) {
      setQty("1");
      setDelivery(CHOICES[0]);
      setAddress("");
      setNotes("");
    }
  }, [product]);

  const unitPrice = product ? product.finalPrice ?? product.price : 0;
  const total = unitPrice * (parseInt(qty, 10) || 0);

  async function confirm() {
    if (!product) return;
    const quantity = parseInt(qty, 10);
    if (isNaN(quantity) || quantity < 1 || quantity > product.quantity) {
      Alert.alert("Atenção", `Escolha uma quantidade de 1 a ${product.quantity}.`);
      return;
    }
    if (delivery === CHOICES[1] && !address.trim()) {
      Alert.alert("Atenção", "Escreva o endereço de entrega.");
      return;
    }

    setSending(true);
    try {
      await createOrder({
        items: [{ productId: product.id, quantity }],
        deliveryOption: delivery,
        deliveryAddress: delivery === CHOICES[1] ? address.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert("Pedido enviado", "O vendedor vai responder em breve.");
      onDone();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível enviar o pedido."));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={!!product} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <Title>🛒 Comprar</Title>
          {product ? (
            <>
              <Text style={u.strong}>{product.title}</Text>
              <Text style={u.muted}>
                {money(unitPrice)} / {product.unit}
              </Text>

              <Field label={`Quantidade (máx. ${product.quantity})`} value={qty} onChangeText={setQty} keyboardType="numeric" />

              <Text style={u.label}>Entrega</Text>
              <View style={u.row}>
                {CHOICES.map((c) => (
                  <Chip key={c} label={c} active={delivery === c} onPress={() => setDelivery(c)} />
                ))}
              </View>

              {delivery === CHOICES[1] ? (
                <Field label="Endereço de entrega" value={address} onChangeText={setAddress} multiline />
              ) : null}
              <Field label="Nota para o vendedor (opcional)" value={notes} onChangeText={setNotes} multiline />

              <Text style={[u.strong, { marginTop: 14 }]}>Total: {money(total)}</Text>

              <View style={u.row}>
                <Btn label={sending ? "A enviar..." : "Confirmar pedido"} onPress={confirm} disabled={sending} />
                <Btn kind="outline" label="Fechar" onPress={onClose} />
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
