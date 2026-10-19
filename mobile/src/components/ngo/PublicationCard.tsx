import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { NgoCatalog, labelOf } from "../../utils/ngoCatalog";
import { PUBLICATION_ICON } from "../../constants/ngoContent";
import { formatDate } from "../../constants/market";
import { colors } from "../../theme/colors";

interface Props {
  item: any;
  catalog: NgoCatalog;
  onPress: () => void;
}

export default function PublicationCard({ item: p, catalog, onPress }: Props) {
  const cover = p.imageUrls?.[0];
  const extraPhotos = (p.imageUrls?.length ?? 0) - 1;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden", marginTop: 12 }}
    >
      {cover ? (
        <View>
          <Image source={{ uri: cover }} style={{ width: "100%", height: 150 }} />
          {extraPhotos > 0 ? (
            <View style={{ position: "absolute", right: 8, bottom: 8, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 12 }}>+{extraPhotos} foto(s)</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ padding: 12 }}>
        <View style={u.between}>
          <Badge label={`${PUBLICATION_ICON[p.kind] ?? "📰"} ${labelOf(catalog.publicationKinds, p.kind)}`} color="#6A1B9A" />
          {!p.isPublished ? <Badge label="Rascunho" color="#757575" /> : null}
        </View>

        <Text style={[u.strong, { fontSize: 16, marginTop: 8 }]}>{p.title}</Text>

        <Text style={u.muted}>
          {p.organization?.name ?? "Organização"} {p.organization?.isVerified ? "✅" : ""} · {formatDate(p.createdAt)}
        </Text>

        {p.body ? (
          <Text style={{ marginTop: 6, lineHeight: 20 }} numberOfLines={3}>
            {p.body}
          </Text>
        ) : null}

        {p.videoUrl ? <Text style={[u.muted, { marginTop: 4 }]}>🎬 Tem vídeo</Text> : null}
        {p.projectName ? <Text style={u.muted}>📋 {p.projectName}</Text> : null}
        {p.communityName || p.region ? <Text style={u.muted}>📍 {[p.communityName, p.region].filter(Boolean).join(", ")}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}
