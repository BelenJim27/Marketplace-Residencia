"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getFirstAllowedDestination } from "@/lib/permisos-catalog";
import { ShieldAlert } from "lucide-react";

export function ForbiddenPage() {
  const { user, logout } = useAuth();
  const userPermisos = user?.permisos ?? [];

  const firstUrl = getFirstAllowedDestination(userPermisos, {
    hasActiveProductor: user?.id_productor != null,
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F0E3] dark:bg-[#020d1a] p-4">
      <div className="max-w-md text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-[#1F3A2E] dark:text-[#e2ede3] mb-2">
          Acceso denegado
        </h1>
        <p className="text-[#3D6B3F]/70 dark:text-[#9dc49e]/70 mb-6">
          No tienes permisos suficientes para acceder a esta secci&oacute;n.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={firstUrl}
            className="rounded-xl bg-[#1F3A2E] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a4f3a]"
          >
            Ir a mi primer m&oacute;dulo disponible
          </Link>
          <button
            onClick={logout}
            className="rounded-xl border border-[#C5CFB0] px-6 py-2.5 text-sm font-semibold text-[#1F3A2E] transition hover:bg-[#C5CFB0]/30 dark:border-[#2d4a35] dark:text-[#e2ede3] dark:hover:bg-[#2d4a35]/40"
          >
            Cerrar sesi&oacute;n
          </button>
        </div>
      </div>
    </div>
  );
}
