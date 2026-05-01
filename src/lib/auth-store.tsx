import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, setSocketToken, socket } from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: "admin" | "agent";
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setRole: (role: "admin" | "agent") => void;
}

const AuthContext = createContext<AuthState | null>(null);
const STORAGE_KEY = "pulse.auth.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const persist = (u: AuthUser | null) => {
    setUser(u);
    try {
      if (u) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const login = useCallback(async (username: string, password: string) => {
    try {
      const data = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (data.token) {
        localStorage.setItem("pulse.auth.token", data.token);
        setSocketToken(data.token);
        
        // El backend de whatsapp actualmente solo devuelve token y mensaje. 
        // Simulamos el objeto de usuario basándonos en el username por ahora.
        const role: "admin" | "agent" = /(^admin)|(\+admin)/i.test(username) ? "admin" : "agent";
        const authUser: AuthUser = {
          id: btoa(username).slice(0, 10),
          name: username.charAt(0).toUpperCase() + username.slice(1),
          email: `${username}@xenon.com`, // Email ficticio ya que el backend usa username
          avatarColor: "oklch(0.65 0.2 280)",
          role,
        };
        
        persist(authUser);
        return { ok: true };
      }
      return { ok: false, error: "No se recibió token" };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    // Por ahora el backend de whatsapp no tiene endpoint de registro abierto
    await new Promise((r) => setTimeout(r, 500));
    return { ok: false, error: "El registro no está habilitado en este entorno" };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("pulse.auth.token");
    socket.disconnect();
    persist(null);
  }, []);

  const setRole = useCallback((role: "admin" | "agent") => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, role };
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, isAuthenticated: !!user, isAdmin: user?.role === "admin", loading, login, signup, logout, setRole }),
    [user, loading, login, signup, logout, setRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
