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
import { useRouter } from "next/navigation";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { api } from "@/lib/api";
import { getCookie, setCookie, removeCookie } from "@/lib/cookies";
import { getUserIdFromToken } from "@/lib/jwt";

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
  isCliente: boolean;
  login: (token: string, usuario: Usuario, refreshToken: string, rememberMe?: boolean) => void;
  logout: () => void;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [productorResolved, setProductorResolved] = useState(false);
  const { data: session, status: sessionStatus } = useSession();

  const refreshAuth = useCallback(() => {
    if (sessionStatus === "loading") return;

    if (session?.user) {
      console.log("📋 Usando sesión de NextAuth", session.user.email);

      const accessToken = (session as any)?.accessToken;
      if (accessToken) setCookie("token", accessToken, 7);

      const sessionRefreshToken = (session as any)?.refreshToken;
      if (sessionRefreshToken && !getCookie("refresh_token")) {
        setCookie("refresh_token", sessionRefreshToken, 30);
      }

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
        // El `sub` del access token es el UUID real del backend. Tiene prioridad
        // sobre session.user.id (que puede ser el sub de Google, no un UUID).
        id_usuario:
          getUserIdFromToken(accessToken) ||
          session.user.id_usuario ||
          session.user.id ||
          storedUser.id_usuario,
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

    const refreshToken = getCookie("refresh_token");

    // Restaurar usuario si hay perfil guardado Y al menos uno de los tokens es válido.
    // Cuando token expira pero refresh_token sigue activo, la llamada API obtiene un
    // nuevo access_token automáticamente (via api.ts), sin forzar un re-login.
    // Accept session with old non-HttpOnly token OR new HttpOnly session indicator cookie
    if (usuarioStr && (getCookie("session") === "active" || token || refreshToken)) {
      try {
        const usuario = JSON.parse(usuarioStr);
        // Sanea el id contra el `sub` del access token (fuente del backend). Si la
        // cookie tenía un id no-UUID (p. ej. de un login OAuth previo), lo corrige y
        // reescribe la cookie para que el resto de la app (carrito, etc.) lo lea bien.
        const tokenSub = getUserIdFromToken(token);
        const id_usuario = tokenSub || usuario.id_usuario;
        const normalized = {
          ...usuario,
          id_usuario,
          roles: Array.isArray(usuario.roles) ? usuario.roles : [],
          permisos: Array.isArray(usuario.permisos) ? usuario.permisos : [],
          id_productor: usuario.id_productor != null ? Number(usuario.id_productor) : undefined,
          biografia: usuario.biografia ?? null,
        };
        if (tokenSub && tokenSub !== usuario.id_usuario) {
          setCookie("usuario", JSON.stringify(normalized), 30);
        }
        setUser(normalized);
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [session, sessionStatus]);

  useEffect(() => {
    setProductorResolved(false);
  }, [session]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth, session]);

  // Cuando token cookie expiró pero usuario + refresh_token siguen vigentes,
  // refresca el access token en background sin interrumpir la UI.
  useEffect(() => {
    if (loading) return;
    if (session?.user) return;  // NextAuth lo maneja
    if (!user) return;          // sin usuario, el otro effect se encarga
    // With HttpOnly cookies we can't check token presence; api.ts handles 401→refresh transparently
    if (getCookie("token") || getCookie("session") === "active") return;

    // Backward compat: old sessions with non-HttpOnly refresh token
    const refreshToken = getCookie("refresh_token");
    if (!refreshToken) return;

    fetch("/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.tokens) return;
        if (data.tokens.access_token) setCookie("token", data.tokens.access_token, 7);
        if (data.tokens.refresh_token) setCookie("refresh_token", data.tokens.refresh_token, 30);
      })
      .catch(() => {});
  }, [loading, user, session]);

  // Cuando usuario cookie expiró pero refresh_token sigue vigente,
  // llama al endpoint para obtener tokens + perfil frescos sin forzar re-login.
  useEffect(() => {
    if (loading) return;        // esperar a que refreshAuth termine
    if (user !== null) return;  // ya hay sesión, nada que hacer
    if (session?.user) return;  // NextAuth maneja la sesión

    // Can recover session via HttpOnly cookie (session indicator) or old non-HttpOnly refresh token
    const refreshToken = getCookie("refresh_token");
    const hasSession = getCookie("session") === "active";
    if (!refreshToken && !hasSession) return;

    let cancelled = false;
    setLoading(true);

    fetch("/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...(refreshToken ? { body: JSON.stringify({ refresh_token: refreshToken }) } : {}),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        // HttpOnly cookies are set automatically by the backend response.
        // Only persist JS-readable tokens for backward compat (silently ignored for HttpOnly sessions).
        if (data.tokens?.access_token) {
          setCookie("token", data.tokens.access_token, 7);
        }
        if (data.tokens?.refresh_token) {
          setCookie("refresh_token", data.tokens.refresh_token, 30);
        }
        if (data.user) {
          const usuario: Usuario = {
            ...data.user,
            roles: Array.isArray(data.user.roles) ? data.user.roles : [],
            permisos: Array.isArray(data.user.permisos) ? data.user.permisos : [],
            id_productor: data.user.id_productor != null ? Number(data.user.id_productor) : undefined,
            biografia: data.user.biografia ?? null,
          };
          setCookie("usuario", JSON.stringify(usuario), 30);
          setUser(usuario);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [loading, user, session]);

  // Productor resolution in background — does NOT block layout rendering
  useEffect(() => {
    if (!user?.id_usuario) return;

    const hasProductorRole = user?.roles?.some((r) => ["PRODUCTOR", "productor"].includes(r)) ?? false;

    // Skip only when id_productor AND productor role are both confirmed
    if (user.id_productor != null && user.id_productor !== 0 && hasProductorRole) return;
    // Skip if already fully resolved AND has the role
    if (productorResolved && hasProductorRole) return;

    const isAdminRole = user?.roles?.some((r) => ["ADMIN", "administrador", "admin"].includes(r));
    if (isAdminRole) {
      setProductorResolved(true);
      return;
    }

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

        if (estadoProductor === "inactivo") {
          if (cancelled) return;
          const nextUser: Usuario = {
            ...user,
            id_productor: undefined,
            roles: user.roles.filter((r) => !["PRODUCTOR", "productor"].includes(r)),
          };
          setCookie("usuario", JSON.stringify(nextUser), 7);
          setUser(nextUser);
          setProductorResolved(true);
          return;
        }

        const rolesActualizados = user.roles?.some((r) =>
          ["PRODUCTOR", "productor"].includes(r),
        );

        if (estadoProductor === "aprobado" && !rolesActualizados) {
          const refreshToken = getCookie("refresh_token");
          const hasSession = getCookie("session") === "active";
          if (refreshToken || hasSession) {
            try {
              const refreshRes = await fetch(`/auth/refresh`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                ...(refreshToken ? { body: JSON.stringify({ refresh_token: refreshToken }) } : {}),
              });
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                // Backend sets HttpOnly cookies; setCookie is silently ignored for HttpOnly sessions
                if (refreshData.tokens?.access_token) setCookie("token", refreshData.tokens.access_token, 7);
                if (refreshData.tokens?.refresh_token) setCookie("refresh_token", refreshData.tokens.refresh_token, 30);
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
                router.push("/dashboard/productor");
                return;
              }
            } catch {
              // If refresh fails, continue and update only id_productor
            }
          }
        }

        if (cancelled) return;

        const nextUser = { ...user, id_productor: Number(idProductor) };
        setCookie("usuario", JSON.stringify(nextUser), 7);
        setUser(nextUser);
        setProductorResolved(true);
      } catch (err) {
        console.error("Error resolving productor:", err);
      }
    };

    // Start in background — no setLoading(true) here to avoid blocking layout
    resolveProductor();

    return () => {
      cancelled = true;
    };
  }, [user?.id_usuario, user?.id_productor, productorResolved]);

  // Cuando api.ts no puede refrescar el token, limpia la sesión OAuth también
  useEffect(() => {
    const handleSessionExpired = async () => {
      setUser(null);
      setProductorResolved(false);
      try {
        // Cerrar sesión de NextAuth (Google OAuth) para que sign-in no redirija automáticamente
        await nextAuthSignOut({ redirect: false });
      } catch {
        // Si falla el signOut de NextAuth, igual redirigimos
      }
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      const redirectParam = currentPath && currentPath !== "/auth/sign-in" ? `?redirect=${encodeURIComponent(currentPath)}` : "";
      window.location.href = `/auth/sign-in${redirectParam}`;
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, []);

  const login = useCallback((token: string, usuario: Usuario, refreshToken: string, rememberMe = false) => {
    // Backend already set HttpOnly cookies on login response; setCookie calls are silently
    // ignored by the browser for HttpOnly cookies. Kept for backward compat with old sessions.
    setCookie("token", token, rememberMe ? 7 : 1);
    setCookie("refresh_token", refreshToken, 30);
    const normalizedUser: Usuario = {
      ...usuario,
      id_productor: usuario.id_productor != null ? Number(usuario.id_productor) : undefined,
    };
    setCookie("usuario", JSON.stringify(normalizedUser), 30);
    setUser(normalizedUser);
    setProductorResolved(normalizedUser.id_productor != null && normalizedUser.id_productor !== 0);
  }, []);

  const logout = useCallback(async () => {
    const { signOut } = await import("next-auth/react");

    const refreshToken = getCookie("refresh_token");
    if (refreshToken) {
      try {
        await api.auth.logout(refreshToken);
      } catch {
        // best-effort: proceed with client-side logout even if the API is unreachable
      }
    }

    removeCookie("token");
    removeCookie("refresh_token");
    removeCookie("session");
    removeCookie("usuario");
    setUser(null);
    setProductorResolved(false);
    localStorage.removeItem("carrito_items_guest");
    try {
      await signOut({ redirect: false });
    } catch {
      // NextAuth may fail if no OAuth session exists; safe to ignore
    }

    window.location.href = "/producto";
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

  const isCliente = useMemo(
    () => !!user && !isAdmin && !isProductor,
    [user, isAdmin, isProductor],
  );

  const value = useMemo(
    () => ({
      user,
      loading: loading || sessionStatus === "loading",
      isAuthenticated: !!user,
      isAdmin,
      isProductor,
      isCliente,
      login,
      logout,
      refreshAuth,
    }),
    [user, loading, sessionStatus, isAdmin, isProductor, isCliente, login, logout, refreshAuth],
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