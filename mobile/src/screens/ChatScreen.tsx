import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";
import { getMessages, sendMessage, deleteMessage } from "../api/messages";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

const extra: Record<string, Record<string, string>> = {
  pt: { deleteTitle: "Apagar mensagem", deleteAsk: "Apagar esta mensagem para todos?", del: "Apagar", deleteFail: "Não foi possível apagar a mensagem." },
  crl: { deleteTitle: "Apaga mensaji", deleteAsk: "Apaga e mensaji pa tudu?", del: "Apaga", deleteFail: "Ka konsigi apaga mensaji." },
  fr: { deleteTitle: "Supprimer le message", deleteAsk: "Supprimer ce message pour tous ?", del: "Supprimer", deleteFail: "Impossible de supprimer le message." },
};

export default function ChatScreen() {
  const route = useRoute<any>();
  const { userId } = route.params;
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const tr = (key: string) => extra[language]?.[key] ?? key;
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const loadMessages = useCallback(async () => {
    try {
      const data = await getMessages(userId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Erro ao carregar mensagens", err);
    }
  }, [userId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  async function handleSend() {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    setError("");
    try {
      await sendMessage(userId, content);
      loadMessages();
    } catch (err: any) {
      setText(content);
      setError(err?.response?.data?.error || err?.response?.data?.message || t("sendError"));
    }
  }

  function askDelete(item: Message) {
    Alert.alert(tr("deleteTitle"), tr("deleteAsk"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: tr("del"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMessage(item.id);
            setMessages((prev) => prev.filter((m) => m.id !== item.id));
          } catch (err: any) {
            Alert.alert(t("error"), err?.response?.data?.error || tr("deleteFail"));
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior="padding">
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={s.empty}>{t("noMessages")}</Text>}
        renderItem={({ item }) => {
          const isMine = String(item.senderId) === String(user?.id);
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onLongPress={isMine ? () => askDelete(item) : undefined}
              style={[s.bubble, isMine ? s.mine : s.theirs]}
            >
              <Text style={isMine ? s.textMine : s.textTheirs}>{item.content}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={[s.inputRow, { paddingBottom: 10 + insets.bottom }]}>
        <TextInput style={s.input} placeholder={t("chatPlaceholder")} value={text} onChangeText={setText} multiline />
        <TouchableOpacity style={s.send} onPress={handleSend}>
          <Text style={s.sendText}>{t("send")}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40 },
  error: { color: "#B71C1C", textAlign: "center", paddingHorizontal: 12, paddingVertical: 6 },
  bubble: { maxWidth: "75%", padding: 10, borderRadius: 12, marginBottom: 8 },
  mine: { backgroundColor: colors.primary, alignSelf: "flex-end" },
  theirs: { backgroundColor: colors.surface, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.border },
  textMine: { color: colors.white },
  textTheirs: { color: colors.text },
  inputRow: { flexDirection: "row", padding: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, alignItems: "flex-end" },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, maxHeight: 100 },
  send: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, justifyContent: "center", alignItems: "center" },
  sendText: { color: colors.white, fontWeight: "bold" },
});
