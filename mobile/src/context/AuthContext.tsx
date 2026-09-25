import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  location?: string;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao abrir o app, verifica se já existe um login salvo
  useEffect(() => {
    async function loadStoredUser() {
      const storedUser = await AsyncStorage.getItem("@nodjuntaagro:user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    }
    loadStoredUser();
  }, []);

  async function login(email: string, password: string) {
    const response = await api.post("/api/auth/login", { email, password });
    const { token, user: loggedUser } = response.data;

    await AsyncStorage.setItem("@nodjuntaagro:token", token);
    await AsyncStorage.setItem("@nodjuntaagro:user", JSON.stringify(loggedUser));
    setUser(loggedUser);
  }

  async function register(data: RegisterData) {
    const response = await api.post("/api/auth/register", data);
    const { token, user: newUser } = response.data;

    await AsyncStorage.setItem("@nodjuntaagro:token", token);
    await AsyncStorage.setItem("@nodjuntaagro:user", JSON.stringify(newUser));
    setUser(newUser);
  }

  async function logout() {
    await AsyncStorage.removeItem("@nodjuntaagro:token");
    await AsyncStorage.removeItem("@nodjuntaagro:user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
