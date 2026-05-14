"use client";

import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { Header } from "@/components/Layouts/header";
import { Sidebar } from "@/components/Layouts/sidebar";
import { SidebarProvider } from "@/context/SidebarContext";
import { TiendaHeader } from "@/components/Administrator/Store/tienda-header";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/Cliente/Footer";

export function RootContent({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { user, loading, isAdmin, isProductor, isAuthenticated } = useAuth();

  const isLoggedIn = isAuthenticated && !!user && (user.roles.length > 0 || (user.permisos?.length ?? 0) > 0);
  const isAdminOrProductor = isAdmin || isProductor;

  const isAuthRoute = pathname.startsWith("/auth/");
  const isClientOnlyRoute = pathname.startsWith("/tienda/") || pathname.startsWith("/cliente/");
  const isClientHome = pathname === "/Cliente/inicio";

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

  // Rutas de auth — sin footer
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

  // Página de inicio del cliente — el footer ya viene dentro del LandingPage,
  // así que NO lo agregamos aquí para no duplicarlo
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

  // Rutas de cliente (/tienda/ y /cliente/) — CON footer
  if (isClientOnlyRoute) {
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

  const isTiendaRoute = pathname === "/" || pathname === "/producto" || pathname.startsWith("/producto/");

  // Rutas de tienda — CON footer
  if (isTiendaRoute) {
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

  // Admin / productor — sin footer
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

    // Cliente logueado — CON footer
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

  // Fallback — CON footer
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