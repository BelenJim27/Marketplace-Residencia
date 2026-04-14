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
import { useSession } from "next-auth/react";
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
  telefono?: string | null;
  foto_url?: string | null;
  idioma_preferido?: string;
  moneda_preferida?: string;
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
  const { data: session } = useSession();

  const refreshAuth = useCallback(() => {
    // Si hay sesión de NextAuth, usarla
    if (session?.user) {
      console.log("📋 Usando sesión de NextAuth", session.user.email);
      let storedUser: Partial<Usuario> = {};

      const usuarioStr = getCookie("usuario");
      if (usuarioStr) {
        try {
          storedUser = JSON.parse(usuarioStr);
        } catch {
          storedUser = {};
        }
      }

      setUser({
        ...storedUser,
        id_usuario: session.user.id_usuario || session.user.id || storedUser.id_usuario,
        sub: session.user.id || storedUser.sub || "",
        email: session.user.email || "",
        nombre: storedUser.nombre || session.user.nombre || session.user.name || "Usuario",
        apellido_paterno: storedUser.apellido_paterno ?? session.user.apellido_paterno ?? undefined,
        apellido_materno: storedUser.apellido_materno ?? session.user.apellido_materno ?? undefined,
        telefono: storedUser.telefono ?? session.user.telefono ?? null,
        foto_url: storedUser.foto_url ?? session.user.foto_url ?? session.user.image ?? null,
        idioma_preferido: storedUser.idioma_preferido || session.user.idioma_preferido || "es",
        moneda_preferida: storedUser.moneda_preferida || session.user.moneda_preferida || "MXN",
        roles: session.user.roles || storedUser.roles || [(session.user as any)?.role || "user"],
        permisos: session.user.permisos || storedUser.permisos || [],
        id_productor: session.user.id_productor ?? storedUser.id_productor ?? null,
      });
      setLoading(false);
      return;
    }

    // Si no, intentar leer de cookies
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
  }, [session]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth, session]);

  useEffect(() => {
    if (!user?.id_usuario || user.id_productor != null) return;

    let cancelled = false;

const resolveProductor = async () => {
      try {
        const accessToken = getCookie("token");
        if (!accessToken) {
          setLoading(false);
          return;
        }
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/productores/by-usuario/${user.id_usuario}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
          if (response.status === 404) {
            if (cancelled) return;
            setLoading(false);
            return;
          }
          throw new Error(`Error ${response.status}`);
        }
        const text = await response.text();
        if (!text || cancelled) {
          setLoading(false);
          return;
        }
        const prod = JSON.parse(text) as { id_productor?: number } | Array<{ id_productor?: number }>;
        if (!prod || (typeof prod === 'object' && !Array.isArray(prod) && !prod.id_productor)) return;

        const idProductor = Array.isArray(prod) ? prod[0]?.id_productor : prod.id_productor;
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
    () => user?.roles?.some((r) => ["PRODUCTOR", "productor"].includes(r)) ?? false,
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
