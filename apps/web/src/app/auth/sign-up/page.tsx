import Link from "next/link";
import Image from "next/image";
import { SignUpForm } from "./_components/sign-up-form";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function SignUpPage() {
  return (
    <>
      <Breadcrumb pageName="Crear Cuenta" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex flex-wrap items-center">
          <div className="w-full xl:w-1/2">
            <div className="w-full p-4 sm:p-12.5 xl:p-15">
              <div className="mb-6 text-center">
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
          <div className="hidden xl:block xl:w-1/2 relative min-h-[800px]">

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
            <div className="absolute inset-0 flex flex-col justify-left items-center text-center p-10">

              <p className="mb-3 text-xl font-medium text-white dark:text-white">
                Únete a nuestra tienda
              </p>

              <h1 className="mb-4 text-2xl font-bold text-white dark:text-white sm:text-heading-3">
                ¡Bienvenido!
              </h1>

              <p className="w-full max-w-[375px] font-medium text-white dark:text-dark-6">
                Crea una cuenta para acceder a todos nuestros productos
              </p>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}
