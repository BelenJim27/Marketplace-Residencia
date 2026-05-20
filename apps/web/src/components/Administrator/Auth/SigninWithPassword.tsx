"use client";

import { EmailIcon } from "@/assets/icons";
import Link from "next/link";
import React, { useState } from "react";
import InputGroup from "../../FormElements/InputGroup";
import { Checkbox } from "../../FormElements/checkbox";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function SigninWithPassword({ isVenderFlow = false }: { isVenderFlow?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { login } = useAuth();
  const [data, setData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

      if (redirectUrl) {
        router.push(redirectUrl);
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

      <div className="mb-5">
        <label className="text-body-sm font-medium text-dark dark:text-white">
          Contraseña
        </label>
        <div className="relative mt-3">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Ingresa tu contraseña"
            value={data.password}
            onChange={handleChange}
            className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5.5 py-[15px] pr-12 text-dark outline-none transition focus:border-primary placeholder:text-dark-6 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

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
