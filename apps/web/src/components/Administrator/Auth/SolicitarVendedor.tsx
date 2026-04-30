"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Store, ArrowRight, CheckCircle2 } from "lucide-react";

interface SolicitarVendedorProps {
  mode?: "checkbox" | "button";
}

export function SolicitarVendedor({ mode = "checkbox" }: SolicitarVendedorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checked, setChecked] = useState(searchParams.get("vender") === "true");

  if (mode === "checkbox") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <input
          type="checkbox"
          id="wantToSell"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="h-5 w-5 rounded border-green-300 text-green-600 focus:ring-green-500"
        />
        <label htmlFor="wantToSell" className="text-sm text-green-700 dark:text-green-300">
          Quiero vender mis productos en Tierra Agaves
        </label>
        <input type="hidden" name="wantToSell" value={checked ? "true" : "false"} />
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
          <Store className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-green-700 dark:text-green-300">
            ¿Quieres vender tus productos?
          </h3>
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            Crea tu cuenta y completa nuestro formulario de solicitud para convertirte en productor.
          </p>
          <Link
            href="/auth/sign-up?vender=true"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-300"
          >
            Crear cuenta para vender
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SolicitarVendedorPostLogin() {
  const router = useRouter();

  return (
    <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
          <Store className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-green-700 dark:text-green-300">
            ¿Quieres vender tus productos?
          </h3>
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            Completa el formulario de solicitud para convertirte en productor y reaches a más clientes.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/productor/solicitar")}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-300"
          >
            Solicitar ser vendedor
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function WantToSellBanner() {
  const router = useRouter();

  return (
    <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/30">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="font-medium text-green-700 dark:text-green-300">
              ¿Estás interesado en vender?
            </h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              Completa el formulario de solicitud para convertirte en productor
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/productor/solicitar")}
          className="shrink-0 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Solicitar
        </button>
      </div>
    </div>
  );
}