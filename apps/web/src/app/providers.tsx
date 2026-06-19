"use client";

import { SidebarProvider } from "@/context/SidebarContext";
import { AuthProvider } from "@/context/AuthContext";
import { CarritoProvider } from "@/context/CarritoContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { ConfigProvider } from "@/context/ConfigContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { AlertConfirmHost } from "@/shared/alerts";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider 
      attribute="class"        // ← agrega clase "dark" al <html>
      defaultTheme="system" 
      enableSystem
    >
      <SessionProvider>
        <AuthProvider>
          <CarritoProvider>
            <WishlistProvider>
              <ConfigProvider>
                <SidebarProvider>
                  <LocaleProvider>
                    {children}
                    <Toaster position="top-right" richColors closeButton />
                    <AlertConfirmHost />
                  </LocaleProvider>
                </SidebarProvider>
              </ConfigProvider>
            </WishlistProvider>
          </CarritoProvider>
        </AuthProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}