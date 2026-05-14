"use client";

import Signin from "@/components/Administrator/Auth/Signin";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";

function SignInContent() {
  const searchParams = useSearchParams();
  const isVenderFlow = searchParams.get("vender") === "true";
  const { isAuthenticated, loading, isAdmin, isProductor } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;

    const redirectUrl = searchParams.get("redirect");

    if (isVenderFlow) {
      router.replace("/dashboard/productor/solicitar");
      return;
    }
    if (isAdmin) {
      router.replace("/dashboard/administrador");
      return;
    }
    if (isProductor) {
      router.replace("/dashboard/productor");
      return;
    }
    if (redirectUrl) {
      router.replace(redirectUrl);
      return;
    }
    router.replace("/cliente/producto");
  }, [isAuthenticated, loading, isVenderFlow, isAdmin, isProductor, router, searchParams]);


  if (isVenderFlow) {
    return (
      <>
        <Breadcrumb pageName="Iniciar Sesión" />

        <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-6 sm:p-12">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-dark dark:text-white mb-2 text-center">
              Inicia sesión para solicitar ser productor
            </h1>
            <p className="text-gray-500 mb-8 text-center">
              Ingresa tus credenciales para continuar con tu solicitud.
            </p>
            <Signin isVenderFlow={true} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName="Iniciar Sesión" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex flex-col lg:flex-row">
          <div className="w-full lg:w-1/2 order-2 lg:order-1">
            <div className="w-full p-6 sm:p-12 xl:p-15">
              <Signin />
            </div>
          </div>

          <div className="w-full lg:w-1/2 relative min-h-[200px] sm:min-h-[300px] lg:min-h-[600px] order-1 lg:order-2">
            <Image
              src="/images/login/gemmi.png"
              alt="Login Image"
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/40"></div>
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

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}