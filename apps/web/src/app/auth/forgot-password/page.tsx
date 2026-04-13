"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shadcn";
import { Input } from "@/components/shadcn";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/shadcn";
import { api } from "@/lib/api";
import { PasswordIcon } from "@/assets/icons";
import InputGroup from "@/components/FormElements/InputGroup";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.auth.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar solicitud");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-naturaleza-600">Revisa tu correo</CardTitle>
            <CardDescription>
              Hemos enviado un enlace de recuperación a <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/auth/sign-in">
              <Button variant="outline">Volver a iniciar sesión</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recuperar contraseña</CardTitle>
          <CardDescription>
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">
                {error}
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-gray-500">
            ¿Recordaste tu contraseña?{" "}
            <Link href="/auth/sign-in" className="text-naturaleza-600 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
