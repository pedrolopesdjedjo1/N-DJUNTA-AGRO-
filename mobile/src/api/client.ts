import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

"https://n-djunta-agro.onrender.com/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("@nodjuntaagro:token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
