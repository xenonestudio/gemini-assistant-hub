import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
      if (raw) {
        setUser(JSON.parse(raw));
        const token = window.localStorage.getItem("pulse.auth.token");
        if (token) setSocketToken(token);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("pulse.auth.token");
    socket.disconnect();
    persist(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("pulse:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("pulse:unauthorized", handleUnauthorized);
  }, [logout]);

  const persist = (u: AuthUser | null) => {
    setUser(u);
    try {
      if (u) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 500));
    if (!email.includes("@")) return { ok: false, error: "Email inválido" };
    if (password.length < 4) return { ok: false, error: "Contraseña demasiado corta" };
    const name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    // Demo: cualquier email que empiece por "admin" o contenga "+admin" entra como administrador
    const role: "admin" | "agent" = /(^admin)|(\+admin)/i.test(email) ? "admin" : "agent";
    persist({
      id: btoa(email).slice(0, 10),
      name: name || "Usuario",
      email,
      avatarColor: "oklch(0.65 0.2 280)",
      role,
    });
    return { ok: true };
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 500));
    if (!name.trim()) return { ok: false, error: "El nombre es obligatorio" };
    if (!email.includes("@")) return { ok: false, error: "Email inválido" };
    if (password.length < 6) return { ok: false, error: "Mínimo 6 caracteres" };
    persist({
      id: btoa(email).slice(0, 10),
      name: name.trim(),
      email,
      avatarColor: "oklch(0.65 0.2 145)",
      role: "agent",
    });
    return { ok: true };
  }, []);

<<<<<<< Updated upstream
  const logout = useCallback(() => persist(null), []);
=======
>>>>>>> Stashed changes

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
