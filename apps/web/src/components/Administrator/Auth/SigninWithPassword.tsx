"use client";

import { EmailIcon, PasswordIcon } from "@/assets/icons";
import Link from "next/link";
import React, { useState } from "react";
import InputGroup from "../../FormElements/InputGroup";
import { Checkbox } from "../../FormElements/checkbox";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SigninWithPassword({ isVenderFlow = false }: { isVenderFlow?: boolean }) {
  const router = useRouter();
  const { login } = useAuth();
  const [data, setData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.auth.login(data.email, data.password);
      const roles = response.user.roles || [];
      const permisos = response.user.permisos || [];

      login(
        response.tokens.access_token,
        {
          id_usuario: response.user.id_usuario,
          sub: response.user.id_usuario ?? response.user.sub,
          email: response.user.email || data.email,
          id_productor: response.user.id_productor ?? null,
          nombre: response.user.nombre || "",
          roles,
          permisos,
        },
        response.tokens.refresh_token,
        data.remember,
      );

      if (isVenderFlow) {
        router.push("/dashboard/productor/solicitar");
        return;
      }

      const isAdmin = roles.some((rol: string) => ["ADMIN", "administrador", "admin"].includes(rol));
      if (isAdmin) {
        router.push("/dashboard/administrador");
        return;
      }

      if (permisos.includes("panel_productor") || roles.some((rol: string) => ["PRODUCTOR", "productor"].includes(rol))) {
        router.push("/dashboard/productor");
        return;
      }

      router.push("/cliente/producto");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <InputGroup
        type="email"
        label="Correo electrónico"
        className="mb-4 [&_input]:py-[15px]"
        placeholder="Ingresa tu correo"
        name="email"
        handleChange={handleChange}
        value={data.email}
        icon={<EmailIcon />}
      />

      <InputGroup
        type="password"
        label="Contraseña"
        className="mb-5 [&_input]:py-[15px]"
        placeholder="Ingresa tu contraseña"
        name="password"
        handleChange={handleChange}
        value={data.password}
        icon={<PasswordIcon />}
      />

      <div className="mb-6 flex items-center justify-between gap-2 py-2 font-medium">
        <Checkbox
          label="Recordarme"
          name="remember"
          withIcon="check"
          minimal
          radius="md"
          onChange={(e) =>
            setData({
              ...data,
              remember: e.target.checked,
            })
          }
        />
        <Link
          href="/auth/forgot-password"
          className="hover:text-primary dark:text-white dark:hover:text-primary"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <div className="mb-4.5">
        <button
          type="submit"
          disabled={loading}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 p-4 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
          )}
        </button>
      </div>
    </form>
  );
}
