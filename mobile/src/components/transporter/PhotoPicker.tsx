import React, { useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { Btn, u } from "../ui";
import { pickImage, uploadImageBase64 } from "../../utils/storage";
import { getApiErrorMessage } from "../../api/errorMessage";

interface Props {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
  prefix?: string;
}

// Escolher uma foto e enviá-la logo. Devolve o endereço da foto guardada.
export default function PhotoPicker({ label, value, onChange, hint, prefix = "transport-" }: Props) {
  const [busy, setBusy] = useState(false);

  async function choose() {
    const picked = await pickImage(false, [4, 3]);
    if (!picked) return;

    setBusy(true);
    try {
      onChange(await uploadImageBase64(picked.base64, prefix));
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a foto."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ marginTop: 6 }}>
      <Text style={u.label}>{label}</Text>
      {value ? <Image source={{ uri: value }} resizeMode="cover" style={{ width: "100%", height: 170, borderRadius: 8, backgroundColor: "#ECEFF1" }} /> : null}
      <View style={u.row}>
        <Btn small kind="outline" label={busy ? "A enviar..." : value ? "📷 Trocar a foto" : "📷 Tirar ou escolher foto"} onPress={choose} disabled={busy} />
        {value ? <Btn small kind="outline" label="Tirar a foto" onPress={() => onChange(null)} disabled={busy} /> : null}
      </View>
      {hint ? <Text style={u.muted}>{hint}</Text> : null}
    </View>
  );
}
