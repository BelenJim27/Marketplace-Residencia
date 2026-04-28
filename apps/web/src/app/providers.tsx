"use client";

import { SidebarProvider } from "@/context/SidebarContext";
import { AuthProvider } from "@/context/AuthContext";
import { CarritoProvider } from "@/context/CarritoContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { ConfigProvider } from "@/context/ConfigContext";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
          <CarritoProvider>
            <WishlistProvider>
              <ConfigProvider>
                <SidebarProvider>
                  {children}
                </SidebarProvider>
              </ConfigProvider>
            </WishlistProvider>
          </CarritoProvider>
        </AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}