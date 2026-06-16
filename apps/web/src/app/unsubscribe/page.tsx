"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/context/LocaleContext";

function UnsubscribeContent() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${base}/email/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 md:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-green-700 dark:text-gray-300"
      >
        <ArrowLeft size={16} />
        {t("Volver al inicio")}
      </Link>

      <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {t("Cancelar suscripción de correos")}
      </h1>

      {status === "done" ? (
        <p className="mt-4 rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
          {t(
            "Recibimos tu solicitud de baja. Dejarás de recibir correos promocionales. Los correos transaccionales (compras, envíos, recuperación de contraseña) se siguen enviando.",
          )}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t(
              "Confirma tu correo para darte de baja de las comunicaciones de marketing.",
            )}
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          {status === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {t("No pudimos procesar tu solicitud. Intenta de nuevo más tarde.")}
            </p>
          )}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
          >
            {status === "loading" ? t("Procesando...") : t("Cancelar suscripción")}
          </button>
        </form>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeContent />
    </Suspense>
  );
}
