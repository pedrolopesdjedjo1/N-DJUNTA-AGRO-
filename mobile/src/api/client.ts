import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// IMPORTANTE: troque essa URL pelo endereço real do seu backend rodando
// (ex: a URL pública que o Replit te dá quando o backend está no ar).
// Nunca use "localhost" - o celular não entende esse endereço.
https://e86c6159-a2e4-46b7-a26a-9bb77aa6ce2c-00-3jz2qyno8f1v7.kirk.replit.dev —
export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
});

// Antes de cada pedido, anexa o token de login salvo (se existir)
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("@nodjuntaagro:token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
