"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, FileText, CreditCard, Building2, User, ArrowRight } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Suspense } from "react";

function ProductorLandingContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isProductor, isAdmin, user } = useAuth();

  const isVenderFlow = searchParams.get("vender") === "true";

  if (isAuthenticated && isProductor && !isAdmin) {
    router.push("/dashboard/productor");
    return null;
  }

  if (isAuthenticated && isAdmin) {
    router.push("/administrador");
    return null;
  }

  const requisitos = [
    /*{
      titulo: "Identificación Oficial",
      descripcion: "INE o IFE vigente para verificar tu identidad",
      icono: User,
    },
    {
      titulo: "RFC",
      descripcion: "Registro Federal de Contribuyentes vigente",
      icono: FileText,
    },
    {
      titulo: "Cuenta Bancaria",
      descripcion: "Cuenta CLABE para recibir tus pagos",
      icono: Building2,
    },
    {
      titulo: "Método de Pago",
      descripcion: "Tarjeta de crédito o débito para cobros",
      icono: CreditCard,
    }, */
    {
      titulo: "Certificación de Origen",
      descripcion: "Certificado que avale la calidad de tus productos",
      icono: FileText,
    },
  ];

  if (isVenderFlow) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <Breadcrumb pageName="Vender en Tierra Agaves" />

        <div className="mt-6 rounded-xl bg-white p-6 shadow-1 dark:bg-gray-dark sm:p-10">
          <div className="text-center mb-10">
            <h1 className="mb-4 text-2xl sm:text-3xl font-bold text-dark dark:text-white">
              Conviértete en Productor
            </h1>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Únete a nuestra comunidad de productores locales y reaches a miles de clientes
              que valoran productos auténticos y de calidad. Comparte tu pasión por lo local.
            </p>
          </div>

          <div className="mb-10">
            <h2 className="mb-6 text-lg font-semibold text-dark dark:text-white text-center">
              Requisitos para vender
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requisitos.map((req, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-dark-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <req.icono className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-dark dark:text-white">
                      {req.titulo}
                    </h3>
                    <p className="text-sm text-gray-500">{req.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8 rounded-lg bg-green-50 p-6 dark:bg-green-900/20">
            <h3 className="mb-3 font-semibold text-dark dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              ¿Por qué vender en Tierra Agaves?
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 text-green-600" />
                Amplio alcance de clientes interesados en productos locales
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 text-green-600" />
                Herramientas para gestionar tu tienda y productos
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 text-green-600" />
                Pagos seguros directamente a tu cuenta bancaria
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 text-green-600" />
                Soporte y capacitación para mejorar tus ventas
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/sign-up?vender=true"
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
            >
              Crear Cuenta
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/auth/sign-in?vender=true"
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Breadcrumb pageName="Vender en Tierra Agaves" />

      <div className="mt-6 rounded-xl bg-white p-6 shadow-1 dark:bg-gray-dark sm:p-10">
        <div className="text-center mb-10">
          <h1 className="mb-4 text-2xl sm:text-3xl font-bold text-dark dark:text-white">
            Conviértete en Productor
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Únete a nuestra comunidad de productores locales y reaches a miles de clientes
            que valoran productos auténticos y de calidad. Comparte tu pasión por lo local.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="mb-6 text-lg font-semibold text-dark dark:text-white text-center">
            Requisitos para vender
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requisitos.map((req, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-dark-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <req.icono className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-dark dark:text-white">
                    {req.titulo}
                  </h3>
                  <p className="text-sm text-gray-500">{req.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8 rounded-lg bg-green-50 p-6 dark:bg-green-900/20">
          <h3 className="mb-3 font-semibold text-dark dark:text-white flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            ¿Por qué vender en Tierra Agaves?
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 text-green-600" />
              Amplio alcance de clientes interesados en productos locales
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 text-green-600" />
              Herramientas para gestionar tu tienda y productos
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 text-green-600" />
              Pagos seguros directamente a tu cuenta bancaria
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 text-green-600" />
              Soporte y capacitación para mejorar tus ventas
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/sign-up"
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
          >
            Crear Cuenta
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/auth/sign-in"
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/auth/sign-in" className="text-primary hover:underline">
            Inicia sesión
          </Link>{" "}
          para completar tu solicitud.
        </p>
      </div>
    </div>
  );
}

export default function ProductorLandingPage() {
  return (
    <Suspense>
      <ProductorLandingContent />
    </Suspense>
  );
}
