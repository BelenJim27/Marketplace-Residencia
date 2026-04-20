import Signin from "@/components/Administrator/Auth/Signin";
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
        <div className="flex flex-col lg:flex-row">

          {/* LEFT SIDE (FORM) */}
          <div className="w-full lg:w-1/2 order-2 lg:order-1">
            <div className="w-full p-6 sm:p-12 xl:p-15">
              <Signin />
            </div>
          </div>

          {/* RIGHT SIDE (FULL IMAGE) */}
          <div className="w-full lg:w-1/2 relative min-h-[200px] sm:min-h-[300px] lg:min-h-[600px] order-1 lg:order-2">

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

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
                Bienvenido
              </h1>

              <p className="text-white/80 text-sm sm:max-w-md max-w-[280px]">
                Inicia sesión para continuar y gestionar tu plataforma fácilmente.
              </p>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}
