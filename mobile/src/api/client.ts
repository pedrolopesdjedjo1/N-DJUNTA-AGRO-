import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://e86c6159-a2e4-46b7-a26a-9bb77aa6ce2c-00-3jz2qyno8f1v7.kirk.replit.dev";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": API_URL,
    "Origin": API_URL,
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("@nodjuntaagro_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
