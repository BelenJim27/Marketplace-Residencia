"use client";

import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { Header } from "@/components/Layouts/header";
import { Sidebar } from "@/components/Layouts/sidebar";
import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { TiendaHeader } from "@/components/Administrator/Store/tienda-header";
import { useAuth } from "@/context/AuthContext";

export function RootContent({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { user, loading, isAdmin, isProductor, isAuthenticated } = useAuth();

  const isLoggedIn = isAuthenticated && !!user && (user.roles.length > 0 || (user.permisos?.length ?? 0) > 0);
  const isAdminOrProductor = isAdmin || isProductor;

  const isAuthRoute = pathname.startsWith("/auth/");
  const isClientOnlyRoute = pathname.startsWith("/tienda/") || pathname.startsWith("/Cliente/");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        <TiendaHeader />
        <main className="mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    );
  }

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        <TiendaHeader />
        <main className="mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    );
  }

  if (isClientOnlyRoute) {
    return (
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        <TiendaHeader />
        <main className="mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    );
  }

  const isTiendaRoute = pathname === "/" || pathname === "/producto" || pathname.startsWith("/producto/");

  if (isTiendaRoute) {
    return (
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        <TiendaHeader />
        <main className="mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    );
  }

  if (isLoggedIn) {
    if (isAdminOrProductor) {
      return (
        <SidebarProvider>
          <div className="flex min-h-screen bg-gray-2 dark:bg-[#020d1a]">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 2xl:p-10">
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

  return (
    <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
      <TiendaHeader />
      <main className="mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
        {children}
      </main>
    </div>
  );
}

