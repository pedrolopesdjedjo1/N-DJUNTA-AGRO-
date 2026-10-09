import React, { useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { Page, Title, Field, Chip, Btn, u } from "../components/ui";
import { DEPARTMENTS, departmentOf, ESTADOS } from "../constants/market";
import { pickImage, uploadImageBase64, pickVideo, uploadVideo, PickedVideo } from "../utils/storage";
import { createProduct } from "../api/products";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

export default function AddProductScreen({ navigation }: any) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [estado, setEstado] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [location, setLocation] = useState("");
  const [deliveryOptions, setDeliveryOptions] = useState("");
  const [saleConditions, setSaleConditions] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [loading, setLoading] = useState(false);

  const subcategories = departmentOf(department)?.subcategories ?? [];

  async function takeImage(fromCamera: boolean) {
    const picked = await pickImage(fromCamera);
    if (picked) {
      setImageUri(picked.uri);
      setImageBase64(picked.base64);
    }
  }

  async function takeVideo(fromCamera: boolean) {
    const picked = await pickVideo(fromCamera);
    if (picked) setVideo(picked);
  }

  async function submit() {
    if (!title.trim() || !department || !price || !quantity || !unit.trim()) {
      Alert.alert("Atenção", "Preencha nome, departamento, preço, quantidade e unidade.");
      return;
    }
    const priceNumber = parseFloat(price.replace(",", "."));
    const quantityNumber = parseInt(quantity, 10);
    if (isNaN(priceNumber) || priceNumber <= 0 || isNaN(quantityNumber) || quantityNumber <= 0) {
      Alert.alert("Atenção", "Preço e quantidade devem ser números maiores que zero.");
      return;
    }

    setLoading(true);
    try {
      const imageUrl = imageBase64 ? await uploadImageBase64(imageBase64) : undefined;
      const videoUrl = video ? await uploadVideo(video.uri, video.mime) : undefined;

      await createProduct({
        title: title.trim(),
        description: description.trim() || undefined,
        department,
        subcategory: subcategory || undefined,
        price: priceNumber,
        quantity: quantityNumber,
        unit: unit.trim(),
        location: location.trim() || undefined,
        imageUrl,
        videoUrl,
        details: { brand, model, estado, color, size, deliveryOptions, saleConditions },
      });

      Alert.alert("Pronto", "Produto publicado!");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível publicar o produto."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Title>➕ Publicar produto</Title>

      <Text style={u.label}>📸 Foto</Text>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ width: "100%", height: 200, borderRadius: 8 }} />
      ) : (
        <Text style={u.muted}>Nenhuma foto escolhida</Text>
      )}
      <View style={u.row}>
        <Btn small kind="outline" label="Galeria" onPress={() => takeImage(false)} />
        <Btn small kind="outline" label="Câmera" onPress={() => takeImage(true)} />
      </View>

      <Text style={u.label}>🎥 Vídeo (até 30 segundos)</Text>
      {video ? <Text style={{ color: colors.primary }}>🎬 Vídeo escolhido ({video.info})</Text> : <Text style={u.muted}>Nenhum vídeo escolhido</Text>}
      <View style={u.row}>
        <Btn small kind="outline" label="Escolher vídeo" onPress={() => takeVideo(false)} />
        <Btn small kind="outline" label="Gravar vídeo" onPress={() => takeVideo(true)} />
        {video ? <Btn small kind="danger" label="Remover" onPress={() => setVideo(null)} /> : null}
      </View>

      <Field label="Nome do produto" value={title} onChangeText={setTitle} placeholder="Ex: Arroz" />

      <Text style={u.label}>Departamento</Text>
      <View style={u.row}>
        {DEPARTMENTS.map((d) => (
          <Chip
            key={d.value}
            label={`${d.icon} ${d.label}`}
            active={department === d.value}
            onPress={() => {
              setDepartment(d.value);
              setSubcategory("");
            }}
          />
        ))}
      </View>

      {subcategories.length > 0 && (
        <>
          <Text style={u.label}>Subcategoria</Text>
          <View style={u.row}>
            {subcategories.map((s) => (
              <Chip key={s} label={s} active={subcategory === s} onPress={() => setSubcategory(s)} />
            ))}
          </View>
        </>
      )}

      <Field label="Descrição" value={description} onChangeText={setDescription} multiline placeholder="Descreva o produto" />
      <Field label="Preço (FCFA)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Ex: 500" />
      <Field label="Quantidade" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="Ex: 50" />
      <Field label="Unidade" value={unit} onChangeText={setUnit} placeholder="Ex: kg, saco, unidade" />
      <Field label="Marca" value={brand} onChangeText={setBrand} />
      <Field label="Modelo" value={model} onChangeText={setModel} />

      <Text style={u.label}>Estado</Text>
      <View style={u.row}>
        {ESTADOS.map((e) => (
          <Chip key={e.value} label={e.label} active={estado === e.value} onPress={() => setEstado(estado === e.value ? "" : e.value)} />
        ))}
      </View>

      <Field label="Cor" value={color} onChangeText={setColor} />
      <Field label="Tamanho" value={size} onChangeText={setSize} />
      <Field label="Localização" value={location} onChangeText={setLocation} placeholder="Ex: Bissau" />
      <Field label="Opções de entrega" value={deliveryOptions} onChangeText={setDeliveryOptions} placeholder="Ex: entrego em Bissau / recolha na loja" />
      <Field label="Condições de venda" value={saleConditions} onChangeText={setSaleConditions} multiline placeholder="Ex: pagamento na entrega" />

      <Btn label={loading ? "A publicar..." : "Publicar"} onPress={submit} disabled={loading} />
    </Page>
  );
}
