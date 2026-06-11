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
import { getPostLoginUrl } from "@/lib/get-post-login-url";

export default function SigninWithPassword({ isVenderFlow = false, onSuccess }: { isVenderFlow?: boolean; onSuccess?: () => void }) {
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
          apellido_paterno: response.user.apellido_paterno || "",
          foto_url: response.user.foto_url ?? null,
          roles,
          permisos,
        },
        response.tokens.refresh_token,
        data.remember,
      );

      if (isVenderFlow && onSuccess) { onSuccess(); return; }

      router.push(getPostLoginUrl(roles, permisos, { isVenderFlow, redirectUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <span className="mt-0.5 flex-shrink-0 text-base leading-none">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <InputGroup
        type="email"
        label="Correo electrónico"
        className="mb-4 [&_input]:py-[15px]"
        placeholder="tu@correo.com"
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
            placeholder="••••••••"
            autoComplete="current-password"
            value={data.password}
            onChange={handleChange}
            className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5.5 py-[15px] pr-12 text-dark outline-none transition focus:border-green-500 placeholder:text-dark-6 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-green-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-2 py-1">
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
          className="text-sm text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 py-3.5 px-6 font-semibold text-white shadow-sm transition-all hover:bg-green-700 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
            Ingresando...
          </>
        ) : (
          "Ingresar"
        )}
      </button>
    </form>
  );
}
