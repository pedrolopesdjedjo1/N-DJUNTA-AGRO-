import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// IMPORTANTE: troque essa URL pelo endereço real do seu backend rodando
// (ex: a URL pública que o Replit te dá quando o backend está no ar).
// Nunca use "localhost" - o celular não entende esse endereço.
const API_URL = "https://SEU-BACKEND-AQUI.replit.dev";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Antes de cada pedido, anexa o token de login salvo (se existir)
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("@nodjuntaagro:token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
