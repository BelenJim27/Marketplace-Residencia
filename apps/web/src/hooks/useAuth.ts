"use client";

import { useAuth as useAuthContext } from "@/context/AuthContext";

export function useAuth() {
  const auth = useAuthContext();

  const hasPermiso = (permiso: string | string[]): boolean => {
    if (!auth.user) return false;
    const permisos = Array.isArray(permiso) ? permiso : [permiso];
    return permisos.some((p) => auth.user?.permisos?.includes(p));
  };

  return {
    user: auth.user,
    loading: auth.loading,
    hasPermiso,
    logout: auth.logout,
    isAuthenticated: auth.isAuthenticated,
    isAdmin: auth.isAdmin,
    isProductor: auth.isProductor,
  };
}
