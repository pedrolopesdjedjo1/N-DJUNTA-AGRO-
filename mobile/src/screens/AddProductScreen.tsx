import React, { useState } from "react";
import { View, Text, Image, Alert, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Page, Card, Field, Chip, Btn, u } from "../components/ui";
import { DEPARTMENTS, departmentOf, ESTADOS, TIPOS } from "../constants/market";
import { pickImage, uploadImageBase64, pickVideo, uploadVideo, PickedVideo } from "../utils/storage";
import { createProduct, updateProduct } from "../api/products";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

function Section({ icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <View style={s.sectionHead}>
        <View style={s.sectionIcon}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

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
  const [location, setLocation] = useState(editing?.location ?? "");
  const [deliveryOptions, setDeliveryOptions] = useState(d.deliveryOptions ?? "");
  const [saleConditions, setSaleConditions] = useState(d.saleConditions ?? "");
  const [imageUri, setImageUri] = useState<string | null>(editing?.imageUrl ?? null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [loading, setLoading] = useState(false);

  const artisan = department === "ARTESANATO";
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
        Alert.alert("Pronto", "Produto publicado!");
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar o produto."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <View style={s.hero}>
        <Text style={s.heroTitle}>{editing ? "Atualizar produto" : artisan ? "Cadastrar artesanato" : "Publicar produto"}</Text>
        <Text style={s.heroSub}>Uma boa foto ajuda a vender mais depressa.</Text>
      </View>

      {/* Foto e vídeo */}
      <Section icon="camera-outline" title="Foto e vídeo">
        <TouchableOpacity activeOpacity={0.85} onPress={() => takeImage(false)} style={s.photoBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.photo} resizeMode="cover" />
          ) : (
            <View style={s.photoEmpty}>
              <Ionicons name="image-outline" size={44} color={colors.muted} />
              <Text style={s.photoHint}>Toque para escolher uma foto</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={u.row}>
          <Btn small kind="outline" label="Galeria" onPress={() => takeImage(false)} />
          <Btn small kind="outline" label="Câmera" onPress={() => takeImage(true)} />
        </View>

        <Text style={[u.label, { marginTop: 14 }]}>Vídeo (até 30 segundos)</Text>
        {video ? (
          <Text style={s.videoOk}>Vídeo novo escolhido ({video.info})</Text>
        ) : (
          <Text style={u.muted}>{editing?.videoUrl ? "Já tem vídeo. Escolha outro para trocar." : "Nenhum vídeo escolhido"}</Text>
        )}
        <View style={u.row}>
          <Btn small kind="outline" label="Escolher vídeo" onPress={() => takeVideo(false)} />
          <Btn small kind="outline" label="Gravar vídeo" onPress={() => takeVideo(true)} />
          {video ? <Btn small kind="danger" label="Remover" onPress={() => setVideo(null)} /> : null}
        </View>
      </Section>

      {/* Dados principais */}
      <Section icon="pricetag-outline" title="Dados do produto">
        <Field label="Nome do produto" value={title} onChangeText={setTitle} placeholder="Ex: Cesto de palha" />

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
              {subcategories.map((sub) => (
                <Chip key={sub} label={sub} active={subcategory === sub} onPress={() => setSubcategory(sub)} />
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
      </Section>

      {/* Preço e stock */}
      <Section icon="cash-outline" title="Preço e quantidade">
        <Field label="Preço (FCFA)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Ex: 5000" />
        <Field label="Quantidade disponível" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="Ex: 10" />
        {!editing && <Field label="Unidade" value={unit} onChangeText={setUnit} placeholder="Ex: unidade, kg, par" />}
      </Section>

      {/* Características */}
      <Section icon="list-outline" title="Características">
        {artisan ? (
          <>
            <Field label="Materiais utilizados" value={materials} onChangeText={setMaterials} placeholder="Ex: palha, fibra de palmeira" />
            <Field label="Tamanho" value={size} onChangeText={setSize} placeholder="Ex: 30 cm de altura" />
            <Field label="Cores" value={colors2} onChangeText={setColors2} placeholder="Ex: natural, castanho" />
            <Field label="Peso" value={weight} onChangeText={setWeight} placeholder="Ex: 500 g" />
            <Field label="Tempo necessário para produzir" value={productionTime} onChangeText={setProductionTime} placeholder="Ex: 3 dias" />
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
      </Section>

      {/* Entrega */}
      <Section icon="car-outline" title="Localização e entrega">
        <Field label="Localização" value={location} onChangeText={setLocation} placeholder="Ex: Bissau" />
        <Field label="Opções de entrega" value={deliveryOptions} onChangeText={setDeliveryOptions} placeholder="Ex: entrego em Bissau / recolha na loja" />
        <Field label="Condições de venda" value={saleConditions} onChangeText={setSaleConditions} multiline placeholder="Ex: pagamento na entrega" />
      </Section>

      <Btn label={loading ? "A guardar..." : editing ? "Guardar alterações" : "Publicar"} kind="gold" onPress={submit} disabled={loading} />
    </Page>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: "900" },
  heroSub: { color: colors.primarySoft, fontSize: 13, marginTop: 4 },
  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  photoBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.cream,
    overflow: "hidden",
    marginBottom: 10,
  },
  photo: { width: "100%", height: 210 },
  photoEmpty: { height: 150, alignItems: "center", justifyContent: "center" },
  photoHint: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },
  videoOk: { color: colors.primary, fontWeight: "700", marginBottom: 4 },
});
