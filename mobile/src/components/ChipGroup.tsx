import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Chip, u } from "./ui";

interface Props {
  label?: string;
  options: { value: string; label: string; icon?: string }[];
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  scroll?: boolean;
}

// Grupo de botões de escolha (uma só opção)
export default function ChipGroup({ label, options, value, onChange, allowEmpty, emptyLabel = "Todos", scroll }: Props) {
  const chips = (
    <>
      {allowEmpty ? <Chip label={emptyLabel} active={value === ""} onPress={() => onChange("")} /> : null}
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.icon ? `${o.icon} ${o.label}` : o.label}
          active={value === o.value}
          onPress={() => onChange(allowEmpty && value === o.value ? "" : o.value)}
        />
      ))}
    </>
  );

  return (
    <View>
      {label ? <Text style={u.label}>{label}</Text> : null}
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {chips}
        </ScrollView>
      ) : (
        <View style={u.row}>{chips}</View>
      )}
    </View>
  );
}
