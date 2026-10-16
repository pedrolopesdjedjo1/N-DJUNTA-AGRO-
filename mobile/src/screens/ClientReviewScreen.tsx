import React, { useState } from "react";
import { View, Text, Image, Alert, TouchableOpacity } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getReviewables, postOrderReview } from "../api/shop";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";
import { colors } from "../theme/colors";

interface Target {
  kind: "PRODUTO" | "VENDEDOR" | "TRANSPORTADOR";
  productId?: string;
  name: string;
  reviewed: boolean;
}

const KIND_LABEL: Record<string, string> = {
  PRODUTO: "Produto",
  VENDEDOR: "Vendedor",
  TRANSPORTADOR: "Transportador",
};

export default function ClientReviewScreen({ navigation, route }: any) {
  const orderId: string = route?.params?.orderId;
  const loader = useLoader(() => getReviewables(orderId), null as any, [orderId]);
  const d: any = loader.data;

  const [active, setActive] = useState<Target | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function open(target: Target) {
    setActive(target);
    setRating(0);
    setComment("");
    setPhoto(null);
  }

  async function addPhoto(fromCamera: boolean) {
    const picked = await pickImage(fromCamera);
    if (picked) setPhoto({ uri: picked.uri, base64: picked.base64 });
  }

  async function send() {
    if (!active) return;
    if (rating < 1) {
      Alert.alert("Atenção", "Escolha de 1 a 5 estrelas.");
      return;
    }

    setSaving(true);
    try {
      const imageUrl = photo ? await uploadImageBase64(photo.base64, "avaliacao-") : undefined;
      await postOrderReview(orderId, {
        kind: active.kind,
        rating,
        comment: comment.trim() || undefined,
        imageUrl,
        productId: active.productId,
      });
      setActive(null);
      loader.reload();
      Alert.alert("Obrigado!", "A sua avaliação foi enviada.");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a avaliação."));
    } finally {
      setSaving(false);
    }
  }

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>⭐ Avaliar</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const targets: Target[] = [
    ...d.products.map((p: any) => ({ kind: "PRODUTO" as const, productId: p.productId, name: p.title, reviewed: p.reviewed })),
    { kind: "VENDEDOR" as const, name: d.seller.name, reviewed: d.seller.reviewed },
    ...(d.transporter ? [{ kind: "TRANSPORTADOR" as const, name: d.transporter.name, reviewed: d.transporter.reviewed }] : []),
  ];

  return (
    <Page loader={loader}>
      <Title>⭐ Avaliar a compra</Title>

      {!d.canReview ? (
        <Empty text="Pode avaliar depois de receber a encomenda e confirmar o recebimento." />
      ) : (
        <>
          <Text style={u.muted}>Escolha o que quer avaliar. Pode escrever um comentário e enviar uma foto.</Text>

          {targets.map((t) => (
            <Card key={`${t.kind}-${t.productId ?? ""}`}>
              <View style={u.between}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={u.muted}>{KIND_LABEL[t.kind]}</Text>
                  <Text style={u.strong}>{t.name}</Text>
                </View>
                {t.reviewed ? (
                  <Badge label="Avaliado" color="#2E7D32" />
                ) : (
                  <Btn small label={active && active.kind === t.kind && active.productId === t.productId ? "Fechar" : "Avaliar"} onPress={() => (active && active.kind === t.kind && active.productId === t.productId ? setActive(null) : open(t))} />
                )}
              </View>

              {active && active.kind === t.kind && active.productId === t.productId ? (
                <View style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: "row" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <TouchableOpacity key={n} onPress={() => setRating(n)} style={{ marginRight: 6 }}>
                        <Text style={{ fontSize: 34, color: n <= rating ? "#F9A825" : "#BDBDBD" }}>★</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Field label="Comentário (opcional)" value={comment} onChangeText={setComment} multiline placeholder="Conte como foi" />

                  <Text style={u.label}>📸 Foto (opcional)</Text>
                  {photo ? <Image source={{ uri: photo.uri }} style={{ width: 120, height: 120, borderRadius: 8, marginTop: 6 }} /> : null}
                  <View style={u.row}>
                    <Btn small kind="outline" label="Galeria" onPress={() => addPhoto(false)} />
                    <Btn small kind="outline" label="Câmera" onPress={() => addPhoto(true)} />
                    {photo ? <Btn small kind="danger" label="Remover" onPress={() => setPhoto(null)} /> : null}
                  </View>

                  <Btn label={saving ? "A enviar..." : "Enviar avaliação"} onPress={send} disabled={saving} />
                </View>
              ) : null}
            </Card>
          ))}

          {d.mine.length > 0 ? (
            <>
              <SubTitle>As suas avaliações desta encomenda</SubTitle>
              {d.mine.map((r: any) => (
                <Card key={r.id}>
                  <View style={u.between}>
                    <Text style={u.strong}>
                      {KIND_LABEL[r.kind]}
                      {r.productTitle ? `: ${r.productTitle}` : ""}
                    </Text>
                    <Text style={{ color: "#F9A825" }}>{"★".repeat(r.rating)}</Text>
                  </View>
                  <Text style={u.muted}>{formatDate(r.createdAt)}</Text>
                  {r.comment ? <Text style={{ marginTop: 4 }}>{r.comment}</Text> : null}
                  {r.imageUrl ? <Image source={{ uri: r.imageUrl }} style={{ width: 100, height: 100, borderRadius: 8, marginTop: 6 }} /> : null}
                </Card>
              ))}
            </>
          ) : null}
        </>
      )}

      <Btn kind="outline" label="Voltar às encomendas" onPress={() => navigation.navigate("ClientOrders")} />
    </Page>
  );
}
