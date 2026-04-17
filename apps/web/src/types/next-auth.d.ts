import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      id_usuario?: string;
      provider?: string;
      nombre?: string;
      apellido_paterno?: string | null;
      apellido_materno?: string | null;
      telefono?: string | null;
      biografia?: string | null;
      foto_url?: string | null;
      idioma_preferido?: string;
      moneda_preferida?: string;
      roles?: string[];
      permisos?: string[];
      id_productor?: number | null;
    } & DefaultSession["user"];
    accessToken?: string;
    refreshToken?: string;
  }

  interface User {
    id?: string;
    id_usuario?: string;
    nombre?: string;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
    telefono?: string | null;
    biografia?: string | null;
    foto_url?: string | null;
    idioma_preferido?: string;
    moneda_preferida?: string;
    roles?: string[];
    permisos?: string[];
    id_productor?: number | null;
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
    providerAccountId?: string;
    accessToken?: string;
    refreshToken?: string;
    id?: string;
    id_usuario?: string;
    nombre?: string;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
    telefono?: string | null;
    biografia?: string | null;
    foto_url?: string | null;
    idioma_preferido?: string;
    moneda_preferida?: string;
    roles?: string[];
    permisos?: string[];
    id_productor?: number | null;
    }
}
