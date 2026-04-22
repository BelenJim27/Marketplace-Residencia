"use client";

import Link from "next/link";
import Image from "next/image";
import { SignUpForm } from "./_components/sign-up-form";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useSearchParams } from "next/navigation";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const isVenderFlow = searchParams.get("vender") === "true";

  if (isVenderFlow) {
    return (
      <>
        <Breadcrumb pageName="Crear Cuenta" />

        <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-6 sm:p-12">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-dark dark:text-white mb-2 text-center">
              Crea una cuenta para solicitar ser productor
            </h1>
            <p className="text-gray-500 mb-8 text-center">
              Regístrate para continuar con tu solicitud.
            </p>

            <SignUpForm />

            <div className="mt-6 text-center">
              <p>
                ¿Ya tienes una cuenta?{" "}
                <Link
                  href="/auth/sign-in?vender=true"
                  className="text-green-600 hover:underline"
                >
                  Ingresar
                </Link>
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName="Crear Cuenta" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex flex-col lg:flex-row items-center">
          <div className="w-full lg:w-1/2 order-2 lg:order-1">
            <div className="w-full p-4 sm:p-12.5 xl:p-15">
              <div className="mb-6 text-center sm:text-left">
                <h1 className="mb-4 text-2xl font-bold text-dark dark:text-white">
                  Crear Cuenta
                </h1>
                <p className="text-gray-500">
                  Regístrate para comenzar a comprar
                </p>
              </div>

              <SignUpForm />

              <div className="mt-6 text-center">
                <p>
                  ¿Ya tienes una cuenta?{" "}
                  <Link
                    href="/auth/sign-in"
                    className="text-green-600 hover:underline"
                  >
                    Ingresar
                  </Link>
                </p>
              </div>
            </div>
          </div>

         {/* RIGHT SIDE (FULL IMAGE) */}
          <div className="w-full lg:w-1/2 relative min-h-[200px] sm:min-h-[300px] lg:min-h-[800px] order-1 lg:order-2">

            {/* Imagen de fondo */}
            <Image
              src="/images/login/gemmi.png"
              alt="Login Image"
              fill
              priority
              className="object-cover"
            />

            {/* Overlay oscuro */}
            <div className="absolute inset-0 bg-black/40"></div>

            {/* Contenido encima */}
            <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 sm:p-10">

              <p className="mb-2 sm:mb-3 text-lg sm:text-xl font-medium text-white dark:text-white">
                Únete a nuestra tienda
              </p>

              <h1 className="mb-3 sm:mb-4 text-xl sm:text-2xl lg:text-3xl font-bold text-white dark:text-white">
                ¡Bienvenido!
              </h1>

              <p className="w-full max-w-[280px] sm:max-w-[375px] text-sm sm:text-base font-medium text-white dark:text-dark-6">
                Crea una cuenta para acceder a todos nuestros productos
              </p>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}
