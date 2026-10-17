import React, { useState } from "react";
import { View, Text, Image, Modal, TouchableOpacity, Linking, useWindowDimensions } from "react-native";
import { Btn, u } from "../ui";
import { colors } from "../../theme/colors";

interface Props {
  media: any[];
  onDelete?: (item: any) => void;
}

// Fotos e vídeos em duas colunas. A foto abre em tela cheia e o vídeo abre no leitor do telefone.
export default function MediaGallery({ media, onDelete }: Props) {
  const { width } = useWindowDimensions();
  const size = Math.floor((width - 32 - 10) / 2);
  const [viewing, setViewing] = useState<any | null>(null);

  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 8 }}>
        {media.map((m) => (
          <View key={m.id} style={{ width: size, marginBottom: 12 }}>
            {m.kind === "VIDEO" ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => Linking.openURL(m.url)}
                style={{
                  width: size,
                  height: size,
                  borderRadius: 10,
                  backgroundColor: "#263238",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 34 }}>🎬</Text>
                <Text style={{ color: "#FFFFFF", marginTop: 4 }}>Ver vídeo</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.85} onPress={() => setViewing(m)}>
                <Image source={{ uri: m.url }} style={{ width: size, height: size, borderRadius: 10 }} />
              </TouchableOpacity>
            )}

            {m.caption ? (
              <Text style={[u.muted, { marginTop: 4 }]} numberOfLines={2}>
                {m.caption}
              </Text>
            ) : null}

            {onDelete ? <Btn small kind="danger" label="Apagar" onPress={() => onDelete(m)} /> : null}
          </View>
        ))}
      </View>

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", padding: 12 }}>
          {viewing ? <Image source={{ uri: viewing.url }} style={{ width: "100%", height: "75%" }} resizeMode="contain" /> : null}
          {viewing?.caption ? <Text style={{ color: "#FFFFFF", textAlign: "center", marginTop: 8 }}>{viewing.caption}</Text> : null}
          <View style={{ marginTop: 12 }}>
            <Btn kind="outline" label="Fechar" onPress={() => setViewing(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
