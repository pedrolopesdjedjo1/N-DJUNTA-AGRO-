import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const { userId } = route.params;
  const { user } = useAuth();
  const listRef = useRef<FlatList<Message>>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  const loadMessages = useCallback(async () => {
    try {
      const data = await getMessages(userId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.l
