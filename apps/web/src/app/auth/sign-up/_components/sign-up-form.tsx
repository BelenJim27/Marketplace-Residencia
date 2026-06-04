"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleSigninButton from "@/components/Administrator/Auth/GoogleSigninButton";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export function SignUpForm({ isVenderFlow: isVenderFlowProp }: { isVenderFlow?: boolean } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isVenderFlow = isVenderFlowProp ?? searchParams.get("vender") === "true";

  const NOMBRE_REGEX = /[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'\-]/g;

  const handleNombreChange = (field: string, value: string) => {
    const filtered = value.replace(NOMBRE_REGEX, "");
    setFormData((prev) => ({ ...prev, [field]: filtered }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const [formData, setFormData] = useState({
    nombre_usuario: "",
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    email: "",
    password: "",
    confirmarPassword: "",
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

    const errors: Record<string, string> = {};
    if (!formData.nombre.trim() || formData.nombre.trim().length < 2)
      errors.nombre = "Ingresa un nombre válido (mínimo 2 letras)";
    if (!formData.apellido_paterno.trim() || formData.apellido_paterno.trim().length < 2)
      errors.apellido_paterno = "Ingresa un apellido válido (mínimo 2 letras)";
    if (formData.apellido_materno.trim().length > 0 && formData.apellido_materno.trim().length < 2)
      errors.apellido_materno = "El apellido debe tener al menos 2 letras";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

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
        nombre_usuario: formData.nombre_usuario,
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

      if (isVenderFlow) {
        router.push("/dashboard/productor/solicitar");
      } else {
        router.push("/cliente/producto");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <GoogleSigninButton text="Registrate" />

      <div className="my-6 flex items-center justify-center">
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
        <div className="block w-full min-w-fit bg-white px-3 text-center font-medium dark:bg-gray-dark">
          O regístrate con tu correo
        </div>
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* USUARIO + EMAIL — fila 1 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
              Nombre de usuario
            </label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 dark:bg-gray-dark"
              placeholder="Tu usuario"
              value={formData.nombre_usuario}
              onChange={(e) => setFormData({ ...formData, nombre_usuario: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 dark:bg-gray-dark"
              placeholder="tu@correo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        {/* NOMBRE + APELLIDO PATERNO — fila 2 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
              Nombre(s)
            </label>
            <input
              type="text"
              required
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none dark:bg-gray-dark ${fieldErrors.nombre ? "border-red-400 focus:border-red-400" : "border-green-200 focus:border-green-400"}`}
              placeholder="Tu nombre"
              value={formData.nombre}
              onChange={(e) => handleNombreChange("nombre", e.target.value)}
            />
            {fieldErrors.nombre && <p aria-live="polite" className="mt-1 text-xs text-red-500">{fieldErrors.nombre}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
              Apellido paterno
            </label>
            <input
              type="text"
              required
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none dark:bg-gray-dark ${fieldErrors.apellido_paterno ? "border-red-400 focus:border-red-400" : "border-green-200 focus:border-green-400"}`}
              placeholder="Apellido paterno"
              value={formData.apellido_paterno}
              onChange={(e) => handleNombreChange("apellido_paterno", e.target.value)}
            />
            {fieldErrors.apellido_paterno && <p aria-live="polite" className="mt-1 text-xs text-red-500">{fieldErrors.apellido_paterno}</p>}
          </div>
        </div>

        {/* APELLIDO MATERNO — fila 3 (mitad ancho) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
              Apellido materno
            </label>
            <input
              type="text"
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none dark:bg-gray-dark ${fieldErrors.apellido_materno ? "border-red-400 focus:border-red-400" : "border-green-200 focus:border-green-400"}`}
              placeholder="Apellido materno"
              value={formData.apellido_materno}
              onChange={(e) => handleNombreChange("apellido_materno", e.target.value)}
            />
            {fieldErrors.apellido_materno && <p aria-live="polite" className="mt-1 text-xs text-red-500">{fieldErrors.apellido_materno}</p>}
          </div>
        </div>

        {/* CONTRASEÑA + CONFIRMAR — fila 4 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 pr-9 text-sm outline-none focus:border-green-400 dark:bg-gray-dark"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                className={`w-full rounded-lg border px-3 py-2 pr-9 text-sm outline-none dark:bg-gray-dark ${
                  formData.confirmarPassword.length > 0
                    ? passwordsMatch ? "border-green-500" : "border-red-400"
                    : "border-green-200"
                }`}
                placeholder="••••••••"
                value={formData.confirmarPassword}
                onChange={(e) => setFormData({ ...formData, confirmarPassword: e.target.value })}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {formData.confirmarPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-[11px] text-red-500">Las contraseñas no coinciden</p>
            )}
          </div>
        </div>

        {/* Validaciones de contraseña */}
        {formData.password.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {passwordValidations.map((v, i) => (
              <div key={i} className={`flex items-center text-[11px] font-medium ${v.fulfilled ? "text-green-600" : "text-gray-400"}`}>
                <div className={`mr-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${v.fulfilled ? "bg-green-600" : "bg-gray-300"}`} />
                {v.label}
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full justify-center rounded-lg bg-green-600 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Registrando..." : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
