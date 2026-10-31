import React, { useEffect, useState } from "react";
import { View, Alert } from "react-native";
import { Btn, Chip, Field, u } from "../ui";
import { periodStarts } from "../../constants/agentWork";
import { isDateText, todayText } from "../../utils/dates";

interface Props {
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
  // Se indicado, aparece uma opção que limpa o período (por exemplo "Tudo")
  emptyLabel?: string;
}

// Escolher um período: atalhos (7 dias, 30 dias, este mês, este ano) ou datas à mão
export default function DateRangeBar({ from, to, onApply, emptyLabel }: Props) {
  const [fromText, setFromText] = useState(from);
  const [toText, setToText] = useState(to);
  const starts = periodStarts();

  useEffect(() => {
    setFromText(from);
    setToText(to);
  }, [from, to]);

  const quick: [string, string][] = [
    ["Últimos 7 dias", todayText(-6)],
    ["Últimos 30 dias", todayText(-29)],
    ["Este mês", starts.month],
    ["Este ano", starts.year],
  ];

  function set(f: string, t: string) {
    setFromText(f);
    setToText(t);
    onApply(f, t);
  }

  function apply() {
    if ((fromText.trim() && !isDateText(fromText.trim())) || (toText.trim() && !isDateText(toText.trim()))) {
      Alert.alert("Atenção", "Escreva as datas assim: AAAA-MM-DD (ex: 2026-10-01).");
      return;
    }
    onApply(fromText.trim(), toText.trim());
  }

  return (
    <View>
      <View style={u.row}>
        {emptyLabel ? <Chip label={emptyLabel} active={!from && !to} onPress={() => set("", "")} /> : null}
        {quick.map(([label, start]) => (
          <Chip key={label} label={label} active={from === start && !to} onPress={() => set(start, "")} />
        ))}
      </View>
      <View style={u.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Field label="De (AAAA-MM-DD)" value={fromText} onChangeText={setFromText} placeholder="2026-10-01" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Até (AAAA-MM-DD)" value={toText} onChangeText={setToText} placeholder="2026-10-31" />
        </View>
      </View>
      <Btn small kind="outline" label="Aplicar datas" onPress={apply} />
    </View>
  );
}
