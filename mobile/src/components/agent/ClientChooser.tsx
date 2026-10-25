import React, { useState } from "react";
import { View, Text } from "react-native";
import { Card, Btn, u } from "../ui";
import ClientPicker from "./ClientPicker";

interface Props {
  label?: string;
  linkId: string;
  clientName: string;
  onChange: (linkId: string, name: string) => void;
}

// Escolher (ou tirar) um cliente de uma tarefa ou de uma necessidade
export default function ClientChooser({ label, linkId, clientName, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text style={u.label}>{label ?? "Cliente (opcional)"}</Text>

      {linkId ? (
        <Card>
          <Text style={u.strong}>👤 {clientName || "Cliente escolhido"}</Text>
          <View style={u.row}>
            <Btn small kind="outline" label="Mudar" onPress={() => setOpen(!open)} />
            <Btn small kind="danger" label="Tirar" onPress={() => { onChange("", ""); setOpen(false); }} />
          </View>
        </Card>
      ) : (
        <Btn small kind="outline" label={open ? "Fechar a lista" : "👤 Escolher um cliente"} onPress={() => setOpen(!open)} />
      )}

      {open ? (
        <Card>
          <ClientPicker
            selected={linkId ? [linkId] : []}
            onToggle={(link) => {
              onChange(link.id === linkId ? "" : link.id, link.id === linkId ? "" : link.client.name);
              setOpen(false);
            }}
          />
        </Card>
      ) : null}
    </View>
  );
}
