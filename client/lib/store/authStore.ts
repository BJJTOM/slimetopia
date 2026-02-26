import { create } from "zustand";
import { api } from "@/lib/api/client";

interface User {
  id: string;
  nickname: string;
  gold: number;
  gems: number;
  stardust: number;
  level: number;
  email?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;

  setTokens: (access: string, refresh: string) => void;
  fetchUser: () => Promise<void>;
  devLogin: (nickname: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  register: (email: string, password: string) => Promise<string | null>;
  emailLogin: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken:
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null,
  refreshToken:
    typeof window !== "undefined"
      ? localStorage.getItem("refresh_token")
      : null,
  isLoading: false,

  setTokens: (access, refresh) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    set({ accessToken: access, refreshToken: refresh });
  },

  fetchUser: async () => {
    const token = get().accessToken;
    if (!token) return;

    set({ isLoading: true });
    try {
      const user = await api<User>("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ user, isLoading: false });
    } catch {
      // Token expired or invalid — clear auth so page redirects to login
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ user: null, accessToken: null, refreshToken: null, isLoading: false });
    }
  },

  devLogin: async (nickname: string) => {
    set({ isLoading: true });
    try {
      const res = await api<{
        user: User;
        tokens: { access_token: string; refresh_token: string };
      }>("/api/auth/dev-login", {
        method: "POST",
        body: { nickname },
      });
      const { setTokens } = get();
      setTokens(res.tokens.access_token, res.tokens.refresh_token);
      set({ user: res.user, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  guestLogin: async () => {
    set({ isLoading: true });
    try {
      const res = await api<{
        user: User;
        tokens: { access_token: string; refresh_token: string };
      }>("/api/auth/guest-login", {
        method: "POST",
      });
      const { setTokens } = get();
      setTokens(res.tokens.access_token, res.tokens.refresh_token);
      set({ user: res.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await api<{
        user: User;
        tokens: { access_token: string; refresh_token: string };
      }>("/api/auth/register", {
        method: "POST",
        body: { email, password },
      });
      const { setTokens } = get();
      setTokens(res.tokens.access_token, res.tokens.refresh_token);
      set({ user: res.user, isLoading: false });
      return null;
    } catch (err: unknown) {
      set({ isLoading: false });
      const e = err as { data?: { error?: string } };
      return e?.data?.error || "registration_failed";
    }
  },

  emailLogin: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await api<{
        user: User;
        tokens: { access_token: string; refresh_token: string };
      }>("/api/auth/email-login", {
        method: "POST",
        body: { email, password },
      });
      const { setTokens } = get();
      setTokens(res.tokens.access_token, res.tokens.refresh_token);
      set({ user: res.user, isLoading: false });
      return null;
    } catch (err: unknown) {
      set({ isLoading: false });
      const e = err as { data?: { error?: string } };
      return e?.data?.error || "login_failed";
    }
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
