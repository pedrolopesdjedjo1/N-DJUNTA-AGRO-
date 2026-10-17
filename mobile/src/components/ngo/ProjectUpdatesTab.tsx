import React, { useState } from "react";
import { Text, Alert, View } from "react-native";
import { Card, Btn, Chip, Empty, Field, u } from "../ui";
import ProgressBar from "../ProgressBar";
import { addProjectUpdate, deleteProjectUpdate } from "../../api/ngo";
import { getApiErrorMessage } from "../../api/errorMessage";
import { formatDateTime } from "../../constants/market";

interface Props {
  projectId: string;
  updates: any[];
  onBundle: (bundle: any) => void;
}

const QUICK = ["0", "25", "50", "75", "100"];

export default function ProjectUpdatesTab({ projectId, updates, onBundle }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [progress, setProgress] = useState("");
  const [saving, setSaving] = useState(false);

  async function publish() {
    if (title.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o título da atualização.");
      return;
    }

    let value: number | undefined;
    if (progress.trim()) {
      value = parseInt(progress, 10);
      if (isNaN(value) || value < 0 || value > 100) {
        Alert.alert("Atenção", "O progresso deve ser de 0 a 100.");
        return;
      }
    }

    setSaving(true);
    try {
      const bundle = await addProjectUpdate(projectId, {
        title: title.trim(),
        body: body.trim() || undefined,
        progress: value,
      });
      onBundle(bundle);
      setTitle("");
      setBody("");
      setProgress("");
      setOpen(false);
      Alert.alert("Publicada", "As pessoas apoiadas que têm conta no app foram avisadas.");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível publicar a atualização."));
    } finally {
      setSaving(false);
    }
  }

  function remove(update: any) {
    Alert.alert("Apagar atualização", `Apagar "${update.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            onBundle(await deleteProjectUpdate(projectId, update.id));
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <View>
      <Btn label={open ? "Fechar formulário" : "➕ Publicar atualização"} onPress={() => setOpen(!open)} />

      {open ? (
        <Card>
          <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: Entregámos as sementes em Sonaco" />
          <Field label="O que aconteceu (opcional)" value={body} onChangeText={setBody} multiline />

          <Text style={u.label}>Progresso do projeto (opcional)</Text>
          <View style={u.row}>
            {QUICK.map((q) => (
              <Chip key={q} label={`${q}%`} active={progress === q} onPress={() => setProgress(progress === q ? "" : q)} />
            ))}
          </View>
          <Field
            label="Ou escreva um número de 0 a 100"
            value={progress}
            onChangeText={(v) => setProgress(v.replace(/\D/g, "").slice(0, 3))}
            keyboardType="numeric"
          />

          <Text style={u.muted}>As pessoas apoiadas por este projeto que têm conta no app recebem um aviso.</Text>
          <Btn label={saving ? "A publicar..." : "Publicar"} onPress={publish} disabled={saving} />
        </Card>
      ) : null}

      {updates.length === 0 ? (
        <Empty text="Ainda não publicou atualizações deste projeto." />
      ) : (
        updates.map((x) => (
          <Card key={x.id}>
            <Text style={u.strong}>{x.title}</Text>
            <Text style={u.muted}>{formatDateTime(x.createdAt)}</Text>
            {x.progress !== null && x.progress !== undefined ? (
              <View>
                <Text style={[u.muted, { marginTop: 4 }]}>Progresso: {x.progress}%</Text>
                <ProgressBar percent={x.progress} />
              </View>
            ) : null}
            {x.body ? <Text style={{ marginTop: 8, lineHeight: 21 }}>{x.body}</Text> : null}
            <Btn small kind="danger" label="Apagar" onPress={() => remove(x)} />
          </Card>
        ))
      )}
    </View>
  );
}
