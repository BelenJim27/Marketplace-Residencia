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
  const [productorResolved, setProductorResolved] = useState(false);
  const { data: session } = useSession();

  const refreshAuth = useCallback(() => {
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

      const id_productor =
        session.user.id_productor != null
          ? Number(session.user.id_productor)
          : storedUser.id_productor != null
            ? Number(storedUser.id_productor)
            : undefined;

      const userFinal: Usuario = {
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
        id_productor,
      };

      setCookie("usuario", JSON.stringify(userFinal), 7);
      setUser(userFinal);
      setLoading(false);
      return;
    }

    const token = getCookie("token");
    const usuarioStr = getCookie("usuario");

    if (token && usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        setUser({
          ...usuario,
          roles: Array.isArray(usuario.roles) ? usuario.roles : [],
          permisos: Array.isArray(usuario.permisos) ? usuario.permisos : [],
          id_productor: usuario.id_productor != null ? Number(usuario.id_productor) : undefined,
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
    setProductorResolved(false);
  }, [session]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth, session]);

  useEffect(() => {
    if (!user?.id_usuario) return;
    if (user.id_productor != null && user.id_productor !== 0) return;
    if (productorResolved) return;

    let cancelled = false;

    const resolveProductor = async () => {
      try {
        const response = await fetch(`/productores/by-usuario/${user.id_usuario}`);
        if (!response.ok) return;

        const text = await response.text();
        if (!text || cancelled) return;

        const prod = JSON.parse(text) as
          | { id_productor?: number; estado?: string }
          | Array<{ id_productor?: number; estado?: string }>;

        if (!prod || (typeof prod === "object" && !Array.isArray(prod) && !prod.id_productor)) return;

        const idProductor = Array.isArray(prod) ? prod[0]?.id_productor : prod.id_productor;
        const estadoProductor = Array.isArray(prod) ? prod[0]?.estado : prod.estado;

        if (idProductor == null) return;

        // ── Si el productor está inactivo, limpiar y no mostrar panel productor ──
        if (estadoProductor === "inactivo") {
          if (cancelled) return;
          const nextUser: Usuario = {
            ...user,
            id_productor: undefined,
            // Quitar el rol productor de la lista local también
            roles: user.roles.filter((r) => !["PRODUCTOR", "productor"].includes(r)),
          };
          setCookie("usuario", JSON.stringify(nextUser), 7);
          setUser(nextUser);
          setProductorResolved(true);
          return;
        }

        // Si el productor fue aprobado pero el token aún no tiene el rol,
        // usar el refresh token para obtener un JWT actualizado.
        const rolesActualizados = user.roles?.some((r) =>
          ["PRODUCTOR", "productor"].includes(r),
        );

        if (estadoProductor === "aprobado" && !rolesActualizados) {
          const refreshToken = getCookie("refresh_token");
          if (refreshToken) {
            try {
              const refreshRes = await fetch(`/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: refreshToken }),
              });
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
                setCookie("usuario", JSON.stringify(nextUser), 7);
                setUser(nextUser);
                setProductorResolved(true);
                return;
              }
            } catch {
              // Si el refresh falla, continuar y actualizar solo el id_productor
            }
          }
        }

        if (cancelled) return;

        const nextUser = { ...user, id_productor: Number(idProductor) };
        setCookie("usuario", JSON.stringify(nextUser), 7);
        setUser(nextUser);
        setProductorResolved(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    resolveProductor();

    return () => {
      cancelled = true;
    };
  }, [user?.id_usuario, user?.id_productor, productorResolved]);

  const login = useCallback((token: string, usuario: Usuario, refreshToken: string, rememberMe = false) => {
    setCookie("token", token, 7);
    setCookie("refresh_token", refreshToken, rememberMe ? 30 : 1);
    const normalizedUser: Usuario = {
      ...usuario,
      id_productor: usuario.id_productor != null ? Number(usuario.id_productor) : undefined,
    };
    setCookie("usuario", JSON.stringify(normalizedUser), 7);
    setUser(normalizedUser);
    setProductorResolved(normalizedUser.id_productor != null && normalizedUser.id_productor !== 0);
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
    setProductorResolved(false);
    window.location.href = "/auth/sign-in";
  }, []);

  const isAdmin = useMemo(
    () => user?.roles?.some((r) => ["ADMIN", "administrador", "admin"].includes(r)) ?? false,
    [user],
  );

  // ── isProductor solo depende del rol, NO del id_productor en cookie ──
  // Esto evita que un ex-productor siga viendo el panel si aún tiene id_productor guardado
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