"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";
import { useAuth } from "@/context/AuthContext";
import { useSession, signOut } from "next-auth/react";
import { MapPin } from "lucide-react";

/* ─── Role badges ─────────────────────────────────────────────────────────── */
const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  administrador: { label: "Administrador", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  admin:         { label: "Administrador", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  ADMIN:         { label: "Administrador", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  productor:     { label: "Productor",     className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  PRODUCTOR:     { label: "Productor",     className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  cliente:       { label: "Cliente",       className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  CLIENTE:       { label: "Cliente",       className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
};

function getRoleBadge(roles: string[] | undefined) {
  if (!roles?.length) return null;
  for (const r of roles) {
    const match = ROLE_LABELS[r];
    if (match) return match;
  }
  return null;
}

/* ─── Avatar component ────────────────────────────────────────────────────── */
function Avatar({ photo, initials, size = 48 }: { photo: string | null; initials: string; size?: number }) {
  if (photo) {
    return (
      <img
        src={photo}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        alt=""
        role="presentation"
        referrerPolicy="no-referrer"
      />
    );
  }

  // Initials avatar con paleta del proyecto
  const fontSize = Math.round(size * 0.36);
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg, #2E4A33 0%, #C97A3E 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: "#F4F0E3",
        fontWeight: 700, fontSize,
        fontFamily: "'Manrope', 'DM Sans', sans-serif",
        letterSpacing: "0.04em",
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
}

/* ─── UserInfo ────────────────────────────────────────────────────────────── */
export function UserInfo({ whiteText = false }: { whiteText?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user: contextUser, logout } = useAuth();
  const { data: session } = useSession();

  /* ── datos del usuario ── */
  const rawName =
    contextUser?.nombre ||
    (session?.user as any)?.nombre ||
    session?.user?.name ||
    "Usuario";

  const firstName = rawName.split(" ")[0];

  const apellido =
    contextUser?.apellido_paterno ||
    (session?.user as any)?.apellido_paterno ||
    "";

  const fullName = apellido ? `${rawName} ${apellido}` : rawName;

  const userEmail =
    contextUser?.email || session?.user?.email || "correo@ejemplo.com";

  const roles: string[] =
    contextUser?.roles ||
    (session?.user as any)?.roles ||
    [];

  const badge = getRoleBadge(roles);

  /* ── foto: solo si vino de Google OAuth ──
     session.user.image viene de NextAuth cuando el proveedor es Google.
     Si se registró con email/password, no habrá image de Google.
     foto_url podría existir si el usuario subió una foto manualmente. */
  const googlePhoto = session?.user?.image ?? null;
  const uploadedPhoto = contextUser?.foto_url ?? (session?.user as any)?.foto_url ?? null;
  const userPhoto: string | null = googlePhoto || uploadedPhoto || null;

  /* ── iniciales (máx. 2 caracteres) ── */
  const initials = (
    firstName.charAt(0) + (apellido ? apellido.charAt(0) : firstName.charAt(1) || "")
  ).toUpperCase();

  /* ── logout ── */
  const handleLogout = async () => {
    setIsOpen(false);
    if (session) {
      await signOut({ callbackUrl: "/auth/sign-in" });
    } else {
      logout();
    }
  };

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">Mi cuenta</span>

        <figure className="flex items-center gap-3">
          <Avatar photo={userPhoto} initials={initials} size={40} />

          <figcaption className={cn(
            "flex items-center gap-1 font-medium max-[1024px]:sr-only",
            whiteText ? "text-white" : "text-dark dark:text-white",
          )}>
            <span>{firstName}</span>
            <ChevronUpIcon
              aria-hidden
              className={cn("rotate-180 transition-transform", isOpen && "rotate-0")}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">Información de usuario</h2>

        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          <Avatar photo={userPhoto} initials={initials} size={48} />

          <figcaption className="space-y-1 text-base font-medium min-w-0">
            <div className="leading-snug text-dark dark:text-white truncate">
              {fullName}
            </div>
            <div className="leading-none text-gray-6 text-sm truncate">
              {userEmail}
            </div>
            {badge && (
              <span className={cn("inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1", badge.className)}>
                {badge.label}
              </span>
            )}
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6 [&>*]:cursor-pointer">
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <UserIcon />
            <span className="mr-auto text-base font-medium">Ver perfil</span>
          </Link>

          <Link
            href="/cliente/direcciones"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <MapPin className="h-5 w-5" />
            <span className="mr-auto text-base font-medium">Mis Direcciones</span>
          </Link>

          <Link
            href="/pages/settings"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <SettingsIcon />
            <span className="mr-auto text-base font-medium">Configuración</span>
          </Link>
        </div>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
            onClick={handleLogout}
          >
            <LogOutIcon />
            <span className="text-base font-medium">Cerrar sesión</span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
