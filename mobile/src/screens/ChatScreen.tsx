import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Modal, Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { getMessages, sendMessage } from "../api/messages";
import { createReview } from "../api/reviews";

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

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

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

  async function handleSubmitReview() {
    setSubmittingReview(true);
    try {
      await createReview(userId, selectedRating, reviewComment);
      setReviewModalVisible(false);
      setReviewComment("");
      setSelectedRating(5);
      Alert.alert("Obrigado!
