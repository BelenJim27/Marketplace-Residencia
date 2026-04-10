"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import { getCookie, setCookie, removeCookie } from "@/lib/cookies";

interface Usuario {
  id_usuario?: string;
  id_productor?: number | null;
  sub: string;
  email: string;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  roles: string[];
  permisos?: string[];
}

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isProductor: boolean;
  login: (token: string, usuario: Usuario, refreshToken?: string) => void;
  logout: () => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(() => {
    const token = getCookie("token");
    const usuarioStr = getCookie("usuario");

    if (token && usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        setUser({
          ...usuario,
          roles: Array.isArray(usuario.roles) ? usuario.roles : [],
          permisos: Array.isArray(usuario.permisos) ? usuario.permisos : [],
          id_productor: usuario.id_productor ?? null,
        });
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (!user?.id_usuario || user.id_productor != null) return;

    let cancelled = false;

    const resolveProductor = async () => {
      try {
        const productor = (await api.productores.getByUsuario(user.id_usuario as string)) as { id_productor?: number } | Array<{ id_productor?: number }>;
        if (cancelled) return;

        const idProductor = Array.isArray(productor) ? productor[0]?.id_productor : productor?.id_productor;
        if (idProductor == null) return;

        const nextUser = { ...user, id_productor: Number(idProductor) };
        setUser(nextUser);
        setCookie("usuario", JSON.stringify(nextUser), 7);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    resolveProductor();

    return () => {
      cancelled = true;
    };
  }, [user?.id_usuario, user?.id_productor]);

  const login = useCallback((token: string, usuario: Usuario, refreshToken?: string) => {
    setCookie("token", token, 7);
    if (refreshToken) setCookie("refresh_token", refreshToken, 30);
    setCookie("usuario", JSON.stringify(usuario), 7);
    setUser(usuario);
  }, []);

  const logout = useCallback(() => {
    removeCookie("token");
    removeCookie("refresh_token");
    removeCookie("usuario");
    setUser(null);
    window.location.href = "/auth/sign-in";
  }, []);

  const isAdmin = useMemo(
    () => user?.roles?.some((r) => ["ADMIN", "administrador", "admin"].includes(r)) ?? false,
    [user],
  );
  const isProductor = useMemo(
    () =>
      (user?.roles?.some((r) => ["PRODUCTOR", "productor"].includes(r)) ?? false) ||
      user?.permisos?.includes("panel_productor") ||
      false,
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin,
      isProductor,
      login,
      logout,
      refreshAuth,
    }),
    [user, loading, isAdmin, isProductor, login, logout, refreshAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
