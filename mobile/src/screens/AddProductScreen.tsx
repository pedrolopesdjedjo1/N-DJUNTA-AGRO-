import React, { useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { Page, Title, Field, Chip, Btn, u } from "../components/ui";
import { DEPARTMENTS, departmentOf, ESTADOS, ESTADOS_PRODUTO, FARM_UNITS, TIPOS } from "../constants/market";
import { pickImage, uploadImageBase64, pickVideo, uploadVideo, PickedVideo } from "../utils/storage";
import { createProduct, updateProduct } from "../api/products";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

export default function AddProductScreen({ navigation, route }: any) {
  const editing = route?.params?.product;
  const d = editing?.details ?? {};

  const [title, setTitle] = useState(editing?.title ?? "");
  const [department, setDepartment] = useState<string>(editing?.department ?? route?.params?.department ?? "");
  const [subcategory, setSubcategory] = useState(editing?.subcategory ?? "");
  const [tipo, setTipo] = useState(d.tipo ?? "PRODUTO");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [price, setPrice] = useState(editing ? String(editing.price) : "");
  const [quantity, setQuantity] = useState(editing ? String(editing.quantity) : "");
  const [unit, setUnit] = useState(editing?.unit ?? "");
  const [brand, setBrand] = useState(d.brand ?? "");
  const [model, setModel] = useState(d.model ?? "");
  const [estado, setEstado] = useState(d.estado ?? "");
  const [color, setColor] = useState(d.color ?? "");
  const [colors2, setColors2] = useState(d.colors ?? "");
  const [size, setSize] = useState(d.size ?? "");
  const [weight, setWeight] = useState(d.weight ?? "");
  const [materials, setMaterials] = useState(d.materials ?? "");
  const [productionTime, setProductionTime] = useState(d.productionTime ?? "");
  const [harvestDate, setHarvestDate] = useState(d.harvestDate ?? "");
  const [estadoProduto, setEstadoProduto] = useState(d.estadoProduto ?? "");
  const [location, setLocation] = useState(editing?.location ?? "");
  const [deliveryOptions, setDeliveryOptions] = useState(d.deliveryOptions ?? "");
  const [saleConditions, setSaleConditions] = useState(d.saleConditions ?? "");
  const [imageUri, setImageUri] = useState<string | null>(editing?.imageUrl ?? null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [loading, setLoading] = useState(false);

  const artisan = department === "ARTESANATO";
  const farm = department === "AGRICULTURA" && tipo === "PRODUTO";
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
    if (!title.trim() || !department || !price || !quantity || (!editing && !unit.trim())) {
      Alert.alert("Atenção", "Preencha nome, departamento, preço, quantidade e unidade.");
      return;
    }
    const priceNumber = parseFloat(price.replace(",", "."));
    const quantityNumber = parseInt(quantity, 10);
    if (isNaN(priceNumber) || priceNumber <= 0 || isNaN(quantityNumber) || quantityNumber < 0) {
      Alert.alert("Atenção", "Preço e quantidade devem ser números válidos.");
      return;
    }
    if (farm && harvestDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(harvestDate.trim())) {
      Alert.alert("Atenção", "Escreva a data de colheita assim: AAAA-MM-DD (ex: 2026-10-14).");
      return;
    }

    setLoading(true);
    try {
      const imageUrl = imageBase64 ? await uploadImageBase64(imageBase64) : undefined;
      const videoUrl = video ? await uploadVideo(video.uri, video.mime) : undefined;

      const details = {
        tipo,
        brand,
        model,
        estado,
        color,
        colors: colors2,
        size,
        weight,
        materials,
        productionTime,
        harvestDate: farm ? harvestDate.trim() : "",
        estadoProduto: farm ? estadoProduto : "",
        deliveryOptions,
        saleConditions,
      };

      const body: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || undefined,
        department,
        subcategory: subcategory || undefined,
        price: priceNumber,
        quantity: quantityNumber,
        location: location.trim() || undefined,
        details,
      };
      if (imageUrl) body.imageUrl = imageUrl;
      if (videoUrl) body.videoUrl = videoUrl;

      if (editing) {
        body.isAvailable = quantityNumber > 0;
        await updateProduct(editing.id, body);
        Alert.alert("Pronto", "Produto atualizado!");
      } else {
        await createProduct({ ...body, unit: unit.trim() });
        Alert.alert("Pronto", farm ? "Produção cadastrada!" : "Produto publicado!");
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar o produto."));
    } finally {
      setLoading(false);
    }
  }

  const heading = editing
    ? "✏️ Atualizar produto"
    : artisan
    ? "🧵 Cadastrar artesanato"
    : farm
    ? "🌱 Cadastrar produção"
    : "➕ Publicar produto";

  return (
    <Page>
      <Title>{heading}</Title>

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
      {video ? (
        <Text style={{ color: colors.primary }}>🎬 Vídeo novo escolhido ({video.info})</Text>
      ) : (
        <Text style={u.muted}>{editing?.videoUrl ? "Já tem vídeo. Escolha outro para trocar." : "Nenhum vídeo escolhido"}</Text>
      )}
      <View style={u.row}>
        <Btn small kind="outline" label="Escolher vídeo" onPress={() => takeVideo(false)} />
        <Btn small kind="outline" label="Gravar vídeo" onPress={() => takeVideo(true)} />
        {video ? <Btn small kind="danger" label="Remover" onPress={() => setVideo(null)} /> : null}
      </View>

      <Field label="Nome do produto" value={title} onChangeText={setTitle} placeholder={farm ? "Ex: Tomate" : "Ex: Cesto de palha"} />

      <Text style={u.label}>Departamento</Text>
      <View style={u.row}>
        {DEPARTMENTS.map((dep) => (
          <Chip
            key={dep.value}
            label={`${dep.icon} ${dep.label}`}
            active={department === dep.value}
            onPress={() => {
              setDepartment(dep.value);
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

      <Text style={u.label}>Tipo</Text>
      <View style={u.row}>
        {TIPOS.map((t) => (
          <Chip key={t.value} label={t.label} active={tipo === t.value} onPress={() => setTipo(t.value)} />
        ))}
      </View>

      <Field label="Descrição" value={description} onChangeText={setDescription} multiline placeholder="Descreva o produto" />
      <Field label="Preço (FCFA)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Ex: 5000" />
      <Field label="Quantidade disponível" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="Ex: 10" />

      {!editing && (
        <>
          <Field label="Unidade de medida" value={unit} onChangeText={setUnit} placeholder="Ex: unidade, kg, saco" />
          {farm ? (
            <View style={u.row}>
              {FARM_UNITS.map((x) => (
                <Chip key={x} label={x} active={unit === x} onPress={() => setUnit(x)} />
              ))}
            </View>
          ) : null}
        </>
      )}

      {artisan ? (
        <>
          <Field label="Materiais utilizados" value={materials} onChangeText={setMaterials} placeholder="Ex: palha, fibra de palmeira" />
          <Field label="Tamanho" value={size} onChangeText={setSize} placeholder="Ex: 30 cm de altura" />
          <Field label="Cores" value={colors2} onChangeText={setColors2} placeholder="Ex: natural, castanho" />
          <Field label="Peso" value={weight} onChangeText={setWeight} placeholder="Ex: 500 g" />
          <Field label="Tempo necessário para produzir" value={productionTime} onChangeText={setProductionTime} placeholder="Ex: 3 dias" />
        </>
      ) : farm ? (
        <>
          <Field label="Data de colheita (AAAA-MM-DD)" value={harvestDate} onChangeText={setHarvestDate} placeholder="2026-10-14" />
          <Text style={u.label}>Estado do produto</Text>
          <View style={u.row}>
            {ESTADOS_PRODUTO.map((e) => (
              <Chip
                key={e.value}
                label={e.label}
                active={estadoProduto === e.value}
                onPress={() => setEstadoProduto(estadoProduto === e.value ? "" : e.value)}
              />
            ))}
          </View>
        </>
      ) : (
        <>
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
        </>
      )}

      <Field label={farm ? "Localização da produção" : "Localização"} value={location} onChangeText={setLocation} placeholder="Ex: Bafatá" />
      <Field label="Opções de entrega" value={deliveryOptions} onChangeText={setDeliveryOptions} placeholder="Ex: entrego em Bissau / recolha na machamba" />
      <Field label="Condições de venda" value={saleConditions} onChangeText={setSaleConditions} multiline placeholder="Ex: pagamento na entrega" />

      <Btn label={loading ? "A guardar..." : editing ? "Guardar alterações" : farm ? "Cadastrar produção" : "Publicar"} onPress={submit} disabled={loading} />
    </Page>
  );
}
