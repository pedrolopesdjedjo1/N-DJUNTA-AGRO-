import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../api/client";
import { colors } from "../theme/colors";
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from "../config/supabase";

const CATEGORIES = ["AGRICOLA", "PESCA", "ARTESANATO", "OUTRO"];

export default function AddProductScreen({ navigation }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("AGRICOLA");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão", "Permita o acesso à galeria para escolher uma foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão", "Permita o acesso à câmera para tirar uma foto.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const fileName = `${Date.now()}-${Math.floor(Math.random() * 100000)}.jpg`;
    const fileResponse = await fetch(uri);
    const blob = await fileResponse.blob();

    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "image/jpeg",
        },
        body: blob,
      }
    );

    if (!uploadResponse.ok) {
      let detail = "";
      try {
        detail = await uploadResponse.text();
      } catch (e) {}
      throw new Error(`Falha ao enviar a foto (${uploadResponse.status}). ${detail}`);
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
  };

  const handleSubmit = async () => {
    if (!title || !price || !unit || !quantity) {
      Alert.alert("Erro", "Preencha nome, preço, unidade e quantidade.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }

      await api.post("/api/products", {
        title,
        description: description || undefined,
        category,
        price: parseFloat(price.replace(",", ".")),
        unit,
        quantity: parseInt(quantity, 10),
        location: location || undefined,
        imageUrl,
      });

      Alert.alert("Sucesso", "Produto cadastrado!");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        "Erro",
        err?.response?.data?.error ||
          err?.message ||
          "Não foi possível cadastrar o produto."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cadastrar Produto</Text>

      <Text style={styles.label}>Foto do produto</Text>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <View style={styles.previewEmpty}>
          <Text style={styles.previewEmptyText}>Nenhuma foto escolhida</Text>
        </View>
      )}
      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.photoButton} onPress={pickFromGallery}>
          <Text style={styles.photoButtonText}>Galeria</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
          <Text style={styles.photoButtonText}>Câmera</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Nome do produto</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Ex: Arroz"
      />

      <Text style={styles.label}>Descrição (opcional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Ex: Arroz da safra nova"
        multiline
      />

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, category === c && styles.chipActive]}
            onPress={() => setCategory(c)}
          >
            <Text
              style={[styles.chipText, category === c && styles.chipTextActive]}
            >
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Preço (FCFA)</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        placeholder="Ex: 500"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Unidade</Text>
      <TextInput
        style={styles.input}
        value={unit}
        onChangeText={setUnit}
        placeholder="Ex: kg, saco, litro"
      />

      <Text style={styles.label}>Quantidade</Text>
      <TextInput
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
        placeholder="Ex: 50"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Localização (opcional)</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="Ex: Bissau"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Salvando..." : "Cadastrar"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background ?? "#fff" },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 20,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  preview: { width: "100%", height: 200, borderRadius: 8 },
  previewEmpty: {
    width: "100%",
    height: 140,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  previewEmptyText: { color: "#888" },
  photoRow: { flexDirection: "row", marginTop: 10 },
  photoButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginRight: 8,
  },
  photoButtonText: { color: colors.primary, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: "#333", fontSize: 13 },
  chipTextActive: { color: colors.white, fontWeight: "600" },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
});
