import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import {
  getManagedTraining,
  updateTraining,
  cancelTraining,
  deleteTraining,
  addParticipant,
  updateParticipant,
  completeAttendees,
  removeParticipant,
  addTrainingMaterial,
  deleteTrainingMaterial,
  discoverPeople,
} from "../api/ngo";
import { pickImage, uploadImageBase64, pickVideo, uploadVideo } from "../utils/storage";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { ENROLL_STATUS_COLOR, colorOf } from "../constants/ngo";
import { MATERIAL_ICON, MATERIAL_KINDS, PEOPLE_KINDS, TRAINING_STATE, trainingState, whenText } from "../constants/training";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const PHONE = /^[+\d][\d\s-]{5,19}$/;

export default function NgoTrainingScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useNgoCatalog();

  const loader = useLoader(() => getManagedTraining(id), null as any, [id]);
  const d: any = loader.data;

  const [busy, setBusy] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [addMode, setAddMode] = useState<"" | "manual" | "app">("");
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [searchKind, setSearchKind] = useState("AGRICULTORES");
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [matOpen, setMatOpen] = useState(false);
  const [matKind, setMatKind] = useState("DOCUMENTO");
  const [matTitle, setMatTitle] = useState("");
  const [matUrl, setMatUrl] = useState("");
  const [matFile, setMatFile] = useState("");
  const [matBusy, setMatBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>Formação</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const t = d.training;
  const participants: any[] = d.participants;
  const materials: any[] = d.materials;
  const state = trainingState(t);
  const stateInfo = TRAINING_STATE[state];
  const cancelled = t.status === "CANCELADA";
  const inApp = new Set(participants.map((p) => p.userId).filter(Boolean));
  const waiting = participants.filter((p) => p.status === "INSCRITO");
  const present = participants.filter((p) => p.status === "PRESENTE");
  const spotsFull = !!t.capacity && d.counts.enrolled >= t.capacity;

  async function run(work: () => Promise<any>, fail: string, ok?: string) {
    setBusy(true);
    try {
      await work();
      if (ok) Alert.alert("Pronto", ok);
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function setStatus(p: any, status: string) {
    const go = () => run(() => updateParticipant(id, p.id, status), "Não foi possível mudar o estado.");

    if (status === "CONCLUIDO") {
      Alert.alert("Concluir e dar certificado", `${p.name} recebe o certificado desta formação.`, [
        { text: "Não", style: "cancel" },
        { text: "Sim", onPress: go },
      ]);
    } else if (p.status === "CONCLUIDO") {
      Alert.alert("Anular o certificado", `O certificado de ${p.name} deixa de existir.`, [
        { text: "Não", style: "cancel" },
        { text: "Anular", style: "destructive", onPress: go },
      ]);
    } else {
      go();
    }
  }

  function markAllPresent() {
    Alert.alert("Marcar presenças", `Marcar ${waiting.length} inscrito(s) como presentes?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Sim",
        onPress: async () => {
          setBusy(true);
          let failed = 0;
          for (const p of waiting) {
            try {
              await updateParticipant(id, p.id, "PRESENTE");
            } catch (e) {
              failed += 1;
            }
          }
          setBusy(false);
          loader.reload();
          if (failed > 0) Alert.alert("Atenção", `${failed} participante(s) não ficaram marcados. Tente de novo.`);
        },
      },
    ]);
  }

  function completeAll() {
    Alert.alert(
      "Concluir a formação",
      `Os ${present.length} presente(s) ficam como concluídos, recebem o certificado e a formação passa a Concluída. Continuar?`,
      [
        { text: "Não", style: "cancel" },
        {
          text: "Concluir",
          onPress: () =>
            run(async () => {
              const r = await completeAttendees(id);
              Alert.alert("Certificados emitidos", `${r.completed} participante(s) concluíram a formação.`);
            }, "Não foi possível concluir a formação."),
        },
      ]
    );
  }

  function reopen() {
    run(() => updateTraining(id, { status: "ABERTA" }), "Não foi possível reabrir a formação.");
  }

  function confirmCancel() {
    Alert.alert("Cancelar a formação", "As pessoas inscritas que têm conta no app são avisadas. Cancelar?", [
      { text: "Não", style: "cancel" },
      {
        text: "Cancelar formação",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            const r = await cancelTraining(id, cancelReason.trim() || undefined);
            setCancelOpen(false);
            setCancelReason("");
            Alert.alert("Formação cancelada", `${r.notified} pessoa(s) avisada(s).`);
            loader.reload();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível cancelar."));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  function removeTraining() {
    Alert.alert("Apagar formação", "Só se pode apagar uma formação sem participantes. Apagar?", [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTraining(id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  async function addManual() {
    if (pName.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o nome do participante.");
      return;
    }
    if (pPhone.trim() && !PHONE.test(pPhone.trim())) {
      Alert.alert("Atenção", "Telefone inválido.");
      return;
    }
    await run(() => addParticipant(id, { name: pName.trim(), phone: pPhone.trim() || undefined }), "Não foi possível inscrever.");
    setPName("");
    setPPhone("");
  }

  async function searchPeople() {
    setSearching(true);
    try {
      const r = await discoverPeople({ kind: searchKind, q: searchText.trim() });
      setResults(r.items.slice(0, 15));
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível procurar."));
    } finally {
      setSearching(false);
    }
  }

  async function addFromApp(person: any) {
    await run(() => addParticipant(id, { userId: person.id }), "Não foi possível inscrever.");
  }

  function removeEnrollment(p: any) {
    Alert.alert("Tirar participante", `Tirar "${p.name}" da formação?`, [
      { text: "Não", style: "cancel" },
      { text: "Tirar", style: "destructive", onPress: () => run(() => removeParticipant(id, p.id), "Não foi possível tirar.") },
    ]);
  }

  async function pickFile(fromCamera: boolean) {
    setMatBusy(true);
    try {
      if (matKind === "VIDEO") {
        const video = await pickVideo(fromCamera);
        if (video) {
          setMatUrl(await uploadVideo(video.uri, video.mime));
          setMatFile("Vídeo enviado ✔️");
        }
      } else {
        const image = await pickImage(fromCamera);
        if (image) {
          setMatUrl(await uploadImageBase64(image.base64, "formacao-"));
          setMatFile("Foto enviada ✔️");
        }
      }
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar o ficheiro."));
    } finally {
      setMatBusy(false);
    }
  }

  function changeMatKind(value: string) {
    setMatKind(value);
    setMatUrl("");
    setMatFile("");
  }

  async function saveMaterial() {
    if (!matTitle.trim()) {
      Alert.alert("Atenção", "Escreva o título do material.");
      return;
    }
    if (!matUrl.trim()) {
      Alert.alert("Atenção", matKind === "LINK" ? "Escreva o endereço (https://...)." : "Escolha o ficheiro primeiro.");
      return;
    }
    if (matKind !== "DOCUMENTO" && !/^https:\/\/\S+$/i.test(matUrl.trim())) {
      Alert.alert("Atenção", "O endereço deve começar por https://");
      return;
    }

    await run(
      () => addTrainingMaterial(id, { kind: matKind, title: matTitle.trim(), url: matUrl.trim() }),
      "Não foi possível guardar o material."
    );
    setMatTitle("");
    setMatUrl("");
    setMatFile("");
    setMatOpen(false);
  }

  function removeMaterial(m: any) {
    Alert.alert("Apagar material", `Apagar "${m.title}"?`, [
      { text: "Não", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => run(() => deleteTrainingMaterial(id, m.id), "Não foi possível apagar.") },
    ]);
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>{t.title}</Title>
        </View>
        <Badge label={stateInfo.label} color={stateInfo.color} />
      </View>

      <Card>
        <Text style={u.muted}>
          {labelOf(catalog.trainingKinds, t.kind)}
          {t.area ? ` · ${labelOf(catalog.areas, t.area)}` : ""}
          {t.hours ? ` · ${t.hours} horas` : ""}
        </Text>
        <Text style={{ marginTop: 4 }}>🕒 {whenText(t)}</Text>
        <Text style={u.muted}>{t.isOnline ? "💻 Formação online" : `📍 ${t.location ?? "—"}${t.region ? `, ${t.region}` : ""}`}</Text>
        {t.isOnline && t.onlineLink ? (
          <Btn small kind="outline" label="🔗 Abrir a sessão online" onPress={() => Linking.openURL(t.onlineLink)} />
        ) : null}
        <Text style={u.muted}>
          👥 {d.counts.enrolled} inscrito(s){t.capacity ? ` de ${t.capacity} vagas` : ""}
        </Text>
        {t.description ? <Text style={{ marginTop: 8, lineHeight: 21 }}>{t.description}</Text> : null}

        {!cancelled ? (
          <View style={u.row}>
            <Btn small label="✏️ Editar" onPress={() => navigation.navigate("NgoTrainingForm", { training: t })} />
            {t.status === "CONCLUIDA" ? <Btn small kind="outline" label="Reabrir inscrições" onPress={reopen} disabled={busy} /> : null}
          </View>
        ) : null}
      </Card>

      {cancelled ? (
        <Card>
          <Text style={{ color: "#C62828", fontWeight: "bold" }}>Esta formação foi cancelada.</Text>
        </Card>
      ) : null}

      {state === "POR_CONCLUIR" ? (
        <Card>
          <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>A formação já terminou.</Text>
          <Text style={u.muted}>Marque quem esteve presente e conclua para emitir os certificados.</Text>
        </Card>
      ) : null}

      <SubTitle>Participantes</SubTitle>
      <View style={u.grid}>
        {(
          [
            ["📝 Inscritos", d.counts.enrolled],
            ["✅ Presentes", d.counts.present],
            ["🎓 Concluíram", d.counts.concluded],
          ] as [string, number][]
        ).map(([label, value]) => (
          <View key={label} style={u.tile}>
            <View style={u.tileBox}>
              <Text style={u.tileValue}>{value}</Text>
              <Text style={u.tileLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>

      {!cancelled ? (
        <>
          <View style={u.row}>
            {waiting.length > 0 ? <Btn small label={`✅ Marcar ${waiting.length} como presentes`} onPress={markAllPresent} disabled={busy} /> : null}
            {present.length > 0 ? <Btn small kind="outline" label="🎓 Concluir e emitir certificados" onPress={completeAll} disabled={busy} /> : null}
          </View>

          <View style={u.row}>
            <Chip label="➕ Pessoa sem conta no app" active={addMode === "manual"} onPress={() => setAddMode(addMode === "manual" ? "" : "manual")} />
            <Chip label="🔎 Pessoa do app" active={addMode === "app"} onPress={() => setAddMode(addMode === "app" ? "" : "app")} />
          </View>
          {spotsFull && addMode ? <Text style={{ color: "#C62828" }}>As vagas estão cheias.</Text> : null}
        </>
      ) : null}

      {addMode === "manual" ? (
        <Card>
          <Field label="Nome" value={pName} onChangeText={setPName} />
          <Field label="Telefone (opcional)" value={pPhone} onChangeText={setPPhone} keyboardType="phone-pad" />
          <Btn label={busy ? "A inscrever..." : "Inscrever"} onPress={addManual} disabled={busy} />
        </Card>
      ) : null}

      {addMode === "app" ? (
        <Card>
          <View style={u.row}>
            {PEOPLE_KINDS.map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                active={searchKind === value}
                onPress={() => {
                  setSearchKind(value);
                  setResults(null);
                }}
              />
            ))}
          </View>
          <Field
            placeholder="Nome da pessoa"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={searchPeople}
            returnKeyType="search"
          />
          <Btn small label={searching ? "A procurar..." : "🔎 Procurar"} onPress={searchPeople} disabled={searching} />

          {results !== null && results.length === 0 ? <Text style={[u.muted, { marginTop: 8 }]}>Nenhuma pessoa encontrada.</Text> : null}
          {(results ?? []).map((person) => (
            <View key={person.id} style={{ marginTop: 10 }}>
              <Text style={u.strong}>
                {person.name} {person.isVerified ? "✅" : ""}
              </Text>
              {person.location ? <Text style={u.muted}>📍 {person.location}</Text> : null}
              {inApp.has(person.id) ? (
                <Text style={u.muted}>Já está inscrita.</Text>
              ) : (
                <Btn small kind="outline" label="Inscrever" onPress={() => addFromApp(person)} disabled={busy} />
              )}
            </View>
          ))}
        </Card>
      ) : null}

      {participants.length === 0 ? (
        <Empty text="Ainda não há inscritos. As pessoas inscrevem-se no app, ou pode inscrevê-las aqui." />
      ) : (
        participants.map((p) => (
          <Card key={p.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.name}</Text>
              <Badge label={labelOf(catalog.enrollStatus, p.status)} color={colorOf(ENROLL_STATUS_COLOR, p.status)} />
            </View>
            <Text style={u.muted}>
              {p.inApp ? "✅ Tem conta no app" : "Sem conta no app"}
              {p.location ? ` · 📍 ${p.location}` : ""}
            </Text>
            {p.certificateCode ? (
              <Text style={u.muted}>
                🎓 Certificado {p.certificateCode}
                {p.certifiedAt ? ` · ${formatDate(p.certifiedAt)}` : ""}
              </Text>
            ) : null}

            {!cancelled ? (
              <View style={u.row}>
                {p.status === "INSCRITO" ? <Btn small label="✅ Presente" onPress={() => setStatus(p, "PRESENTE")} disabled={busy} /> : null}
                {p.status === "FALTOU" ? <Btn small label="✅ Presente" onPress={() => setStatus(p, "PRESENTE")} disabled={busy} /> : null}
                {p.status === "PRESENTE" ? <Btn small label="🎓 Concluído" onPress={() => setStatus(p, "CONCLUIDO")} disabled={busy} /> : null}
                {p.status === "INSCRITO" || p.status === "PRESENTE" ? (
                  <Btn small kind="outline" label="Faltou" onPress={() => setStatus(p, "FALTOU")} disabled={busy} />
                ) : null}
                {p.status === "CONCLUIDO" ? (
                  <>
                    <Btn small label="🎓 Ver certificado" onPress={() => navigation.navigate("NgoCertificate", { enrollmentId: p.id })} />
                    <Btn small kind="outline" label="Anular certificado" onPress={() => setStatus(p, "PRESENTE")} disabled={busy} />
                  </>
                ) : null}
              </View>
            ) : null}

            <View style={u.row}>
              {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
              {p.userId ? <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: p.userId, userName: p.name })} /> : null}
              <Btn small kind="danger" label="Tirar" onPress={() => removeEnrollment(p)} disabled={busy} />
            </View>
          </Card>
        ))
      )}

      <SubTitle>Materiais educativos e vídeos</SubTitle>
      <Text style={u.muted}>Só quem se inscreveu vê os materiais.</Text>
      <View style={u.row}>
        <Btn small label={matOpen ? "Fechar" : "➕ Juntar material"} onPress={() => setMatOpen(!matOpen)} />
        <Btn small kind="outline" label="📚 Conteúdos de Aprender" onPress={() => navigation.navigate("Learning")} />
      </View>

      {matOpen ? (
        <Card>
          <ChipGroup label="Tipo de material" options={MATERIAL_KINDS} value={matKind} onChange={changeMatKind} />
          <Field label="Título" value={matTitle} onChangeText={setMatTitle} placeholder="Ex: Guia de conservação do pescado" />

          {matKind !== "LINK" ? (
            <>
              <View style={u.row}>
                <Btn small kind="outline" label={matKind === "VIDEO" ? "🎞️ Vídeo da galeria" : "📷 Foto da galeria"} onPress={() => pickFile(false)} disabled={matBusy} />
                <Btn small kind="outline" label={matKind === "VIDEO" ? "🎥 Gravar vídeo" : "📸 Tirar foto"} onPress={() => pickFile(true)} disabled={matBusy} />
              </View>
              {matBusy ? <Text style={u.muted}>A enviar o ficheiro...</Text> : null}
              {matFile ? <Text style={{ color: "#2E7D32", marginTop: 4 }}>{matFile}</Text> : null}
            </>
          ) : null}

          {matKind !== "DOCUMENTO" ? (
            <Field
              label={matKind === "VIDEO" ? "Ou o endereço do vídeo (https://...)" : "Endereço (https://...)"}
              value={matFile ? "" : matUrl}
              onChangeText={(v) => {
                setMatFile("");
                setMatUrl(v);
              }}
              autoCapitalize="none"
              placeholder="https://..."
            />
          ) : null}

          <Btn label={busy ? "A guardar..." : "Guardar material"} onPress={saveMaterial} disabled={busy || matBusy} />
        </Card>
      ) : null}

      {materials.length === 0 ? (
        <Empty text="Ainda não juntou materiais." />
      ) : (
        materials.map((m) => (
          <Card key={m.id}>
            <Text style={u.strong}>
              {MATERIAL_ICON[m.kind] ?? "📎"} {m.title}
            </Text>
            <View style={u.row}>
              <Btn small kind="outline" label="Abrir" onPress={() => Linking.openURL(m.url)} />
              <Btn small kind="danger" label="Apagar" onPress={() => removeMaterial(m)} disabled={busy} />
            </View>
          </Card>
        ))
      )}

      {!cancelled ? (
        <>
          <SubTitle>Mais opções</SubTitle>
          <View style={u.row}>
            <Btn small kind="outline" label="Cancelar formação" onPress={() => setCancelOpen(!cancelOpen)} />
            {participants.length === 0 ? <Btn small kind="danger" label="🗑️ Apagar formação" onPress={removeTraining} /> : null}
          </View>

          {cancelOpen ? (
            <Card>
              <Field label="Motivo (opcional, as pessoas inscritas veem)" value={cancelReason} onChangeText={setCancelReason} multiline />
              <Btn kind="danger" label={busy ? "A cancelar..." : "Cancelar a formação"} onPress={confirmCancel} disabled={busy} />
            </Card>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
