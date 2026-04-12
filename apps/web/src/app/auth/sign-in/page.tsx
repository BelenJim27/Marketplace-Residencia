import Signin from "@/components/Administrador/Auth/Signin";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
};

export default function SignIn() {
  return (
    <>
      <Breadcrumb pageName="Iniciar Sesión" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex flex-wrap">

          {/* LEFT SIDE (FORM) */}
          <div className="w-full xl:w-1/2">
            <div className="w-full p-6 sm:p-12 xl:p-15">
              <Signin />
            </div>
          </div>

          {/* RIGHT SIDE (FULL IMAGE) */}
          <div className="hidden xl:block xl:w-1/2 relative min-h-[600px]">

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
            <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-10">

              <h1 className="text-4xl font-bold text-white mb-4">
                Bienvenido
              </h1>

              <p className="text-white/80 max-w-md">
                Inicia sesión para continuar y gestionar tu plataforma fácilmente.
              </p>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}