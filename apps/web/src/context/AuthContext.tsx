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
  id_productor?: number | null | undefined;
  sub: string;
  email: string;
  nombre: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  telefono?: string | null;
  biografia?: string | null;
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
  login: (token: string, usuario: Usuario, refreshToken: string, rememberMe?: boolean) => void;
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

      const accessToken = (session as any)?.accessToken;
      if (accessToken) setCookie("token", accessToken, 7);

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
        biografia: storedUser.biografia ?? session.user.biografia ?? null,
        foto_url: storedUser.foto_url ?? session.user.foto_url ?? session.user.image ?? null,
        idioma_preferido: storedUser.idioma_preferido || session.user.idioma_preferido || "es",
        moneda_preferida: storedUser.moneda_preferida || session.user.moneda_preferida || "MXN",
        roles: session.user.roles || storedUser.roles || [(session.user as any)?.role || "user"],
        permisos: session.user.permisos || storedUser.permisos || [],
        id_productor: session.user.id_productor ?? storedUser.id_productor ?? undefined,
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
          id_productor: usuario.id_productor ?? undefined,
          biografia: usuario.biografia ?? null,
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
    if (!user?.id_usuario || (user.id_productor != null && user.id_productor !== 0)) return;

    let cancelled = false;

    const resolveProductor = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/productores/by-usuario/${user.id_usuario}`,
        );
        if (!response.ok) {
          setLoading(false);
          return;
        }
        const text = await response.text();
        if (!text || cancelled) {
          setLoading(false);
          return;
        }
        const prod = JSON.parse(text) as
          | { id_productor?: number; estado?: string }
          | Array<{ id_productor?: number; estado?: string }>;

        if (!prod || (typeof prod === "object" && !Array.isArray(prod) && !prod.id_productor)) return;

        const idProductor = Array.isArray(prod) ? prod[0]?.id_productor : prod.id_productor;
        const estadoProductor = Array.isArray(prod) ? prod[0]?.estado : prod.estado;

        if (idProductor == null) return;

        // Si el productor fue aprobado pero el token aún no tiene el rol,
        // usamos el refresh token para obtener un JWT actualizado con roles correctos.
        const rolesActualizados = user.roles?.some((r) =>
          ["PRODUCTOR", "productor"].includes(r),
        );
        if (estadoProductor === "aprobado" && !rolesActualizados) {
          const refreshToken = getCookie("refresh_token");
          if (refreshToken) {
            try {
              const refreshRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ refresh_token: refreshToken }),
                },
              );
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                setCookie("token", refreshData.tokens.access_token, 7);
                if (refreshData.tokens.refresh_token) {
                  setCookie("refresh_token", refreshData.tokens.refresh_token, 30);
                }
                const nextUser: Usuario = {
                  ...user,
                  ...refreshData.user,
                  id_productor: Number(idProductor),
                  roles: refreshData.user.roles ?? user.roles,
                  permisos: refreshData.user.permisos ?? user.permisos,
                };
                if (cancelled) return;
                setUser(nextUser);
                setCookie("usuario", JSON.stringify(nextUser), 7);
                return;
              }
            } catch {
              // Si el refresh falla, actualizar solo el id_productor
            }
          }
        }

        if (cancelled) return;
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

  const login = useCallback((token: string, usuario: Usuario, refreshToken: string, rememberMe = false) => {
    setCookie("token", token, 7);
    setCookie("refresh_token", refreshToken, rememberMe ? 30 : 1);
    setCookie("usuario", JSON.stringify(usuario), 7);
    setUser(usuario);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getCookie("refresh_token");
    if (refreshToken) {
      try {
        await api.auth.logout(refreshToken);
      } catch (error) {
        console.error("Error en logout:", error);
      }
    }
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
      (user?.roles?.some((r) => ["PRODUCTOR", "productor"].includes(r)) ||
        (user?.id_productor != null && user.id_productor !== 0)) ??
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
