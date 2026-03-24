import { create } from "zustand";
import api from "@/lib/api";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  auth_provider: string;
  avatar_url: string | null;
  class_name: string | null;
  semester: string | null;
  year: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  googleAuth: (token: string) => Promise<void>;
  updateProfile: (data: Partial<Pick<User, "full_name" | "class_name" | "semester" | "year">>) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    const { data: user } = await api.get("/auth/me");
    set({ user, isAuthenticated: true });
  },

  register: async (email, password, fullName) => {
    const { data } = await api.post("/auth/register", {
      email,
      password,
      full_name: fullName,
    });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    const { data: user } = await api.get("/auth/me");
    set({ user, isAuthenticated: true });
  },

  googleAuth: async (token) => {
    const { data } = await api.post("/auth/google", { token });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    const { data: user } = await api.get("/auth/me");
    set({ user, isAuthenticated: true });
  },

  updateProfile: async (data) => {
    const { data: user } = await api.patch("/auth/me", data);
    set({ user });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
