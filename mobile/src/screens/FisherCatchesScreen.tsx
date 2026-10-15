import React, { useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { FisherLayout } from "../components/MerchantTabs";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getCatches, createCatch, updateCatch, markCatchSold, deleteCatch, publishCatch } from "../api/fisher";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { getApiErrorMessage } from "../api/errorMessage";
import { FRESHNESS, FISH_UNITS, formatDateTime } from "../constants/market";

const EMPTY = { count: 0, totalWeightKg: 0, availableCount: 0, items: [] as any[] };

function nowParts() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

function kg(value: number) {
  return `${Math.round((Number(value) || 0) * 10) / 10} kg`;
}

export default function FisherCatchesScreen() {
  const [status, setStatus] = useState("available");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(() => getCatches({ status: status === "all" ? "" : status, q }), EMPTY, [status, q]);
  const data: any = loader.data;

  const [open, setOpen] = useState(false);
  const [species, setSpecies] = useState("");
  const [others, setOthers] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [weight, setWeight] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(nowParts().date);
  const [time, setTime] = useState(nowParts().time);
  const [freshness, setFreshness] = useState("FRESCO");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<{ uri: string; base64: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [publishId, setPublishId] = useState<string | null>(null);
  const [pubPrice, setPubPrice] = useState("");
  const [pubQty, setPubQty] = useState("");

  async function addPhoto(fromCamera: boolean) {
    if (photos.length >= 5) {
      Alert.alert("Atenção", "Pode juntar até 5 fotos.");
      return;
    }
    const picked = await pickImage(fromCamera);
    if (picked) setPhotos((prev) => [...prev, { uri: picked.uri, base64: picked.base64 }]);
  }

  async function submit() {
    if (!species.trim()) {
      Alert.alert("Atenção", "Escreva o tipo de peixe.");
      return;
    }
    const qty = quantity.trim() ? parseInt(quantity, 10) : 0;
    const weightKg = weight.trim() ? Number(weight.replace(",", ".")) : undefined;
    if (isNaN(qty) || qty < 0 || (weightKg !== undefined && (isNaN(weightKg) || weightKg < 0))) {
      Alert.alert("Atenção", "Quantidade e peso devem ser números válidos.");
      return;
    }
    if (qty === 0 && !weightKg) {
      Alert.alert("Atenção", "Informe a quantidade ou o peso capturado.");
      return;
    }
    const caughtAt = new Date(`${date.trim()}T${time.trim() || "00:00"}:00`);
    if (isNaN(caughtAt.getTime())) {
      Alert.alert("Atenção", "Use a data AAAA-MM-DD e a hora HH:MM.");
      return;
    }

    setSaving(true);
    try {
      const imageUrls: string[] = [];
      for (const photo of photos) {
        imageUrls.push(await uploadImageBase64(photo.base64));
      }

      await createCatch({
        species: species.trim(),
        otherSpecies: others
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        quantity: qty,
        unit,
        weightKg,
        location: location.trim() || undefined,
        caughtAt: caughtAt.toISOString(),
        freshness,
        notes: notes.trim() || undefined,
        imageUrls,
      });

      setOpen(false);
      setSpecies("");
      setOthers("");
      setQuantity("");
      setWeight("");
      setNotes("");
      setPhotos([]);
      setDate(nowParts().date);
      setTime(nowParts().time);
      loader.reload();
      Alert.alert("Pronto", "Pesca registada.");
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível registar a pesca."));
    } finally {
      setSaving(false);
    }
  }

  async function run(work: () => Promise<any>, fail: string) {
    try {
      await work();
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, fail));
    }
  }

  function saveAvailable(c: any) {
    const value = parseInt(edits[c.id] ?? "", 10);
    if (isNaN(value) || value < 0) {
      Alert.alert("Atenção", "Escreva uma quantidade válida.");
      return;
    }
    run(async () => {
      await updateCatch(c.id, { available: value });
      setEdits((prev) => ({ ...prev, [c.id]: "" }));
    }, "Não foi possível atualizar a quantidade.");
  }

  function sold(c: any) {
    Alert.alert("Marcar como vendido", `"${c.species}" deixa de estar disponível.`, [
      { text: "Não", style: "cancel" },
      { text: "Sim", onPress: () => run(() => markCatchSold(c.id), "Não foi possível marcar como vendido.") },
    ]);
  }

  function remove(c: any) {
    Alert.alert("Apagar registo", `Apagar a captura de "${c.species}"?`, [
      { text: "Não", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => run(() => deleteCatch(c.id), "Não foi possível apagar.") },
    ]);
  }

  function startPublish(c: any) {
    setPublishId(publishId === c.id ? null : c.id);
    setPubPrice("");
    setPubQty(String(c.available));
  }

  async function confirmPublish(c: any) {
    const price = Number(pubPrice.replace(",", "."));
    const qty = parseInt(pubQty, 10);
    if (isNaN(price) || price <= 0) {
      Alert.alert("Atenção", "Escreva um preço válido.");
      return;
    }
    if (isNaN(qty) || qty < 1 || qty > c.available) {
      Alert.alert("Atenção", `Escolha uma quantidade de 1 a ${c.available}.`);
      return;
    }
    try {
      await publishCatch(c.id, { price, quantity: qty });
      setPublishId(null);
      loader.reload();
      Alert.alert("Publicado", "O pescado já está à venda.");
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível publicar."));
    }
  }

  return (
    <FisherLayout active="FisherCatches">
      <Page loader={loader}>
        <Title>🎣 Minha pesca</Title>

        <Card>
          <Text style={u.strong}>
            {data.count} captura(s) · {data.availableCount} disponível(eis)
          </Text>
          <Text style={u.muted}>Peso total registado: {kg(data.totalWeightKg)}</Text>
        </Card>

        <Btn label={open ? "Fechar formulário" : "➕ Registar uma pesca"} onPress={() => setOpen(!open)} />

        {open && (
          <Card>
            <Text style={u.label}>📸 Fotos da captura (até 5)</Text>
            <View style={u.row}>
              {photos.map((p, index) => (
                <View key={p.uri}>
                  <Image source={{ uri: p.uri }} style={u.photo} />
                  <Btn small kind="danger" label="X" onPress={() => setPhotos(photos.filter((_, i) => i !== index))} />
                </View>
              ))}
            </View>
            <View style={u.row}>
              <Btn small kind="outline" label="Galeria" onPress={() => addPhoto(false)} />
              <Btn small kind="outline" label="Câmera" onPress={() => addPhoto(true)} />
            </View>

            <Field label="Tipo de peixe" value={species} onChangeText={setSpecies} placeholder="Ex: Bagre, Tainha, Barracuda" />
            <Field label="Outras espécies capturadas (separe com vírgulas)" value={others} onChangeText={setOthers} placeholder="Ex: Sardinha, Carapau" />
            <Field label="Quantidade" value={quantity} onChangeText={(v) => setQuantity(v.replace(/\D/g, ""))} keyboardType="numeric" placeholder="Ex: 40" />

            <Text style={u.label}>Unidade</Text>
            <View style={u.row}>
              {FISH_UNITS.map((x) => (
                <Chip key={x} label={x} active={unit === x} onPress={() => setUnit(x)} />
              ))}
            </View>

            <Field label="Peso total (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="Ex: 25" />
            <Field label="Local da pesca" value={location} onChangeText={setLocation} placeholder="Ex: Canal do Geba, Bubaque" />
            <Field label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} />
            <Field label="Hora (HH:MM)" value={time} onChangeText={setTime} />

            <Text style={u.label}>Estado e frescura do pescado</Text>
            <View style={u.row}>
              {FRESHNESS.map((f) => (
                <Chip key={f.value} label={f.label} active={freshness === f.value} onPress={() => setFreshness(f.value)} />
              ))}
            </View>

            <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline />
            <Btn label={saving ? "A guardar..." : "Guardar pesca"} onPress={submit} disabled={saving} />
          </Card>
        )}

        <View style={u.row}>
          <Chip label="Disponíveis" active={status === "available"} onPress={() => setStatus("available")} />
          <Chip label="Vendidas" active={status === "sold"} onPress={() => setStatus("sold")} />
          <Chip label="Todas" active={status === "all"} onPress={() => setStatus("all")} />
        </View>

        <Field
          placeholder="Pesquisar por espécie"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        {data.items.length === 0 ? (
          <Empty text="Nenhuma captura encontrada." />
        ) : (
          data.items.map((c: any) => {
            const state = FRESHNESS.find((f) => f.value === c.freshness)?.label ?? c.freshness;
            return (
              <Card key={c.id}>
                <View style={u.row}>
                  {c.imageUrls?.[0] ? <Image source={{ uri: c.imageUrls[0] }} style={u.photo} /> : <View style={u.photo} />}
                  <View style={{ flex: 1 }}>
                    <Text style={u.strong}>{c.species}</Text>
                    <Text style={u.muted}>
                      Capturado: {c.quantity} {c.unit}
                      {c.weightKg ? ` · ${kg(c.weightKg)}` : ""}
                    </Text>
                    <Text style={u.muted}>
                      Disponível: {c.available} {c.unit}
                    </Text>
                  </View>
                  <Badge label={c.isSold ? "Vendido" : "Disponível"} color={c.isSold ? "#757575" : "#2E7D32"} />
                </View>

                <Text style={u.muted}>
                  🕒 {formatDateTime(c.caughtAt)}
                  {c.location ? ` · 📍 ${c.location}` : ""}
                </Text>
                <Text style={u.muted}>🧊 Estado: {state}</Text>
                {c.otherSpecies?.length > 0 ? <Text style={u.muted}>Outras espécies: {c.otherSpecies.join(", ")}</Text> : null}
                {c.notes ? <Text style={u.muted}>📝 {c.notes}</Text> : null}
                {c.productId ? <Badge label="Publicado para venda" color="#1565C0" /> : null}

                {!c.isSold && (
                  <>
                    <View style={[u.row, { alignItems: "flex-end" }]}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Field
                          label="Atualizar quantidade disponível"
                          value={edits[c.id] ?? ""}
                          onChangeText={(v) => setEdits((prev) => ({ ...prev, [c.id]: v.replace(/\D/g, "") }))}
                          keyboardType="numeric"
                          placeholder={String(c.available)}
                        />
                      </View>
                      <Btn small label="Atualizar" onPress={() => saveAvailable(c)} />
                    </View>

                    <View style={u.row}>
                      {!c.productId && <Btn small label="🐟 Publicar para venda" onPress={() => startPublish(c)} />}
                      <Btn small kind="outline" label="Marcar como vendido" onPress={() => sold(c)} />
                      <Btn small kind="danger" label="Apagar" onPress={() => remove(c)} />
                    </View>

                    {publishId === c.id && (
                      <View style={{ marginTop: 8 }}>
                        <Field label={`Preço por ${c.unit} (FCFA)`} value={pubPrice} onChangeText={setPubPrice} keyboardType="numeric" />
                        <Field label={`Quantidade à venda (máx. ${c.available})`} value={pubQty} onChangeText={(v) => setPubQty(v.replace(/\D/g, ""))} keyboardType="numeric" />
                        <Btn small label="Confirmar publicação" onPress={() => confirmPublish(c)} />
                      </View>
                    )}
                  </>
                )}

                {c.isSold && (
                  <View style={u.row}>
                    <Btn small kind="danger" label="Apagar" onPress={() => remove(c)} />
                  </View>
                )}
              </Card>
            );
          })
        )}
      </Page>
    </FisherLayout>
  );
}
