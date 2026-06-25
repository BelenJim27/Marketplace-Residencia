"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { Header } from "@/components/Layouts/header";
import { Sidebar } from "@/components/Layouts/sidebar";
import { SidebarProvider } from "@/context/SidebarContext";
import { TiendaHeader } from "@/components/Administrator/Store/tienda-header";
import { useAuth } from "@/context/AuthContext";
import { getCookie } from "@/lib/cookies";
import Footer from "@/components/Cliente/Footer";
import AgeGate from "@/components/AgeGate";
import { isGlobalAgeVerified } from "@/lib/edad";
import {
  hasAnyPermission,
  ADMIN_PERMISOS,
  PRODUCTOR_PERMISOS,
} from "@/lib/permisos-catalog";

export function RootContent({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAdmin, isProductor, isAuthenticated } = useAuth();

  const userPermisos = user?.permisos ?? [];
  const hasAdminAccess = hasAnyPermission(userPermisos, [...ADMIN_PERMISOS]);
  const hasProductorAccess =
    user?.id_productor != null && hasAnyPermission(userPermisos, [...PRODUCTOR_PERMISOS]);
  const isLoggedIn = isAuthenticated && !!user && (user.roles.length > 0 || userPermisos.length > 0);
  const isAdminOrProductor = hasAdminAccess || hasProductorAccess;

  useEffect(() => {
    if (loading) return;
    if (hasAdminAccess) {
      document.title = "Administrador";
    } else if (hasProductorAccess) {
      document.title = "Productor";
    } else {
      document.title = "Mezcales";
    }
  }, [hasAdminAccess, hasProductorAccess, loading]);

  const p = pathname.toLowerCase();
  const isAuthRoute = p.startsWith("/auth/");
  const isClientOnlyRoute = p.startsWith("/tienda/") || p.startsWith("/cliente/");
  const isClientHome = p === "/cliente/inicio";
  const isSolicitarRoute = p === "/dashboard/productor/solicitar";

  const needsAgeGate =
    p.startsWith("/tienda/") ||
    p.startsWith("/cliente/producto") ||
    pathname.startsWith("/producto/") ||
    pathname === "/producto";

  const [ageVerified, setAgeVerified] = useState(false);
  const [ageChecked, setAgeChecked] = useState(false);

  useEffect(() => {
    if (needsAgeGate) {
      setAgeVerified(isGlobalAgeVerified());
    }
    setAgeChecked(true);
  }, [needsAgeGate]);

  if (loading) {
    if (user && (hasAdminAccess || hasProductorAccess)) {
      return (
        <SidebarProvider>
          <div className="flex min-h-screen bg-[#F4F0E3] dark:bg-[#020d1a]">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto p-6 md:p-8 2xl:p-10">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      );
    }
    return (
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        <TiendaHeader />
        <main className="mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    );
  }

  if (isSolicitarRoute && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        {children}
      </div>
    );
  }

  if (isAuthRoute) {
    if (pathname === "/auth/sign-up") {
      return (
        <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
          {children}
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        <main className="mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    );
  }

  if (isClientHome) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-2 dark:bg-[#020d1a]">
        <TiendaHeader />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  if (isClientOnlyRoute) {
    const isCatalogo = p === "/cliente/producto";
    return (
      <div className="flex min-h-screen flex-col bg-gray-2 dark:bg-[#020d1a]">
        <TiendaHeader />
        {ageChecked && !ageVerified && needsAgeGate && (
          <AgeGate
            mode="global"
            edadMinima={18}
            onVerified={() => setAgeVerified(true)}
            onDeny={() => router.push("/")}
            userId={user?.id_usuario}
            token={getCookie("token") ?? undefined}
          />
        )}
        <main className={`flex-1 w-full overflow-hidden ${isCatalogo ? "" : "mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10"}`}>
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  const isTiendaRoute = pathname === "/" || pathname === "/producto" || pathname.startsWith("/producto/");

  if (isTiendaRoute) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-2 dark:bg-[#020d1a]">
        <TiendaHeader />
        {ageChecked && !ageVerified && needsAgeGate && (
          <AgeGate
            mode="global"
            edadMinima={18}
            onVerified={() => setAgeVerified(true)}
            onDeny={() => router.push("/")}
            userId={user?.id_usuario}
            token={getCookie("token") ?? undefined}
          />
        )}
        <main className="flex-1 mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoggedIn) {
    if (isAdminOrProductor) {
      return (
        <SidebarProvider>
          <div className="flex min-h-screen bg-[#F4F0E3] dark:bg-[#020d1a]">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto p-6 md:p-8 2xl:p-10">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      );
    }

    return (
      <div className="flex min-h-screen flex-col bg-gray-2 dark:bg-[#020d1a]">
        <TiendaHeader />
        <main className="flex-1 mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-2 dark:bg-[#020d1a]">
      <TiendaHeader />
      <main className="flex-1 mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
        {children}
      </main>
      <Footer />
    </div>
  );
}
