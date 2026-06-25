"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { hasAnyPermission } from "@/lib/permisos-catalog";
import { ForbiddenPage } from "./Forbidden";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requireAny?: boolean;
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  requiredPermissions,
  requireAny = true,
  fallback,
}: AuthGuardProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      const handleSessionExpired = async () => {
        try {
          await nextAuthSignOut({ redirect: false });
        } catch {}
        const currentPath = window.location.pathname;
        const redirectParam = currentPath ? `?redirect=${encodeURIComponent(currentPath)}` : "";
        window.location.href = `/auth/sign-in${redirectParam}`;
      };
      handleSessionExpired();
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F0E3] dark:bg-[#020d1a]">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[#1F3A2E]/20" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const userPermisos = user?.permisos ?? [];
    const hasAccess = requireAny
      ? hasAnyPermission(userPermisos, requiredPermissions)
      : requiredPermissions.every((p) => userPermisos.includes(p));

    if (!hasAccess) {
      return fallback ?? <ForbiddenPage />;
    }
  }

  return <>{children}</>;
}
