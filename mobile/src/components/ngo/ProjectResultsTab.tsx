import React, { useState } from "react";
import { Text, Alert, View } from "react-native";
import { Card, Btn, Empty, Field, u } from "../ui";
import ChipGroup from "../ChipGroup";
import { addProjectResult, deleteProjectResult } from "../../api/ngo";
import { getApiErrorMessage } from "../../api/errorMessage";
import { useNgoCatalog } from "../../utils/ngoCatalog";
import { dateToIso, isDateText, todayText } from "../../utils/dates";
import { formatNumber } from "../../utils/format";
import { formatDate } from "../../constants/market";
import { colors } from "../../theme/colors";

interface Props {
  projectId: string;
  results: any[];
  onBundle: (bundle: any) => void;
}

export default function ProjectResultsTab({ projectId, results, onBundle }: Props) {
  const catalog = useNgoCatalog();
  const [open, setOpen] = useState(false);
  const [indicator, setIndicator] = useState("PRODUCAO_KG");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayText());
  const [saving, setSaving] = useState(false);

  const defaultUnit = catalog.resultIndicators.find((i) => i.value === indicator)?.unit ?? "";

  // Soma por tipo de resultado
  const totals = Array.from(
    results
      .reduce((map, r) => {
        const key = r.indicator === "OUTRO" ? `OUTRO:${r.label}` : r.indicator;
        const row = map.get(key) ?? { label: r.indicatorLabel, unit: r.unit ?? "", value: 0 };
        row.value += r.value;
        map.set(key, row);
        return map;
      }, new Map<string, { label: string; unit: string; value: number }>())
      .values()
  );

  async function save() {
    const number = Number(value.replace(",", "."));
    if (!value.trim() || isNaN(number) || number < 0) {
      Alert.alert("Atenção", "Escreva o valor do resultado (um número).");
      return;
    }
    if (indicator === "OUTRO" && !label.trim()) {
      Alert.alert("Atenção", "Escreva o nome do resultado.");
      return;
    }
    if (!isDateText(date.trim())) {
      Alert.alert("Atenção", "A data deve ser assim: AAAA-MM-DD (ex: 2026-11-20).");
      return;
    }

    setSaving(true);
    try {
      const bundle = await addProjectResult(projectId, {
        indicator,
        label: indicator === "OUTRO" ? label.trim() : undefined,
        value: number,
        unit: unit.trim() || undefined,
        note: note.trim() || undefined,
        recordedAt: dateToIso(date.trim()),
      });
      onBundle(bundle);
      setValue("");
      setLabel("");
      setUnit("");
      setNote("");
      setOpen(false);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o resultado."));
    } finally {
      setSaving(false);
    }
  }

  function remove(result: any) {
    Alert.alert("Apagar resultado", `Apagar "${result.indicatorLabel}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            onBundle(await deleteProjectResult(projectId, result.id));
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <View>
      <Btn label={open ? "Fechar formulário" : "➕ Registar resultado"} onPress={() => setOpen(!open)} />

      {open ? (
        <Card>
          <ChipGroup label="Tipo de resultado" options={catalog.resultIndicators} value={indicator} onChange={setIndicator} />

          {indicator === "OUTRO" ? <Field label="Nome do resultado" value={label} onChangeText={setLabel} placeholder="Ex: Poços construídos" /> : null}

          <Field label="Valor" value={value} onChangeText={setValue} keyboardType="numeric" placeholder="Ex: 1200" />
          <Field
            label={`Unidade${defaultUnit ? ` (por defeito: ${defaultUnit})` : ""}`}
            value={unit}
            onChangeText={setUnit}
            placeholder={defaultUnit || "Ex: unidades"}
          />
          <Field label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} />
          <Field label="Nota (opcional)" value={note} onChangeText={setNote} multiline placeholder="Como mediu este resultado" />

          <Btn label={saving ? "A guardar..." : "Guardar resultado"} onPress={save} disabled={saving} />
        </Card>
      ) : null}

      {totals.length > 0 ? (
        <Card>
          <Text style={u.strong}>Total alcançado</Text>
          {totals.map((t) => (
            <View key={`${t.label}-${t.unit}`} style={[u.between, { marginTop: 6 }]}>
              <Text style={{ flex: 1, marginRight: 8 }}>{t.label}</Text>
              <Text style={{ fontWeight: "bold", color: colors.primary }}>
                {formatNumber(t.value)} {t.unit}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {results.length === 0 ? (
        <Empty text="Ainda não registou resultados deste projeto." />
      ) : (
        results.map((r) => (
          <Card key={r.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{r.indicatorLabel}</Text>
              <Text style={{ fontWeight: "bold" }}>
                {formatNumber(r.value)} {r.unit ?? ""}
              </Text>
            </View>
            <Text style={u.muted}>{formatDate(r.recordedAt)}</Text>
            {r.note ? <Text style={{ marginTop: 4 }}>{r.note}</Text> : null}
            <Btn small kind="danger" label="Apagar" onPress={() => remove(r)} />
          </Card>
        ))
      )}
    </View>
  );
}
