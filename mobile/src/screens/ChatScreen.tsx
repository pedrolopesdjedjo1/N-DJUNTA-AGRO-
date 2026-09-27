import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { getMessages, sendMessage } from "../api/messages";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export default function ChatScreen() {
  const route = useRoute<any>();
  const { userId, userName } = route.params;
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    try {
      const data = await getMessages(userId);
      setMessages(data);
    } catch (err) {
      console.log("Erro ao carregar mensagens", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  async function handleSend() {
    if (!text.trim()) return;
    const content = text;
    setText("");
    try {
      await sendMessage(userId, content);
      loadMessages();
    } catch (err) {
      console.log("Erro ao enviar mensagem", err);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const isMine = item.senderId === user?.id;
          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={isMine ? styles.textMine : styles.textTheirs}>{item.content}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Escreva uma mensagem..."
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bubble: { maxWidth: "75%", padding: 10, borderRadius: 12, marginBottom: 8 },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: "flex-end" },
  bubbleTheirs: { backgroundColor: colors.surface, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.border },
  textMine: { color: colors.white },
  textTheirs: { color: colors.text },
  inputRow: {
    flexDirection: "row", padding: 10, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.background, alignItems: "flex-end",
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, maxHeight: 100,
  },
  sendButton: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendText: { color: colors.white, fontWeight: "bold" },
});
