"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleSigninButton from "@/components/Administrator/Auth/GoogleSigninButton";
import { useAuth } from "@/context/AuthContext";
import { SolicitarVendedor } from "@/components/Administrator/Auth/SolicitarVendedor";
import { Eye, EyeOff } from "lucide-react";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const wantToSellDefault = searchParams.get("vender") === "true";

  const [formData, setFormData] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    email: "",
    password: "",
    confirmarPassword: "",
    wantToSell: wantToSellDefault,
  });

  // --- Validaciones de Password ---
  const passwordValidations = useMemo(() => {
    const p = formData.password;
    const userPart = formData.email.split("@")[0].toLowerCase();

    return [
      { label: "De 1 a 8 caracteres", fulfilled: p.length >= 1 && p.length >= 8 },
      { label: "Una letra mayúscula", fulfilled: /[A-Z]/.test(p) },
      { label: "Un símbolo especial", fulfilled: /[!@#$%^&*(),.?":{}|<>_]/.test(p) },
      { label: "Un número", fulfilled: /\d/.test(p) },
      {
        label: "Sin números consecutivos (ej. 12)",
        fulfilled:
          p.length > 0 &&
          !p.split("").some((char, i) => {
            const next = p[i + 1];
            return (
              /\d/.test(char) &&
              /\d/.test(next) &&
              Number(next) === Number(char) + 1
            );
          }),
      },
      {
        label: "No debe contener tu usuario",
        fulfilled: userPart.length > 0 ? !p.toLowerCase().includes(userPart) : p.length > 0,
      },
    ];
  }, [formData.password, formData.email]);

  const allPasswordValid = passwordValidations.every((v) => v.fulfilled);
  const passwordsMatch =
    formData.password === formData.confirmarPassword &&
    formData.confirmarPassword !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allPasswordValid) {
      setError("La contraseña no cumple con los requisitos");
      return;
    }

    if (!passwordsMatch) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const result = (await api.auth.register({
        email: formData.email,
        password: formData.password,
        nombre: formData.nombre,
        apellido_paterno: formData.apellido_paterno,
        apellido_materno: formData.apellido_materno,
      })) as any;

      const usuario = result.user ?? {};
      const roles = usuario.roles || [];

      login(
        result.tokens.access_token,
        {
          id_usuario: usuario.id_usuario,
          sub: usuario.id_usuario || usuario.sub || "",
          email: usuario.email || formData.email,
          nombre: usuario.nombre || formData.nombre,
          apellido_paterno: usuario.apellido_paterno || formData.apellido_paterno,
          apellido_materno: usuario.apellido_materno || formData.apellido_materno,
          roles,
        },
        result.tokens.refresh_token,
      );

      if (formData.wantToSell) {
        router.push("/Productor/solicitar");
      } else {
        router.push("/producto");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <GoogleSigninButton text="Registrate" />

      <div className="my-6 flex items-center justify-center">
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
        <div className="block w-full min-w-fit bg-white px-3 text-center font-medium dark:bg-gray-dark">
          O regístrate con tu correo
        </div>
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">
            {error}
          </div>
        )}
        {/* NOMBRE DE USUARIO*/}
        <div>
          <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
            Nombre de usuario
          </label>
          <input
            type="text"
            required
            className="w-full rounded-lg border border-green-200 bg-white p-3 outline-none focus:border-green-400 dark:bg-gray-dark"
            placeholder="Ingresa tu nombre de usuario"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          />
        </div>
        {/* NOMBRE */}
        <div>
          <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
            Nombres
          </label>
          <input
            type="text"
            required
            className="w-full rounded-lg border border-green-200 bg-white p-3 outline-none focus:border-green-400 dark:bg-gray-dark"
            placeholder="Ingresa tu nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          />
        </div>

        {/* APELLIDO PATERNO */}
        <div>
          <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
            Apellido paterno
          </label>
          <input
            type="text"
            required
            className="w-full rounded-lg border border-green-200 bg-white p-3 outline-none focus:border-green-400 dark:bg-gray-dark"
            placeholder="Ingresa tu apellido paterno"
            value={formData.apellido_paterno}
            onChange={(e) => setFormData({ ...formData, apellido_paterno: e.target.value })}
          />
        </div>

        {/* APELLIDO MATERNO */}
        <div>
          <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
            Apellido materno
          </label>
          <input
            type="text"
            required
            className="w-full rounded-lg border border-green-200 bg-white p-3 outline-none focus:border-green-400 dark:bg-gray-dark"
            placeholder="Ingresa tu apellido materno"
            value={formData.apellido_materno}
            onChange={(e) => setFormData({ ...formData, apellido_materno: e.target.value })}
          />
        </div>

        {/* EMAIL */}
        <div>
          <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
            Correo electrónico
          </label>
          <input
            type="email"
            required
            className="w-full rounded-lg border border-green-200 bg-white p-3 outline-none focus:border-green-400 dark:bg-gray-dark"
            placeholder="Ingresa tu correo"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        {/* CONTRASEÑA */}
        <div>
          <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              className="w-full rounded-lg border border-green-200 bg-white p-3 pr-12 outline-none focus:border-green-400 dark:bg-gray-dark"
              placeholder="Ingresa tu contraseña"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Validaciones visuales */}
          {formData.password.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {passwordValidations.map((v, i) => (
                <div
                  key={i}
                  className={`flex items-center text-[11px] font-medium ${
                    v.fulfilled ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  <div
                    className={`mr-2 h-1.5 w-1.5 rounded-full ${
                      v.fulfilled ? "bg-green-600" : "bg-gray-300"
                    }`}
                  />
                  {v.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CONFIRMAR CONTRASEÑA */}
        <div>
          <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              className={`w-full rounded-lg border p-3 pr-12 outline-none dark:bg-gray-dark ${
                formData.confirmarPassword.length > 0
                  ? passwordsMatch
                    ? "border-green-500"
                    : "border-red-400"
                  : "border-green-200"
              }`}
              placeholder="Confirma tu contraseña"
              value={formData.confirmarPassword}
              onChange={(e) => setFormData({ ...formData, confirmarPassword: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {formData.confirmarPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-[11px] text-red-500">Las contraseñas no coinciden</p>
          )}
        </div>

        <SolicitarVendedor mode="checkbox" />

        <button
          type="submit"
          disabled={loading}
          className="flex w-full justify-center rounded-lg bg-green-600 p-[13px] font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Registrando..." : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
