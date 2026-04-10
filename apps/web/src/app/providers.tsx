"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}