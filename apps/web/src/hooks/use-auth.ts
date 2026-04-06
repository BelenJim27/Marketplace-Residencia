"use client";

import { useRouter } from "next/navigation";
import { useAuth as useAuthContext } from "@/context/AuthContext";

export function useAuth() {
  const router = useRouter();
  const auth = useAuthContext();

  const hasRole = (role: string | string[]): boolean => {
    if (!auth.user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.some((r) => auth.user?.roles.includes(r));
  };

  const hasPermiso = (permiso: string | string[]): boolean => {
    if (!auth.user) return false;
    const permisos = Array.isArray(permiso) ? permiso : [permiso];
    return permisos.some((p) => auth.user?.permisos?.includes(p));
  };

  return {
    user: auth.user,
    loading: auth.loading,
    hasRole,
    hasPermiso,
    logout: auth.logout,
    isAuthenticated: auth.isAuthenticated,
    isAdmin: auth.isAdmin,
    isProductor: auth.isProductor,
  };
}
