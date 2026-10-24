import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Empty, Field, useLoader, u } from "../ui";
import { listAgentClients } from "../../api/agent";
import { ROLE_ICON, ROLE_NAME } from "../../constants/agent";
import { colors } from "../../theme/colors";

interface Props {
  selected: string[];
  onToggle: (link: any) => void;
  filter?: (link: any) => boolean;
  emptyText?: string;
}

const EMPTY = { counts: {}, byKind: {}, items: [] as any[] };

// Lista dos clientes ativos do agente, para escolher um ou vários
export default function ClientPicker({ selected, onToggle, filter, emptyText }: Props) {
  const [text, setText] = useState("");
  const loader = useLoader(() => listAgentClients({ status: "ATIVO" }), EMPTY);

  const needle = text.trim().toLowerCase();
  const items = (loader.data.items as any[])
    .filter((c) => (filter ? filter(c) : true))
    .filter((c) => !needle || `${c.client.name} ${c.client.location ?? ""}`.toLowerCase().includes(needle));

  return (
    <View>
      <Field placeholder="Procurar cliente" value={text} onChangeText={setText} />

      {loader.loading && items.length === 0 ? <Text style={u.muted}>A carregar...</Text> : null}
      {!loader.loading && items.length === 0 ? <Empty text={emptyText ?? "Não tem clientes ativos para escolher."} /> : null}

      {items.map((c) => {
        const on = selected.includes(c.id);
        return (
          <TouchableOpacity
            key={c.id}
            activeOpacity={0.8}
            onPress={() => onToggle(c)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: on ? colors.primary : colors.border,
              backgroundColor: on ? "rgba(46,125,50,0.08)" : "transparent",
              borderRadius: 10,
              padding: 10,
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 22, marginRight: 10 }}>{ROLE_ICON[c.client.role] ?? "👤"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={u.strong}>{c.client.name}</Text>
              <Text style={u.muted}>
                {ROLE_NAME[c.client.role] ?? c.client.role}
                {c.client.location ? ` · 📍 ${c.client.location}` : ""}
              </Text>
            </View>
            <Text style={{ fontSize: 20 }}>{on ? "✅" : "⬜"}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
