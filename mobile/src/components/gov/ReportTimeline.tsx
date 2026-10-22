import React from "react";
import { View, Text } from "react-native";
import { u } from "../ui";
import { REPORT_STATUS_COLOR } from "../../constants/gov";
import { GovCatalog } from "../../utils/govCatalog";
import { labelOf } from "../../utils/ngoCatalog";
import { formatDateTime } from "../../constants/market";
import { colors } from "../../theme/colors";

const KIND_COLOR: Record<string, string> = {
  CRIADO: "#F9A825",
  CIDADAO: "#00838F",
  RESPOSTA: "#1565C0",
  ENCAMINHADO: "#6A1B9A",
  NOTA_INTERNA: "#F9A825",
  PRIORIDADE: "#757575",
};

export function eventTitle(e: any, catalog: GovCatalog): string {
  switch (e.kind) {
    case "CRIADO":
      return "Pedido enviado";
    case "CIDADAO":
      return "Informação juntada pelo cidadão";
    case "ESTADO":
      return `Estado: ${labelOf(catalog.reportStatus, e.status)}`;
    case "RESPOSTA":
      return "Resposta da instituição";
    case "ENCAMINHADO":
      return "Encaminhado para outra instituição";
    case "NOTA_INTERNA":
      return "Nota interna";
    case "PRIORIDADE":
      return "Prioridade";
    default:
      return "Atualização";
  }
}

interface Props {
  events: any[];
  catalog: GovCatalog;
}

// Linha do tempo de um pedido: o que aconteceu, quando e quem fez
export default function ReportTimeline({ events, catalog }: Props) {
  return (
    <View>
      {events.map((e, i) => {
        const color = e.isInternal
          ? "#F9A825"
          : e.status
          ? REPORT_STATUS_COLOR[e.status] ?? "#757575"
          : KIND_COLOR[e.kind] ?? "#757575";
        const last = i === events.length - 1;

        return (
          <View key={e.id ?? `${e.kind}-${i}`} style={{ flexDirection: "row" }}>
            <View style={{ alignItems: "center", width: 22 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, marginTop: 4 }} />
              {!last ? <View style={{ flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 }} /> : null}
            </View>

            <View style={{ flex: 1, paddingBottom: 14 }}>
              <Text style={u.strong}>{eventTitle(e, catalog)}</Text>
              <Text style={u.muted}>
                {e.authorName ? `${e.authorName} · ` : ""}
                {formatDateTime(e.createdAt)}
              </Text>
              {e.message ? <Text style={{ marginTop: 4, lineHeight: 20 }}>{e.message}</Text> : null}
              {e.isInternal ? <Text style={[u.muted, { marginTop: 2 }]}>🔒 Só as instituições veem</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
